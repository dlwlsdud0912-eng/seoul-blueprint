import { readFileSync } from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

type MindMapPdfItem = {
  id: string;
  name: string;
  priceLabel: string;
  articleCount?: number;
  ownerVerified?: boolean;
  memo?: string;
};

type MindMapPdfDistrict = {
  district: string;
  items: MindMapPdfItem[];
};

export interface MindMapPdfInput {
  title: string;
  subtitle?: string;
  filename: string;
  districts: MindMapPdfDistrict[];
}

const PAGE_WIDTH = 1190.55;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 28;
const HEADER_HEIGHT = 92;
const COLUMN_GAP = 18;
const COLUMN_COUNT = 4;
const COLUMN_WIDTH = (PAGE_WIDTH - PAGE_MARGIN * 2 - COLUMN_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;
const CARD_PADDING = 10;
const DISTRICT_HEADER_HEIGHT = 30;
const DISTRICT_GAP = 12;
const CARD_GAP = 10;
const OWNER_BADGE = '집주인인증X';

function wrapText(text: string, maxWidth: number, font: any, size: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function estimateCardHeight(item: MindMapPdfItem, regularFont: any, boldFont: any) {
  const nameLines = wrapText(item.name, COLUMN_WIDTH - CARD_PADDING * 2 - 54, boldFont, 11);
  const priceLines = wrapText(item.priceLabel, COLUMN_WIDTH - CARD_PADDING * 2, regularFont, 9);
  const memoLines = item.memo
    ? wrapText(item.memo, COLUMN_WIDTH - CARD_PADDING * 2, regularFont, 8)
    : [];

  const base =
    CARD_PADDING * 2 +
    nameLines.length * 14 +
    6 +
    priceLines.length * 11 +
    4 +
    11;

  if (memoLines.length === 0) return base;
  return base + 10 + memoLines.length * 10 + 10;
}

function drawRoundedCard(page: any, x: number, y: number, width: number, height: number, fill: ReturnType<typeof rgb>, border?: ReturnType<typeof rgb>) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: fill,
    borderColor: border,
    borderWidth: border ? 1 : 0,
    opacity: 1,
  });
}

