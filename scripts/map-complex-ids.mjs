// Naver Complex ID Mapper
// Strategy: Search naver.com for each apartment name, extract complexId from land.naver.com links in results
// This avoids the heavily rate-limited new.land.naver.com API

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

const APARTMENTS = [
  { id: 'seongbuk-jangwi-ipk', name: '장위 꿈의숲아이파크' },
  { id: 'seongbuk-raemian-jangwi', name: '래미안장위포레카운티' },
  { id: 'seongbuk-raemian-areum', name: '래미안아름숲' },
  { id: 'seongbuk-gileum2-prugio', name: '길음2단지푸르지오' },
  { id: 'seongbuk-gileum-raemian8-back', name: '길음래미안8단지' },
  { id: 'dongdaemun-dapsimni-donga', name: '답십리동아' },
  { id: 'dongdaemun-imun-epyeon', name: '이문e편한세상' },
  { id: 'dongdaemun-jeonnong-sk', name: '전농SK' },
  { id: 'dongdaemun-imun-raemian2', name: '이문래미안2차' },
  { id: 'dongdaemun-jegi-hanshin', name: '제기동 한신' },
  { id: 'dongdaemun-jangan-hyundai', name: '장안 현대홈타운' },
  { id: 'dongdaemun-jeonnong-woosung', name: '전농우성' },
  { id: 'dongdaemun-jeonnong-donga', name: '전농동아' },
  { id: 'gangseo-gayang2', name: '가양2단지' },
  { id: 'gangseo-gayang6', name: '가양6단지' },
  { id: 'gangseo-deungchon-ipk', name: '등촌아이파크' },
  { id: 'gangseo-gayang-woosung', name: '가양우성' },
  { id: 'gangseo-yeomchang-donga1', name: '염창동아1차' },
  { id: 'gangdong-gangil3', name: '강일리버파크3단지' },
  { id: 'gangdong-gangil5', name: '강일리버파크5단지' },
  { id: 'gangdong-godeok-rien3', name: '고덕리엔파크3단지' },
  { id: 'gangdong-godeok-rien2', name: '고덕리엔파크2단지' },
  { id: 'gangdong-myungil-gs', name: '명일GS' },
  { id: 'yeongdeungpo-singil-samsung', name: '신길삼성' },
  { id: 'yeongdeungpo-dangsan-hangang', name: '당산동 한강' },
  { id: 'yangcheon-mokdong-samsung2', name: '목동 삼성래미안2차' },
  { id: 'yangcheon-mokdong-woosung2', name: '목동우성2차' },
  { id: 'yangcheon-sinjeong-lotte', name: '신정뉴타운롯데캐슬' },
  { id: 'yangcheon-mokdong-central-ipk', name: '목동센트럴아이파크위브' },
  { id: 'yangcheon-mokdong-lotte-winner', name: '목동롯데캐슬위너' },
  { id: 'gwanak-dreamtown', name: '관악드림타운' },
  { id: 'gwanak-dongbu', name: '관악동부센트레빌' },
  { id: 'gwanak-hyundai', name: '관악현대' },
  { id: 'gwanak-woosung', name: '관악우성' },
  { id: 'gwanak-prugio', name: '관악푸르지오' },
  { id: 'gwanak-boramae-samsung', name: '보라매삼성' },
  { id: 'gwanak-sillim-prugio1', name: '신림푸르지오1차' },
  { id: 'gwanak-naksungdae-hyundai', name: '낙성대현대홈타운' },
  { id: 'yongsan-hangangtown', name: '한강타운' },
  { id: 'seongdong-seongsu-woobang2', name: '성수우방2차' },
  { id: 'yeongdeungpo-yangpyung-hanshin', name: '양평한신' },
  { id: 'yeongdeungpo-prugio', name: '영등포푸르지오' },
  { id: 'seongbuk-gileum-raemian8-front', name: '길음래미안8단지' },
  { id: 'seongbuk-gileum-centerpiece', name: '길음 센터피스' },
  { id: 'seongbuk-gileum-raemian1', name: '길음래미안 1단지' },
  { id: 'songpa-parkdale2', name: '파크데일2단지' },
  { id: 'songpa-pungnap-donga', name: '풍납동 동아한가람' },
  { id: 'songpa-samsung-gwangnaru', name: '삼성광나루' },
  { id: 'songpa-dunchon-misojieum', name: '둔촌신성미소지움' },
  { id: 'songpa-the-platinum', name: '송파더플래티넘' },
  { id: 'mapo-coolong', name: '코오롱하늘채' },
  { id: 'mapo-singongdeok-samsung2', name: '신공덕삼성래미안2차' },
  { id: 'mapo-hangang-ipk', name: '마포한강아이파크' },
  { id: 'dongjak-sindaebang-woosung1', name: '신대방우성1차' },
  { id: 'dongjak-daebang-daelim', name: '대방대림' },
  { id: 'gangseo-gangnaru-hyundai', name: '강나루현대' },
  { id: 'gangseo-woojangsan-lotte', name: '우장산롯데캐슬' },
  { id: 'gangseo-hangang-zai', name: '강서한강자이' },
  { id: 'gwanak-epyeon-snu', name: 'e편한세상서울대입구' },
  { id: 'gangdong-seongnae-samsung', name: '성내삼성' },
  { id: 'gangdong-seonsa-hyundai', name: '선사현대' },
  { id: 'dongdaemun-dapsimni-parkzai-59', name: '답십리 파크자이' },
  { id: 'dongdaemun-raemian-weave', name: '래미안위브' },
  { id: 'dongdaemun-dapsimni-parkzai', name: '답십리 파크자이' },
  { id: 'dongdaemun-raemian-crecity', name: '래미안크레시티' },
  { id: 'dongdaemun-hwegyeong-zai', name: '휘경자이디센시아' },
  { id: 'dongdaemun-imun-ipk-zai', name: '이문아이파크자이' },
  { id: 'seongbuk-gileum-lotte-clasia', name: '길음 롯데캐슬클라시아' },
  { id: 'mapo-dangsan-jinro', name: '당산 진로' },
  { id: 'mapo-sangam-worldcup4', name: '상암월드컵4단지' },
  { id: 'dongjak-sangdo-prugio', name: '상도푸르지오클라베뉴' },
  { id: 'dongjak-boramae-zai', name: '보라매자이더포레스트' },
  { id: 'songpa-thesharp-prestige', name: '더샵파크프레스티지' },
  { id: 'songpa-raemian-ellinity', name: '래미안엘리니티' },
  { id: 'gangdong-raemian-palace', name: '래미안강동팰리스' },
  { id: 'yeongdeungpo-dangsan-samsung2', name: '당산삼성2차' },
  { id: 'yeongdeungpo-art-zai', name: '영등포 아트자이' },
  { id: 'gangseo-hangang-zai-16', name: '강서한강자이' },
  { id: 'dongdaemun-cheongnyangni-l65', name: '청량리 L65' },
  { id: 'seongdong-wangsimni-zai', name: '왕십리자이' },
  { id: 'gangseo-epyeon-yeomchang', name: 'e편한세상 염창' },
  { id: 'gangseo-magok14', name: '마곡엠벨리14단지' },
  { id: 'yeongdeungpo-dongbu-centrevil', name: '동부센트레빌' },
  { id: 'yeongdeungpo-raemian-prevenu', name: '래미안프레비뉴' },
  { id: 'yeongdeungpo-munrae-zai', name: '문래자이' },
  { id: 'yeongdeungpo-prior-palace', name: '프라이어팰리스' },
  { id: 'yeongdeungpo-singil-parkzai', name: '신길파크자이' },
  { id: 'gangdong-raemian-palace-20', name: '래미안강동팰리스' },
  { id: 'gangdong-raemian-solvenu', name: '래미안솔베뉴' },
  { id: 'gangdong-godeok-raemian-hs', name: '고덕래미안힐스테이트' },
  { id: 'gwanak-hillstate-centciel', name: '힐스테이트관악센트씨엘' },
  { id: 'mapo-sangam-worldcup4-20', name: '상암월드컵4단지' },
  { id: 'mapo-sungsan-siyoung', name: '성산시영' },
  { id: 'mapo-hangang-prugio', name: '마포한강푸르지오' },
  { id: 'mapo-samsung', name: '마포 삼성' },
  { id: 'dongjak-sadang-lotte', name: '사당롯데캐슬골든포레' },
  { id: 'dongjak-hillstate-sangdo-cp', name: '힐스테이트상도센트럴파크' },
  { id: 'dongjak-raemian-sangdo3', name: '래미안상도3차' },
  { id: 'dongjak-hillstate-sangdo-pres', name: '힐스테이트상도프레스티지' },
  { id: 'songpa-garak-kumho', name: '가락금호' },
  { id: 'songpa-signature-lotte', name: '송파시그니처롯데캐슬' },
  { id: 'seongdong-seoulforest-hs', name: '서울숲힐스테이트' },
  { id: 'seongdong-seoulforest-prugio2', name: '서울숲푸르지오2차' },
  { id: 'seongdong-seoulforest-prugio1', name: '서울숲푸르지오1차' },
  { id: 'seongdong-singumho-parkzai', name: '신금호파크자이' },
  { id: 'seongdong-kumho-parkhills', name: '금호파크힐스' },
  { id: 'seongdong-raemian-wellstream', name: '래미안웰스트림' },
  { id: 'gangseo-magok7', name: '마곡엠벨리7단지' },
  { id: 'yeongdeungpo-dangsan-central-ipk', name: '당산센트럴아이파크' },
  { id: 'yeongdeungpo-dangsan-samsung-raemian', name: '당산삼성래미안' },
  { id: 'gangdong-godeok-gracium', name: '고덕 그라시움' },
  { id: 'yongsan-epyeon', name: '용산e편한세상' },
  { id: 'yongsan-lotte-centerfore', name: '용산롯데캐슬센터포레' },
  { id: 'yongsan-ichon-daelim', name: '이촌 대림' },
  { id: 'yongsan-sanho', name: '용산 산호' },
  { id: 'mapo-raemian-bamsem2', name: '래미안밤섬리베뉴2' },
  { id: 'mapo-grand-zai', name: '마포그랑자이' },
  { id: 'mapo-raemian-prugio', name: '마포래미안푸르지오' },
  { id: 'mapo-prestige-zai', name: '마포프레스티지자이' },
  { id: 'dongjak-epyeon-sangdo', name: 'e편한세상상도노빌리티' },
  { id: 'dongjak-raemian-roipark', name: '래미안로이파크' },
  { id: 'dongjak-raemian-twinpark', name: '래미안 트윈파크' },
  { id: 'songpa-munjeong-raemian', name: '문정래미안' },
  { id: 'songpa-raemian-estium', name: '래미안에스티움' },
  { id: 'songpa-raemian-parkpalace', name: '송파 래미안파크팰리스' },
  { id: 'songpa-jamsil-olympic-ipk', name: '잠실올림픽공원아이파크' },
  { id: 'songpa-hillstate-epyeon-munjeong', name: '힐스테이트e편한세상 문정' },
  { id: 'songpa-arteon', name: '아르테온' },
  { id: 'songpa-centras', name: '센트라스' },
  { id: 'songpa-hanyang1', name: '송파동 한양1차' },
];

