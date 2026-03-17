import fs from 'fs';
import path from 'path';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

const apartmentsFilePath = path.resolve(process.cwd(), 'src', 'data', 'apartments.ts');

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stripTags(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeName(value) {
  return String(value || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/아파트/g, '')
    .replace(/[^0-9A-Za-z가-힣]/g, '')
    .toLowerCase();
}

function normalizeDistrict(value) {
  return String(value || '')
    .replace(/[^가-힣]/g, '')
    .trim();
}

function parseApartmentsFile() {
  const content = fs.readFileSync(apartmentsFilePath, 'utf8');
  const apartments = [];

  for (const match of content.matchAll(/\{[^}]+\}/g)) {
    const obj = match[0];
    const id = (obj.match(/id:\s*'([^']+)'/) || [])[1];
    const name = (obj.match(/name:\s*'([^']+)'/) || [])[1];
    const district = (obj.match(/district:\s*'([^']+)'/) || [])[1];
    const complexId = (obj.match(/naverComplexId:\s*'([^']+)'/) || [])[1];
    if (id && name && district) {
      apartments.push({ id, name, district, naverComplexId: complexId || null });
    }
  }

  return apartments;
}

function buildQueries(apartment) {
  const baseName = apartment.name.replace(/\([^)]*\)/g, '').trim();
  return [...new Set([
    `${apartment.district} ${apartment.name} 아파트`,
    `${apartment.district} ${baseName} 아파트`,
    `${apartment.district} ${apartment.name}`,
    `${apartment.district} ${baseName}`,
    `${apartment.name} 아파트`,
    `${baseName} 아파트`,
    apartment.name,
    baseName,
  ].filter(Boolean))];
}

function shouldIgnoreAnchorText(text) {
  if (!text) return true;
  if (/naver|land\.naver|fin\.land|부동산/i.test(text)) return true;
  if (/^(지도보기|동호수 공시가격|매매 \d+|전세 \d+|월세 \d+)$/.test(text)) return true;
  if (/^(매매|전세|월세|토지|분양권|오피스텔)$/.test(text)) return true;
  if (text.length <= 1) return true;
  return false;
}

