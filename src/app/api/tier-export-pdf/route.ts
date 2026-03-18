import { NextRequest, NextResponse } from 'next/server';
import { generateTierExportPdf, type TierExportPdfInput } from '@/lib/tier-export-pdf-server';

export const runtime = 'nodejs';

function sanitizeFilename(filename: string) {
  return filename.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-');
}

function toAsciiFilename(filename: string) {
  return (
    sanitizeFilename(filename)
      .replace(/[^\x20-\x7E]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'tier-export.pdf'
  );
}

export async function POST(request: NextRequest) {
  try {
    const input: TierExportPdfInput = await request.json();
    const pdfBytes = await generateTierExportPdf(input);
    const filename = sanitizeFilename(input.filename || 'tier-export.pdf');
    const asciiFilename = toAsciiFilename(filename);
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error('Tier export PDF generation failed:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Tier export PDF generation failed', detail },
      { status: 500 }
    );
  }
}
