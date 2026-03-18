import { readFileSync } from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { TierExportRow } from './tier-export';

export interface TierExportPdfInput {
  title: string;
  subtitle: string;
  filename: string;
  rows: TierExportRow[];
}

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 28;
const HEADER_HEIGHT = 72;
const TABLE_HEADER_HEIGHT = 24;
const ROW_HEIGHT = 22;
const COL_WIDTHS = [118, 410, 120, 108];

function drawPageHeader(page: any, boldFont: any, regularFont: any, title: string, subtitle: string, pageNumber: number) {
  page.drawText(title, {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 18,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.16, 0.25),
  });

  page.drawText(subtitle, {
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 38,
    size: 10,
    font: regularFont,
    color: rgb(0.38, 0.43, 0.5),
  });

  page.drawText(`${pageNumber}`, {
    x: PAGE_WIDTH - MARGIN - 12,
    y: PAGE_HEIGHT - MARGIN - 18,
    size: 10,
    font: regularFont,
    color: rgb(0.45, 0.48, 0.55),
  });
}

function drawTableHeader(page: any, boldFont: any, topY: number) {
  page.drawRectangle({
    x: MARGIN,
    y: topY - TABLE_HEADER_HEIGHT,
    width: COL_WIDTHS.reduce((sum, value) => sum + value, 0),
    height: TABLE_HEADER_HEIGHT,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.82, 0.85, 0.9),
    borderWidth: 1,
  });

  const headers = ['구', '아파트명', '가격', '평수'];
  let x = MARGIN;

  headers.forEach((header, index) => {
    page.drawText(header, {
      x: x + 8,
      y: topY - 16,
      size: 10,
      font: boldFont,
      color: rgb(0.22, 0.26, 0.33),
    });
    x += COL_WIDTHS[index];
  });
}

function fitText(value: string, maxWidth: number, font: any, size: number) {
  if (font.widthOfTextAtSize(value, size) <= maxWidth) {
    return value;
  }

  let current = value;
  while (current.length > 1 && font.widthOfTextAtSize(`${current}…`, size) > maxWidth) {
    current = current.slice(0, -1);
  }
  return `${current}…`;
}

export async function generateTierExportPdf(input: TierExportPdfInput) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const regularFontBytes = readFileSync(
    path.join(process.cwd(), 'public', 'fonts', 'NotoSansKR-Regular.ttf')
  );
  const boldFontBytes = readFileSync(
    path.join(process.cwd(), 'public', 'fonts', 'NanumGothicBold.ttf')
  );

  const regularFont = await pdf.embedFont(regularFontBytes);
  const boldFont = await pdf.embedFont(boldFontBytes);
  const fallbackFont = await pdf.embedFont(StandardFonts.Helvetica);

  const safeRegular = regularFont ?? fallbackFont;
  const safeBold = boldFont ?? fallbackFont;

  let pageNumber = 0;
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pageNumber += 1;
  drawPageHeader(page, safeBold, safeRegular, input.title, input.subtitle, pageNumber);

  let cursorY = PAGE_HEIGHT - MARGIN - HEADER_HEIGHT;
  drawTableHeader(page, safeBold, cursorY);
  cursorY -= TABLE_HEADER_HEIGHT;

  for (const row of input.rows) {
    if (cursorY - ROW_HEIGHT < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageNumber += 1;
      drawPageHeader(page, safeBold, safeRegular, input.title, input.subtitle, pageNumber);
      cursorY = PAGE_HEIGHT - MARGIN - HEADER_HEIGHT;
      drawTableHeader(page, safeBold, cursorY);
      cursorY -= TABLE_HEADER_HEIGHT;
    }

    page.drawRectangle({
      x: MARGIN,
      y: cursorY - ROW_HEIGHT,
      width: COL_WIDTHS.reduce((sum, value) => sum + value, 0),
      height: ROW_HEIGHT,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.86, 0.88, 0.91),
      borderWidth: 1,
    });

    const values = [row.district, row.name, row.priceLabel, row.sizeLabel];
    let x = MARGIN;

    values.forEach((value, index) => {
      const fitted = fitText(value, COL_WIDTHS[index] - 16, safeRegular, 10);
      page.drawText(fitted, {
        x: x + 8,
        y: cursorY - 15,
        size: 10,
        font: safeRegular,
        color: rgb(0.14, 0.17, 0.22),
      });
      x += COL_WIDTHS[index];
    });

    cursorY -= ROW_HEIGHT;
  }

  return pdf.save();
}
