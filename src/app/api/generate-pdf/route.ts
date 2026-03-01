import { NextRequest, NextResponse } from 'next/server';
import { generateFundingPdf } from '@/lib/funding-pdf-server';
import type { FundingInput } from '@/lib/funding-plan';

export async function POST(request: NextRequest) {
  try {
    const input: FundingInput = await request.json();
    const pdfBytes = await generateFundingPdf(input);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="funding-plan.pdf"',
      },
    });
  } catch (err) {
    console.error('PDF generation failed:', err);
    return NextResponse.json(
      { error: 'PDF 생성 실패' },
      { status: 500 },
    );
  }
}