export async function generateMindMapPdf(input: MindMapPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const regularFontBytes = readFileSync(path.join(process.cwd(), 'public', 'fonts', 'NotoSansKR-Regular.ttf'));
  const boldFontBytes = readFileSync(path.join(process.cwd(), 'public', 'fonts', 'NanumGothicBold.ttf'));
  const regularFont = await pdf.embedFont(regularFontBytes);
  const boldFont = await pdf.embedFont(boldFontBytes);
  const fallbackFont = await pdf.embedFont(StandardFonts.Helvetica);

  const safeRegular = regularFont ?? fallbackFont;
  const safeBold = boldFont ?? fallbackFont;

  const pages: any[] = [];

  function addPage() {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: rgb(0.96, 0.95, 1),
    });
    page.drawRectangle({
      x: PAGE_MARGIN,
      y: PAGE_MARGIN,
      width: PAGE_WIDTH - PAGE_MARGIN * 2,
      height: PAGE_HEIGHT - PAGE_MARGIN * 2,
      color: rgb(0.98, 0.97, 1),
      borderColor: rgb(0.85, 0.81, 0.97),
      borderWidth: 1,
    });

    page.drawRectangle({
      x: PAGE_MARGIN + 6,
      y: PAGE_HEIGHT - PAGE_MARGIN - 38,
      width: 220,
      height: 28,
      color: rgb(0.43, 0.3, 1),
    });
    page.drawText(input.title, {
      x: PAGE_MARGIN + 18,
      y: PAGE_HEIGHT - PAGE_MARGIN - 29,
      size: 15,
      font: safeBold,
      color: rgb(1, 1, 1),
    });

    if (input.subtitle) {
      page.drawText(input.subtitle, {
        x: PAGE_MARGIN + 6,
        y: PAGE_HEIGHT - PAGE_MARGIN - 56,
        size: 10,
        font: safeRegular,
        color: rgb(0.43, 0.41, 0.58),
      });
    }

    const totalApartments = input.districts.reduce((sum, district) => sum + district.items.length, 0);
    const chipText = `구 ${input.districts.length}개 | 아파트 ${totalApartments}개`;
    const chipWidth = safeRegular.widthOfTextAtSize(chipText, 10) + 28;
    page.drawRectangle({
      x: PAGE_WIDTH - PAGE_MARGIN - chipWidth - 6,
      y: PAGE_HEIGHT - PAGE_MARGIN - 38,
      width: chipWidth,
      height: 24,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.9, 0.88, 0.96),
      borderWidth: 1,
    });
    page.drawText(chipText, {
      x: PAGE_WIDTH - PAGE_MARGIN - chipWidth + 8,
      y: PAGE_HEIGHT - PAGE_MARGIN - 30,
      size: 10,
      font: safeRegular,
      color: rgb(0.36, 0.34, 0.48),
    });

    pages.push(page);
    return page;
  }

  let page = addPage();
  let columnIndex = 0;
  let cursorY = PAGE_HEIGHT - PAGE_MARGIN - HEADER_HEIGHT;

  function nextColumn() {
    columnIndex += 1;
    if (columnIndex >= COLUMN_COUNT) {
      page = addPage();
      columnIndex = 0;
    }
    cursorY = PAGE_HEIGHT - PAGE_MARGIN - HEADER_HEIGHT;
  }

  for (const district of input.districts) {
    const districtHeight =
      DISTRICT_HEADER_HEIGHT +
      DISTRICT_GAP +
      district.items.reduce((sum, item) => sum + estimateCardHeight(item, safeRegular, safeBold) + CARD_GAP, 0);

    if (cursorY - districtHeight < PAGE_MARGIN + 24) {
      nextColumn();
    }

    const columnX = PAGE_MARGIN + columnIndex * (COLUMN_WIDTH + COLUMN_GAP);

    page.drawRectangle({
      x: columnX,
      y: cursorY - DISTRICT_HEADER_HEIGHT,
      width: 112,
      height: DISTRICT_HEADER_HEIGHT,
      color: rgb(0.48, 0.25, 0.95),
    });
    page.drawText(district.district, {
      x: columnX + 12,
      y: cursorY - 20,
      size: 12,
      font: safeBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(`${district.items.length}개`, {
      x: columnX + 12,
      y: cursorY - 33,
      size: 9,
      font: safeRegular,
      color: rgb(0.93, 0.92, 1),
    });

    cursorY -= DISTRICT_HEADER_HEIGHT + DISTRICT_GAP;

    for (const item of district.items) {
      const cardHeight = estimateCardHeight(item, safeRegular, safeBold);
      const cardY = cursorY - cardHeight;

      drawRoundedCard(page, columnX, cardY, COLUMN_WIDTH, cardHeight, rgb(0.47, 0.25, 0.95), rgb(0.91, 0.89, 0.98));

      const nameLines = wrapText(item.name, COLUMN_WIDTH - CARD_PADDING * 2 - 58, safeBold, 11);
      let textY = cardY + cardHeight - CARD_PADDING - 11;

      for (const line of nameLines) {
        page.drawText(line, {
          x: columnX + CARD_PADDING,
          y: textY,
          size: 11,
          font: safeBold,
          color: rgb(1, 1, 1),
        });
        textY -= 14;
      }

      if (item.ownerVerified === false) {
        const badgeText = OWNER_BADGE;
        const badgeWidth = safeBold.widthOfTextAtSize(badgeText, 8) + 14;
        page.drawRectangle({
          x: columnX + COLUMN_WIDTH - badgeWidth - CARD_PADDING,
          y: cardY + cardHeight - 22,
          width: badgeWidth,
          height: 14,
          color: rgb(1, 0.95, 0.7),
        });
        page.drawText(badgeText, {
          x: columnX + COLUMN_WIDTH - badgeWidth - CARD_PADDING + 7,
          y: cardY + cardHeight - 18,
          size: 8,
          font: safeBold,
          color: rgb(0.48, 0.36, 0),
        });
      }

      const priceLines = wrapText(item.priceLabel, COLUMN_WIDTH - CARD_PADDING * 2, safeRegular, 9);
      for (const line of priceLines) {
        page.drawText(line, {
          x: columnX + CARD_PADDING,
          y: textY - 4,
          size: 9,
          font: safeRegular,
          color: rgb(0.96, 0.95, 1),
        });
        textY -= 11;
      }

      page.drawText(`매물 ${item.articleCount ?? 0}개`, {
        x: columnX + CARD_PADDING,
        y: textY - 2,
        size: 8,
        font: safeRegular,
        color: rgb(0.87, 0.85, 0.96),
      });
      textY -= 14;

      if (item.memo) {
        const memoLines = wrapText(item.memo, COLUMN_WIDTH - CARD_PADDING * 2 - 12, safeRegular, 8);
        const memoHeight = memoLines.length * 10 + 10;
        page.drawRectangle({
          x: columnX + CARD_PADDING,
          y: cardY + 10,
          width: COLUMN_WIDTH - CARD_PADDING * 2,
          height: memoHeight,
          color: rgb(1, 0.96, 0.72),
          borderColor: rgb(0.94, 0.88, 0.55),
          borderWidth: 1,
        });
        let memoY = cardY + memoHeight + 4;
        for (const line of memoLines) {
          page.drawText(line, {
            x: columnX + CARD_PADDING + 6,
            y: memoY,
            size: 8,
            font: safeRegular,
            color: rgb(0.36, 0.29, 0),
          });
          memoY -= 10;
        }
      }

      cursorY = cardY - CARD_GAP;
    }

    cursorY -= 6;
  }

  return pdf.save();
}
