import { TIERS } from '@/data/tiers';
import type { TierKey } from '@/types';

type ExportApartment = {
  id: string;
  district: string;
  name: string;
  size: string;
  basePrice: number;
  currentPrice?: number;
  areaName?: string;
  sizes?: Record<string, { price: number; count: number } | null>;
};

export type TierExportRow = {
  district: string;
  name: string;
  priceLabel: string;
  sizeLabel: string;
};

export type TierExportPayload = {
  title: string;
  subtitle: string;
  filename: string;
  totalCount: number;
  rows: TierExportRow[];
  bodyHtml: string;
  documentHtml: string;
};

const LABEL_TITLE_SUFFIX = '티어 아파트 리스트';
const LABEL_DESC = '네이버부동산 기준 실시간 최저 매물가 반영';
const LABEL_DISTRICT = '구';
const LABEL_NAME = '아파트명';
const LABEL_PRICE = '가격';
const LABEL_SIZE = '평수';

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugifyFilename(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatPrice(value?: number) {
  if (typeof value !== 'number') return '--';
  return `${value}억`;
}

function formatSizeLabel(apartment: ExportApartment) {
  const size59 = apartment.sizes?.['59'];
  const size84 = apartment.sizes?.['84'];

  if (size59) return '59㎡';
  if (size84) return '84㎡';
  if (apartment.areaName) return apartment.areaName.replaceAll('??', '㎡');
  if (apartment.size) return apartment.size.replaceAll('??', '평');
  return '--';
}

function buildRows(apartments: ExportApartment[]) {
  return apartments
    .map((apartment) => ({
      district: apartment.district,
      name: apartment.name,
      priceLabel: formatPrice(apartment.currentPrice ?? apartment.basePrice),
      sizeLabel: formatSizeLabel(apartment),
      effectivePrice: apartment.currentPrice ?? apartment.basePrice,
    }))
    .sort(
      (a, b) =>
        a.effectivePrice - b.effectivePrice ||
        a.district.localeCompare(b.district, 'ko') ||
        a.name.localeCompare(b.name, 'ko')
    )
    .map(({ effectivePrice, ...row }) => row);
}

function getTableStyles() {
  return `
    .tier-export-wrap { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #222; }
    .tier-export-headline { margin: 0 0 12px; font-size: 30px; line-height: 1.3; color: #1f2937; }
    .tier-export-subtitle { margin: 0 0 18px; color: #4b5563; font-size: 15px; }
    .tier-export-summary { margin: 0 0 16px; color: #6b7280; font-size: 13px; }
    .tier-export-table-wrap { overflow-x: auto; }
    .tier-export-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 14px; }
    .tier-export-table th,
    .tier-export-table td { border: 1px solid #d9d9d9; padding: 10px 12px; text-align: left; vertical-align: middle; word-break: keep-all; }
    .tier-export-table th { background: #f5f7fb; color: #374151; font-weight: 700; }
    .tier-export-table td { color: #111827; }
    .tier-export-table tr:nth-child(even) td { background: #fcfcfc; }
    .tier-export-table .col-district { width: 18%; }
    .tier-export-table .col-name { width: 48%; }
    .tier-export-table .col-price { width: 17%; }
    .tier-export-table .col-size { width: 17%; }
    @media (max-width: 720px) {
      .tier-export-headline { font-size: 24px; }
      .tier-export-subtitle { font-size: 14px; }
      .tier-export-summary { font-size: 12px; }
      .tier-export-table { font-size: 13px; }
      .tier-export-table th,
      .tier-export-table td { padding: 8px 9px; }
    }
  `;
}

function buildBodyHtml(
  title: string,
  subtitle: string,
  totalCount: number,
  rows: TierExportRow[]
) {
  const tableRows = rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.district)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.priceLabel)}</td>
        <td>${escapeHtml(row.sizeLabel)}</td>
      </tr>`
    )
    .join('');

  return `
<section class="tier-export-wrap">
  <style>${getTableStyles()}</style>
  <h1 class="tier-export-headline">${escapeHtml(title)}</h1>
  <p class="tier-export-subtitle">${escapeHtml(subtitle)}</p>
  <p class="tier-export-summary">총 ${totalCount}개 단지</p>
  <div class="tier-export-table-wrap">
    <table class="tier-export-table">
      <thead>
        <tr>
          <th class="col-district">${LABEL_DISTRICT}</th>
          <th class="col-name">${LABEL_NAME}</th>
          <th class="col-price">${LABEL_PRICE}</th>
          <th class="col-size">${LABEL_SIZE}</th>
        </tr>
      </thead>
      <tbody>${tableRows}
      </tbody>
    </table>
  </div>
</section>
`.trim();
}

function buildDocumentHtml(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      color: #222;
      line-height: 1.6;
      margin: 32px auto;
      max-width: 980px;
      padding: 0 18px;
      background: #ffffff;
    }
    @media (max-width: 720px) {
      body {
        margin: 20px auto;
        padding: 0 12px;
      }
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export function buildTierExportPayload(
  tier: TierKey,
  apartments: ExportApartment[],
  updatedAtKR: string
): TierExportPayload {
  const tierMeta = TIERS.find((item) => item.key === tier);
  const tierLabel = tierMeta?.label ?? `${tier}티어`;
  const title = `${tierLabel} ${LABEL_TITLE_SUFFIX}`;
  const subtitle = `${LABEL_DESC} / 업데이트: ${updatedAtKR || '-'}`;
  const rows = buildRows(apartments);
  const bodyHtml = buildBodyHtml(title, subtitle, rows.length, rows);
  const documentHtml = buildDocumentHtml(title, bodyHtml);
  const safeLabel = slugifyFilename(tierLabel) || `tier-${tier}`;

  return {
    title,
    subtitle,
    filename: `${safeLabel}-아파트-리스트-${(updatedAtKR || '').replace(/[^\d]/g, '').slice(0, 8) || 'latest'}.pdf`,
    totalCount: rows.length,
    rows,
    bodyHtml,
    documentHtml,
  };
}
