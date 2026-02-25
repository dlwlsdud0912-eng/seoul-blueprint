import { NextRequest, NextResponse } from 'next/server';
import { searchComplex, getLowestPrice, delay } from '@/lib/naver';

interface BatchItem {
  id: string;
  name: string;
  size?: string;
  naverComplexId?: string;
}

interface BatchResult {
  id: string;
  price: number | null;
  articleCount: number;
  areaName?: string;
  complexId?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apartments: BatchItem[] = body?.apartments;

    if (!Array.isArray(apartments) || apartments.length === 0) {
      return NextResponse.json(
        { error: 'apartments 배열을 전달해주세요.' },
        { status: 400 }
      );
    }

    const results: BatchResult[] = [];

    for (const apt of apartments) {
      try {
        // complexId가 없으면 검색
        let complexId = apt.naverComplexId;
        if (!complexId) {
          complexId = (await searchComplex(apt.name)) ?? undefined;
          if (!complexId) {
            results.push({
              id: apt.id,
              price: null,
              articleCount: 0,
              error: '단지를 찾을 수 없습니다.',
            });
            await delay(500);
            continue;
          }
        }

        const priceResult = await getLowestPrice(complexId, apt.size);

        if (priceResult) {
          results.push({
            id: apt.id,
            price: priceResult.price,
            articleCount: priceResult.articleCount,
            areaName: priceResult.areaName,
            complexId,
          });
        } else {
          results.push({
            id: apt.id,
            price: null,
            articleCount: 0,
            complexId,
            error: '매물 정보를 찾을 수 없습니다.',
          });
        }
      } catch {
        results.push({
          id: apt.id,
          price: null,
          articleCount: 0,
          error: '조회 중 오류 발생',
        });
      }

      // 네이버 과호출 방지 딜레이
      await delay(500);
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: '요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
