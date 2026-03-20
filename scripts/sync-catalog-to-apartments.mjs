import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import * as rawMod from '../src/data/apartments.ts';
import * as catalogMod from '../src/data/catalog-apartments.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apartmentsFilePath = path.join(__dirname, '..', 'src', 'data', 'apartments.ts');

const APARTMENTS = rawMod.default.APARTMENTS;
const CATALOG_APARTMENTS = catalogMod.default.CATALOG_APARTMENTS;

function escapeString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function formatValue(value) {
  if (typeof value === 'string') return `'${escapeString(value)}'`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return 'null';
  throw new Error(`Unsupported value type: ${typeof value}`);
}

function formatApartment(apartment) {
  const orderedEntries = [
    ['id', apartment.id],
    ['name', apartment.name],
    ['district', apartment.district],
    ['size', apartment.size],
    ['basePrice', apartment.basePrice],
    ['tier', apartment.tier],
    ['naverComplexId', apartment.naverComplexId],
  ];

  if (apartment.note) {
    orderedEntries.push(['note', apartment.note]);
  }

  const body = orderedEntries
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join(', ');

  return `  { ${body} }`;
}

function main() {
  const content = [
    "import { Apartment } from '@/types';",
    '',
    'export const APARTMENTS: Apartment[] = [',
    CATALOG_APARTMENTS.map(formatApartment).join(',\n'),
    '];',
    '',
  ].join('\n');

  fs.writeFileSync(apartmentsFilePath, content, 'utf-8');
  console.log(`Synced apartments.ts from canonical catalog (${APARTMENTS.length} -> ${CATALOG_APARTMENTS.length})`);
}

main();