function parseCandidates(html) {
  const anchors = [...html.matchAll(/<a[^>]+href="https:\/\/(?:new\.land|fin\.land|land)\.naver\.com\/complexes\/(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)];
  const grouped = new Map();

  for (const anchor of anchors) {
    const id = anchor[1];
    const text = stripTags(anchor[2]);
    if (!grouped.has(id)) {
      grouped.set(id, {
        complexId: id,
        titles: [],
        rawMatches: 0,
        snippets: [],
      });
    }

    const item = grouped.get(id);
    item.rawMatches += 1;
    if (!shouldIgnoreAnchorText(text)) {
      item.titles.push(text);
    }

    const urlNeedle = `/complexes/${id}`;
    let searchFrom = 0;
    while (item.snippets.length < 3) {
      const idx = html.indexOf(urlNeedle, searchFrom);
      if (idx === -1) break;
      const snippet = stripTags(html.slice(Math.max(0, idx - 260), Math.min(html.length, idx + 520)));
      if (snippet) item.snippets.push(snippet);
      searchFrom = idx + urlNeedle.length;
    }
  }

  return [...grouped.values()].map(item => {
    const uniqueTitles = [...new Set(item.titles)];
    let title = uniqueTitles
      .sort((a, b) => a.length - b.length)
      .find(candidate => candidate.length <= 40) || uniqueTitles.sort((a, b) => a.length - b.length)[0] || '';
    const snippet = item.snippets.sort((a, b) => b.length - a.length)[0] || '';
    if (isSuspiciousTitle(title)) {
      title = extractTitleFromSnippet(snippet) || title;
    }
    return {
      complexId: item.complexId,
      title,
      allTitles: uniqueTitles,
      snippet,
      rawMatches: item.rawMatches,
    };
  });
}

function isSuspiciousTitle(title) {
  if (!title) return true;
  if (/^\d+건$/.test(title)) return true;
  if (title.length > 50) return true;
  if (/서울시|경기도|총\d+동|세대|최근 매매 실거래가/.test(title)) return true;
  return false;
}

function extractTitleFromSnippet(snippet) {
  if (!snippet) return '';
  const cleaned = snippet.replace(/\s+/g, ' ').trim();
  const patterns = [
    /(?:^| )([가-힣A-Za-z0-9·()~\- ]{2,40}) 서울시 [가-힣]+구 [가-힣0-9]+동 (?:아파트|재건축|주상복합)/,
    /(?:^| )([가-힣A-Za-z0-9·()~\- ]{2,40}) (?:아파트|재건축|주상복합) \d+세대/,
    /(?:^| )A ([가-힣A-Za-z0-9·()~\- ]{2,40}) 서울시 [가-힣]+구 [가-힣0-9]+동/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return '';
}

function extractGeneralTitles(html) {
  const matches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const results = [];

  for (const match of matches) {
    const href = match[1];
    const text = stripTags(match[2]);
    if (!text) continue;
    if (text.length < 2 || text.length > 80) continue;
    if (/^(NAVER|로그인|뉴스|블로그|카페|지도|이미지|동영상|쇼핑|더보기|공유|다음|자동차보험료|State Grid|Google Hong Kong)$/i.test(text)) continue;
    if (/javascript:|mailto:/.test(href)) continue;
    results.push({ href, text });
  }

  return [...new Map(results.map(item => [`${item.href}|${item.text}`, item])).values()];
}

function longestCommonSubstringLength(a, b) {
  if (!a || !b) return 0;
  const dp = Array.from({ length: b.length + 1 }, () => 0);
  let max = 0;

  for (let i = 1; i <= a.length; i++) {
    for (let j = b.length; j >= 1; j--) {
      if (a[i - 1] === b[j - 1]) {
        dp[j] = dp[j - 1] + 1;
        if (dp[j] > max) max = dp[j];
      } else {
        dp[j] = 0;
      }
    }
  }

  return max;
}

function buildOfficialTitleCandidates(apartment, queryResults) {
  const targetNorm = normalizeName(apartment.name);
  const candidates = [];

  for (const result of queryResults) {
    for (const item of result.generalTitles || []) {
      const text = item.text;
      const norm = normalizeName(text);
      if (!norm) continue;
      const common = longestCommonSubstringLength(targetNorm, norm);
      const apartmentLike = /아파트|자이|래미안|힐스테이트|센트레빌|푸르지오|롯데캐슬|아이파크|더샵|리버|파크|마스터|그랑|캐슬|하이츠/.test(text);
      if (common < 3 && !apartmentLike) continue;
      let score = common * 10;
      if (apartmentLike) score += 10;
      if (text.includes(apartment.district)) score += 5;
      candidates.push({ title: text, sourceQuery: result.query, score });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    const key = candidate.title;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped.slice(0, 5);
}

function scoreCandidate(apartment, candidate, query) {
  const targetNorm = normalizeName(apartment.name);
  const titleNorm = normalizeName(candidate.title);
  const districtNorm = normalizeDistrict(apartment.district);
  const snippet = candidate.snippet || '';

  let score = 0;
  const reasons = [];

  if (titleNorm && targetNorm && titleNorm === targetNorm) {
    score += 90;
    reasons.push('exact-name');
  } else if (titleNorm && targetNorm && (titleNorm.includes(targetNorm) || targetNorm.includes(titleNorm))) {
    score += 70;
    reasons.push('name-contains');
  } else if (candidate.title && query.includes(apartment.district) && snippet.includes(apartment.district)) {
    score += 45;
    reasons.push('district-card-match');
  }

  if (query.includes(apartment.district) && snippet.includes(apartment.district)) {
    score += 20;
    reasons.push('district-in-snippet');
  }

  if (candidate.title && apartment.name.replace(/\([^)]*\)/g, '').trim() && candidate.title.includes(apartment.name.replace(/\([^)]*\)/g, '').trim())) {
    score += 20;
    reasons.push('title-includes-base-name');
  }

  if (candidate.rawMatches >= 3) {
    score += 8;
    reasons.push('repeated-card');
  }

  if (candidate.title && /아파트|자이|래미안|힐스테이트|센트레빌|푸르지오|롯데캐슬|아이파크|e편한세상|더샵|리버|파크/.test(candidate.title)) {
    score += 5;
    reasons.push('apartment-like-title');
  }

  if (candidate.title && districtNorm && normalizeDistrict(candidate.title).includes(districtNorm)) {
    score += 3;
    reasons.push('district-in-title');
  }

  if (snippet && !snippet.includes(apartment.district) && /(서울시|경기도|인천시|부산시|대구시|대전시|광주시|울산시|세종시)/.test(snippet)) {
    score -= 40;
    reasons.push('different-region-snippet');
  }

  if (/^\d+건$/.test(candidate.title)) {
    score -= 50;
    reasons.push('count-not-title');
  }

  return { score, reasons };
}

async function fetchCandidates(query) {
  const url = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    return { ok: false, status: res.status, candidates: [], generalTitles: [] };
  }
  const html = await res.text();
  return {
    ok: true,
    status: res.status,
    candidates: parseCandidates(html),
    generalTitles: extractGeneralTitles(html),
  };
}

function selectBest(apartment, queryResults) {
  const scored = [];

  for (const result of queryResults) {
    for (const candidate of result.candidates) {
      const scoredCandidate = scoreCandidate(apartment, candidate, result.query);
      scored.push({
        ...candidate,
        query: result.query,
        score: scoredCandidate.score,
        reasons: scoredCandidate.reasons,
      });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.rawMatches || 0) - (a.rawMatches || 0);
  });

  const deduped = [];
  const seen = new Set();
  for (const item of scored) {
    if (seen.has(item.complexId)) continue;
    seen.add(item.complexId);
    deduped.push(item);
  }

  return {
    best: deduped[0] || null,
    candidates: deduped.slice(0, 5),
  };
}

function applyResults(results) {
  let content = fs.readFileSync(apartmentsFilePath, 'utf8');

  for (const result of results) {
    if (!result.accepted || !result.best) continue;

    const safeId = result.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeName = result.best.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const objectPattern = new RegExp(`(\\{[^}]*id:\\s*'${safeId}'[^}]*?name:\\s*')([^']+)(')([^}]*?)\\}`);

    content = content.replace(objectPattern, (full, prefix, oldNameTail, quote, body) => {
      let nextBody = body;
      if (/naverComplexId:\s*'[^']+'/.test(nextBody)) {
        nextBody = nextBody.replace(/naverComplexId:\s*'[^']+'/, `naverComplexId: '${result.best.complexId}'`);
      } else {
        nextBody = `${nextBody}, naverComplexId: '${result.best.complexId}'`;
      }
      return `${prefix}${safeName}${quote}${nextBody}}`;
    });
  }

  fs.writeFileSync(apartmentsFilePath, content, 'utf8');
}

