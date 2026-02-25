import { NextRequest, NextResponse } from 'next/server';
import { getLowestPrice } from '@/lib/naver';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const complexId = searchParams.get('complexId');
  const size = searchParams.get('size') ?? undefined;

  if (!complexId) {
    return NextResponse.json(
      { error: 'complexId를 입력해주세요.' },
      { status: 400 }
    );
  }

  try {
    const result = await getLowestPrice(complexId, size);

    if (!result) {
      return NextResponse.json(
        { error: '매물 정보를 찾을 수 없습니다.', price: null },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: '가격 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