// Deduplicate by id
const seen = new Set();
const uniqueApartments = APARTMENTS.filter(apt => {
  if (seen.has(apt.id)) return false;
  seen.add(apt.id);
  return true;
});

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function searchComplexId(name, retries = 3) {
  const query = name + ' 아파트';
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = 'https://search.naver.com/search.naver?where=nexearch&query=' + encodeURIComponent(query);
      const res = await fetch(url, { headers: HEADERS });

      if (res.status === 429) {
        const waitTime = Math.pow(2, attempt) * 10000;
        console.log(`  429 for "${name}", waiting ${waitTime/1000}s (attempt ${attempt+1}/${retries})`);
        await delay(waitTime);
        continue;
      }

      if (!res.ok) {
        console.log(`  HTTP ${res.status} for "${name}"`);
        return null;
      }

      const html = await res.text();

      // Extract first complexes/XXXXX from land.naver.com links
      const match = html.match(/(?:new\.land|fin\.land|land)\.naver\.com\/complexes\/(\d+)/);
      if (match) {
        return match[1];
      }

      // Fallback: look for rletNo=XXXXX
      const rletMatch = html.match(/rletNo=(\d+)/);
      if (rletMatch) {
        return rletMatch[1];
      }

      return null;
    } catch (err) {
      console.log(`  Error for "${name}": ${err.message}`);
      if (attempt < retries - 1) {
        await delay(5000);
      }
    }
  }
  return null;
}

