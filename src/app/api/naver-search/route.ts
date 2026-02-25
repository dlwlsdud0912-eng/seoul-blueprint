import { NextRequest, NextResponse } from 'next/server';
import { searchComplex } from '@/lib/naver';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json(
      { error: '아파트명(name)을 입력해주세요.' },
      { status: 400 }
    );
  }

  try {
    const complexId = await searchComplex(name);

    if (!complexId) {
      return NextResponse.json(
        { error: '검색 결과가 없습니다.', complexId: null },
        { status: 404 }
      );
    }

    return NextResponse.json({ complexId, complexName: name });
  } catch {
    return NextResponse.json(
      { error: '네이버 부동산 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