async function main() {
  const sourceFile = getArgValue('--source') || path.join('tmp_crawl', 'unmapped_apartments_20260317.json');
  const outputFile = getArgValue('--output') || path.join('tmp_crawl', 'official_name_research_20260317.json');
  const applyMode = process.argv.includes('--apply');
  const delayMs = Number.parseInt(getArgValue('--delay-ms') || '1200', 10);
  const workerCount = Number.parseInt(getArgValue('--worker-count') || '1', 10);
  const workerIndex = Number.parseInt(getArgValue('--worker-index') || '1', 10);

  const source = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), sourceFile), 'utf8').replace(/^\uFEFF/, ''));
  const apartments = parseApartmentsFile();
  const apartmentMap = new Map(apartments.map(apartment => [apartment.id, apartment]));

  const targets = source.items
    .map(item => apartmentMap.get(item.id))
    .filter(Boolean)
    .filter((_, index) => (index % workerCount) === (workerIndex - 1));

  const results = [];
  let acceptedCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const apartment = targets[i];
    const queries = buildQueries(apartment);
    const queryResults = [];

    for (const query of queries) {
      const fetched = await fetchCandidates(query);
      queryResults.push({ query, ...fetched });
      await delay(delayMs);
      if (fetched.ok && fetched.candidates.length > 0) break;
    }

    if (queryResults.filter(result => result.ok).every(result => result.candidates.length === 0)) {
      const officialTitleCandidates = buildOfficialTitleCandidates(apartment, queryResults.filter(result => result.ok));
      for (const officialCandidate of officialTitleCandidates.slice(0, 3)) {
        const query = `${apartment.district} ${officialCandidate.title} 아파트`;
        const fetched = await fetchCandidates(query);
        queryResults.push({ query, officialCandidate: officialCandidate.title, ...fetched });
        await delay(delayMs);
        if (fetched.ok && fetched.candidates.length > 0) break;
      }
    }

    const selected = selectBest(apartment, queryResults.filter(result => result.ok));
    const accepted = !!selected.best &&
      selected.best.score >= 70 &&
      (
        selected.best.snippet.includes(apartment.district) ||
        selected.best.query.includes(apartment.district)
      ) &&
      !/경기도|인천시|부산시|대구시|대전시|광주시|울산시|세종시/.test(selected.best.snippet);

    if (accepted) acceptedCount += 1;

    results.push({
      no: i + 1,
      id: apartment.id,
      district: apartment.district,
      currentName: apartment.name,
      currentComplexId: apartment.naverComplexId,
      accepted,
      best: selected.best,
      candidates: selected.candidates,
      queries: queryResults.map(result => ({
        query: result.query,
        ok: result.ok,
        status: result.status,
        candidateCount: result.candidates.length,
      })),
    });

    console.log(`[${i + 1}/${targets.length}] ${apartment.name} -> ${accepted ? `${selected.best.title} (${selected.best.complexId})` : 'NO MATCH'}`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceFile,
    acceptedCount,
    totalCount: results.length,
    results,
  };

  fs.writeFileSync(path.resolve(process.cwd(), outputFile), JSON.stringify(payload, null, 2), 'utf8');

  if (applyMode) {
    applyResults(results);
  }

  console.log(`Accepted ${acceptedCount}/${results.length}`);
  console.log(`Saved: ${outputFile}`);
  if (applyMode) {
    console.log('Applied accepted official names/complexIds to apartments.ts');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
