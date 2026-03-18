import { writeFileSync } from 'node:fs';
import apartmentModule from '../src/data/apartments.ts';
import regionExclusionsModule from '../src/data/region-exclusions.ts';
import pricesData from '../public/prices.json' with { type: 'json' };

const APARTMENTS = apartmentModule.APARTMENTS;
const { isRegionAllowedApartment } = regionExclusionsModule;
const prices = pricesData.prices || {};
const updatedAtKR = pricesData.updatedAtKR || '';

const LABEL_TITLE = '\uAC00\uC6A9\uD604\uAE08 6\uC5B5+\uB300\uCD9C 6\uC5B5 \uD2F0\uC5B4 \uC544\uD30C\uD2B8 \uB9AC\uC2A4\uD2B8';
const LABEL_DESC =
  '\uB124\uC774\uBC84\uBD80\uB3D9\uC0B0 \uAE30\uC900 \uC2E4\uC2DC\uAC04 \uCD5C\uC800 \uB9E4\uBB3C\uAC00 \uBC18\uC601';
const LABEL_DISTRICT = '\uAD6C';
const LABEL_NAME = '\uC544\uD30C\uD2B8\uBA85';
const LABEL_PRICE = '\uAC00\uACA9';
const LABEL_SIZE = '\uD3C9\uC218';
const LABEL_EOK = '\uC5B5';
const LABEL_SQM = '\u33A1';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(value) {
  if (typeof value !== 'number') return '--';
  return `${value}${LABEL_EOK}`;
}

function formatSizeLabel(apartment) {
  const size59 = apartment.sizes?.['59'];
  const size84 = apartment.sizes?.['84'];

  if (size59) return `59${LABEL_SQM}`;
  if (size84) return `84${LABEL_SQM}`;
  if (apartment.areaName) return apartment.areaName.replaceAll('??', LABEL_SQM);
  if (apartment.size) return apartment.size.replaceAll('??', '\uD3C9');
  return '--';
}

const apartments = APARTMENTS.filter(
  (apt) => isRegionAllowedApartment(apt.id) && apt.tier === '12'
)
  .map((apt) => {
    const live = prices[apt.id];
    return {
      ...apt,
      currentPrice: live?.price ?? apt.basePrice,
      areaName: live?.areaName ?? '',
      sizes: live?.sizes ?? null,
    };
  })
  .sort(
    (a, b) =>
      a.currentPrice - b.currentPrice || a.district.localeCompare(b.district, 'ko')
  );

const rows = apartments
  .map(
    (apt) => `
    <tr>
      <td>${escapeHtml(apt.district)}</td>
      <td>${escapeHtml(apt.name)}</td>
      <td>${formatPrice(apt.currentPrice)}</td>
      <td>${escapeHtml(formatSizeLabel(apt))}</td>
    </tr>`
  )
  .join('');

const bodyHtml = `
<section>
  <h1>${LABEL_TITLE}</h1>
  <p>${LABEL_DESC} / \uC5C5\uB370\uC774\uD2B8: ${escapeHtml(updatedAtKR)}</p>
  <table>
    <thead>
      <tr>
        <th>${LABEL_DISTRICT}</th>
        <th>${LABEL_NAME}</th>
        <th>${LABEL_PRICE}</th>
        <th>${LABEL_SIZE}</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>
</section>
`.trim();

const fullHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${LABEL_TITLE}</title>
  <style>
    body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #222; line-height: 1.6; margin: 32px auto; max-width: 920px; padding: 0 20px; }
    h1 { font-size: 30px; margin: 0 0 12px; }
    p { margin: 8px 0 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border: 1px solid #d9d9d9; padding: 10px 12px; text-align: left; }
    th { background: #f5f7fb; }
    tr:nth-child(even) td { background: #fcfcfc; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;

writeFileSync(
  './exports/naver-premium-tier12-simple-body.html',
  '\uFEFF' + bodyHtml,
  'utf8'
);
writeFileSync(
  './exports/naver-premium-tier12-simple-article.html',
  '\uFEFF' + fullHtml,
  'utf8'
);

console.log(
  JSON.stringify(
    {
      total: apartments.length,
      updatedAtKR,
    },
    null,
    2
  )
);
