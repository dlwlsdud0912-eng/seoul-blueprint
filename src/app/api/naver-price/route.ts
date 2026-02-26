import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const complexId = request.nextUrl.searchParams.get('complexId');
  if (!complexId) {
    return NextResponse.json({ error: 'complexId required' }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: `https://new.land.naver.com/complexes/${complexId}`,
      Accept: 'application/json',
    };

    const articleUrl =
      `https://new.land.naver.com/api/articles/complex/${complexId}` +
      `?realEstateType=APT&tradeType=A1` +
      `&tag=%3A%3A%3A%3A%3A%3A%3A%3A` +
      `&rentPriceMin=0&rentPriceMax=900000000` +
      `&priceMin=0&priceMax=900000000` +
      `&areaMin=0&areaMax=900000000` +
      `&oldBuildYears&recentlyBuildYears` +
      `&minHouseholdCount&maxHouseholdCount` +
      `&showArticle=false&sameAddressGroup=true` +
      `&minMaintenanceCost&maxMaintenanceCost` +
      `&priceType=RETAIL&directions=` +
      `&page=1&complexNo=${complexId}` +
      `&buildingNos=&areaNos=&type=list&order=prc`;

    const res = await fetch(articleUrl, { headers });
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        return NextResponse.json(
          { error: '네이버 접근 제한됨 (잠시 후 재시도)' },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: `가격 조회 실패 (HTTP ${res.status})` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const articles: Record<string, unknown>[] = data?.articleList ?? [];

    if (articles.length === 0) {
      return NextResponse.json({ price: null, articleCount: 0, sizes: {} });
    }

    // 매매 매물만 필터
    const saleArticles = articles.filter(
      (a) => a.tradeTypeName === '\uB9E4\uB9E4' && a.dealOrWarrantPrc,
    );

    if (saleArticles.length === 0) {
      return NextResponse.json({ price: null, articleCount: 0, sizes: {} });
    }

    // 최저가 (만원 단위 -> 억 단위)
    let minPrice = Infinity;
    for (const a of saleArticles) {
      const priceStr = String(a.dealOrWarrantPrc ?? '').replace(/,/g, '');
      const priceNum = parseInt(priceStr, 10);
      if (!isNaN(priceNum) && priceNum < minPrice) {
        minPrice = priceNum;
      }
    }
    const priceInOk = Math.round((minPrice / 10000) * 10) / 10;

    // 면적별 가격
    const SIZE_BUCKETS = [
      { key: '59', center: 59, tolerance: 5 },
      { key: '84', center: 84, tolerance: 5 },
      { key: '114', center: 114, tolerance: 10 },
    ];

    const sizes: Record<string, { price: number; count: number } | null> = {};
    for (const bucket of SIZE_BUCKETS) {
      const bucketSale = saleArticles.filter((a) => {
        const exArea = parseFloat(
          String(a.exclusiveArea ?? a.area2 ?? '0'),
        );
        return Math.abs(exArea - bucket.center) <= bucket.tolerance;
      });
      if (bucketSale.length === 0) continue;

      let bucketMin = Infinity;
      for (const a of bucketSale) {
        const priceStr = String(a.dealOrWarrantPrc ?? '').replace(/,/g, '');
        const priceNum = parseInt(priceStr, 10);
        if (!isNaN(priceNum) && priceNum < bucketMin) {
          bucketMin = priceNum;
        }
      }
      sizes[bucket.key] = {
        price: Math.round((bucketMin / 10000) * 10) / 10,
        count: bucketSale.length,
      };
    }

    return NextResponse.json({
      price: priceInOk,
      articleCount: saleArticles.length,
      sizes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    const isNetwork = message.includes('fetch') || message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT');
    return NextResponse.json(
      { error: isNetwork ? '네이버 연결 실패' : message },
      { status: 500 },
    );
  }
}
