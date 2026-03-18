import { NextRequest, NextResponse } from 'next/server';
import { generateMindMapPdf, type MindMapPdfInput } from '@/lib/mindmap-pdf-server';

export const runtime = 'nodejs';

function sanitizeFilename(filename: string) {
  return filename.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-');
}

function toAsciiFilename(filename: string) {
  return sanitizeFilename(filename)
    .replace(/[^\x20-\x7E]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'mindmap.pdf';
}

export async function POST(request: NextRequest) {
  try {
    const input: MindMapPdfInput = await request.json();
    const pdfBytes = await generateMindMapPdf(input);
    const filename = sanitizeFilename(input.filename || 'mindmap.pdf');
    const asciiFilename = toAsciiFilename(filename);
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (err) {
    console.error('Mind map PDF generation failed:', err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Mind map PDF generation failed', detail },
      { status: 500 }
    );
  }
}