async function main() {
  const mapping = {};
  let success = 0, fail = 0;
  const failed = [];

  console.log(`Total unique apartments: ${uniqueApartments.length}`);
  console.log('Using search.naver.com HTML scraping strategy');
  console.log('Starting...\n');

  for (let i = 0; i < uniqueApartments.length; i++) {
    const apt = uniqueApartments[i];

    // Skip duplicates that already have a mapping (same name, different id)
    const existingEntry = Object.entries(mapping).find(([k, v]) => {
      const existingApt = uniqueApartments.find(a => a.id === k);
      return existingApt && existingApt.name === apt.name;
    });

    if (existingEntry) {
      // Same name apartment already found - reuse the complex ID
      mapping[apt.id] = existingEntry[1];
      success++;
      console.log(`[${i+1}/${uniqueApartments.length}] OK ${apt.name} -> ${existingEntry[1]} (reused)`);
      continue;
    }

    const complexId = await searchComplexId(apt.name);
    if (complexId) {
      mapping[apt.id] = complexId;
      success++;
      console.log(`[${i+1}/${uniqueApartments.length}] OK ${apt.name} -> ${complexId}`);
    } else {
      fail++;
      failed.push(apt);
      console.log(`[${i+1}/${uniqueApartments.length}] FAIL ${apt.name} -> NOT FOUND`);
    }
    // 1.5s delay between naver search requests
    await delay(1500);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Success: ${success}, Fail: ${fail}`);

  if (failed.length > 0) {
    console.log(`\n=== FAILED LIST ===`);
    failed.forEach(apt => console.log(`  ${apt.id}: ${apt.name}`));
  }

  console.log('\n=== MAPPING JSON ===');
  console.log(JSON.stringify(mapping, null, 2));
}

main();
