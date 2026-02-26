import { NextRequest, NextResponse } from 'next/server';

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

  try {
    // 1차: new.land.naver.com 검색 API
    const searchUrl = `https://new.land.naver.com/api/search?query=${encodeURIComponent(query)}&type=APT`;
    const searchRes = await fetch(searchUrl, { headers });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const complexes = searchData?.complexes ?? [];

      if (complexes.length > 0) {
        const results = complexes.slice(0, 5).map((c: Record<string, unknown>) => ({
          complexId: c.complexNo ?? c.complexNumber ?? c.hscpNo ?? '',
          name: c.complexName ?? c.name ?? '',
          address: c.cortarAddress ?? c.address ?? '',
          totalHouseholdCount: c.totalHouseholdCount ?? 0,
        }));
        return NextResponse.json({ results });
      }
    }

    // 2차 fallback: 다른 엔드포인트 시도
    const fallbackUrl = `https://new.land.naver.com/api/search?query=${encodeURIComponent(query)}`;
    const fallbackRes = await fetch(fallbackUrl, { headers });

    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      const list =
        fallbackData?.complexes ??
        fallbackData?.result?.list ??
        [];

      if (list.length > 0) {
        const results = list.slice(0, 5).map((c: Record<string, unknown>) => ({
          complexId: c.complexNo ?? c.complexNumber ?? c.hscpNo ?? '',
          name: c.complexName ?? c.name ?? '',
          address: c.cortarAddress ?? c.address ?? '',
          totalHouseholdCount: c.totalHouseholdCount ?? 0,
        }));
        return NextResponse.json({ results });
      }
    }

    return NextResponse.json({ results: [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
