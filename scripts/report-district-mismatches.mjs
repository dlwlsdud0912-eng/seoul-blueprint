import fs from 'node:fs';
import catalogModule from '../src/data/catalog-apartments.ts';

const { CATALOG_APARTMENTS } = catalogModule;
const AUDIT_PATH = './tmp_crawl/complex-region-audit.json';
const OUTPUT_PATH = './tmp_crawl/district-code-mismatches.json';

const DISTRICT_BY_CODE = new Map(
  Object.entries({
    '11110': '\uC885\uB85C\uAD6C',
    '11140': '\uC911\uAD6C',
    '11170': '\uC6A9\uC0B0\uAD6C',
    '11200': '\uC131\uB3D9\uAD6C',
    '11215': '\uAD11\uC9C4\uAD6C',
    '11230': '\uB3D9\uB300\uBB38\uAD6C',
    '11260': '\uC911\uB791\uAD6C',
    '11290': '\uC131\uBD81\uAD6C',
    '11305': '\uAC15\uBD81\uAD6C',
    '11320': '\uB3C4\uBD09\uAD6C',
    '11350': '\uB178\uC6D0\uAD6C',
    '11380': '\uC740\uD3C9\uAD6C',
    '11410': '\uC11C\uB300\uBB38\uAD6C',
    '11440': '\uB9C8\uD3EC\uAD6C',
    '11470': '\uC591\uCC9C\uAD6C',
    '11500': '\uAC15\uC11C\uAD6C',
    '11530': '\uAD6C\uB85C\uAD6C',
    '11545': '\uAE08\uCC9C\uAD6C',
    '11560': '\uC601\uB4F1\uD3EC\uAD6C',
    '11590': '\uB3D9\uC791\uAD6C',
    '11620': '\uAD00\uC545\uAD6C',
    '11650': '\uC11C\uCD08\uAD6C',
    '11680': '\uAC15\uB0A8\uAD6C',
    '11710': '\uC1A1\uD30C\uAD6C',
    '11740': '\uAC15\uB3D9\uAD6C',
  })
);

const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
const byComplexId = new Map(
  audit
    .filter((row) => row.status === 'ok')
    .map((row) => [String(row.complexId), row])
);

const mismatches = [];
const unresolved = [];

for (const apartment of CATALOG_APARTMENTS) {
  if (!apartment.naverComplexId) continue;

  const row = byComplexId.get(String(apartment.naverComplexId));
  if (!row?.cortarNo) continue;

  const districtCode = String(row.cortarNo).slice(0, 5);
  const expectedDistrict = DISTRICT_BY_CODE.get(districtCode);

  if (!expectedDistrict) {
    unresolved.push({
      id: apartment.id,
      name: apartment.name,
      district: apartment.district,
      complexId: apartment.naverComplexId,
      cortarNo: row.cortarNo,
      complexName: row.complexName,
    });
    continue;
  }

  if (apartment.district !== expectedDistrict) {
    mismatches.push({
      id: apartment.id,
      name: apartment.name,
      district: apartment.district,
      expectedDistrict,
      complexId: apartment.naverComplexId,
      cortarNo: row.cortarNo,
      complexName: row.complexName,
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mismatches,
  unresolved,
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf8');

console.log(
  JSON.stringify(
    {
      mismatchCount: mismatches.length,
      unresolvedCount: unresolved.length,
      output: OUTPUT_PATH,
    },
    null,
    2
  )
);
