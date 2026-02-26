import { NextRequest, NextResponse } from 'next/server';

function extractResults(data: Record<string, unknown>): Record<string, unknown>[] {
  // new.land.naver.com 응답 형식
  const complexes = data?.complexes;
  if (Array.isArray(complexes) && complexes.length > 0) return complexes;

  // fallback 응답 형식
  const resultList = (data?.result as Record<string, unknown>)?.list;
  if (Array.isArray(resultList) && resultList.length > 0) return resultList;

  return [];
}

function mapResults(list: Record<string, unknown>[]) {
  return list.slice(0, 5).map((c) => ({
    complexId: c.complexNo ?? c.complexNumber ?? c.hscpNo ?? '',
    name: c.complexName ?? c.name ?? '',
    address: c.cortarAddress ?? c.address ?? '',
    totalHouseholdCount: c.totalHouseholdCount ?? 0,
  }));
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');
  if (!query) {
    return NextResponse.json({ error: 'query required' }, { status: 400 });
  }

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Referer: 'https://new.land.naver.com/',
    Accept: 'application/json',
  };

  // Fallback URL 순서
  const urls = [
    `https://new.land.naver.com/api/search?query=${encodeURIComponent(query)}&type=APT`,
    `https://new.land.naver.com/api/search?query=${encodeURIComponent(query)}`,
    `https://m.land.naver.com/search/result/${encodeURIComponent(query)}`,
  ];

  let lastStatus = 0;

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers });
      lastStatus = res.status;

      if (res.status === 403 || res.status === 429) {
        // 접근 제한 - 다음 URL 시도
        continue;
      }

      if (!res.ok) continue;

      const data = await res.json();
      const list = extractResults(data);

      if (list.length > 0) {
        return NextResponse.json({ results: mapResults(list) });
      }
    } catch {
      // 네트워크 오류 - 다음 URL 시도
      continue;
    }
  }

  // 모든 URL 실패
  if (lastStatus === 403 || lastStatus === 429) {
    return NextResponse.json(
      { error: '네이버 접근 제한됨 (잠시 후 재시도)', results: [] },
      { status: 429 },
    );
  }

  return NextResponse.json({ results: [] });
}
