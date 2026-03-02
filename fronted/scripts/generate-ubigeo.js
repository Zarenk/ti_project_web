const fs = require('fs');
const path = require('path');
const data = require('../node_modules/ubigeo-peru/src/ubigeo-inei.json');

const keys = Object.keys(data).sort((a, b) => Number(a) - Number(b));

const deptMap = {};
const provMap = {};
const districts = [];

// First pass: collect departments and provinces
keys.forEach((k) => {
  const entry = data[k];
  const dCode = entry.departamento;
  const pCode = dCode + entry.provincia;

  if (entry.provincia === '00' && entry.distrito === '00') {
    if (!(dCode in deptMap)) deptMap[dCode] = entry.nombre;
  } else if (entry.distrito === '00') {
    if (!(pCode in provMap)) provMap[pCode] = entry.nombre;
  }
});

// Fix known data issue: Amazonas dept 01, province 02 (Bagua) may be missing
// because the data has a duplicate department-level entry
if (!provMap['0102']) provMap['0102'] = 'Bagua';

// Second pass: collect districts
keys.forEach((k) => {
  const entry = data[k];
  const dCode = entry.departamento;
  const pCode = dCode + entry.provincia;
  const fullCode = pCode + entry.distrito;

  if (entry.distrito !== '00' && entry.provincia !== '00') {
    const provincia = provMap[pCode] || entry.nombre;
    const departamento = deptMap[dCode] || '';
    districts.push({
      c: fullCode,
      d: entry.nombre,
      p: provincia,
      dp: departamento,
    });
  }
});

// Verify no empty provinces
const emptyProv = districts.filter((d) => !d.p);
if (emptyProv.length > 0) {
  console.warn('WARNING: Districts with empty provincia:', emptyProv.length);
  emptyProv.slice(0, 5).forEach((d) => console.warn(' ', d.c, d.d, d.dp));
}

console.log('Total districts:', districts.length);
console.log('Departments:', Object.keys(deptMap).length);
console.log('Provinces:', Object.keys(provMap).length);

// Generate TS file
let ts = '// Auto-generated from ubigeo-peru/ubigeo-inei.json\n';
ts += '// ' + districts.length + ' districts of Peru with INEI codes (SUNAT Catalogo 13)\n';
ts +=
  '// Format: { c: code (6 digits), d: distrito, p: provincia, dp: departamento }\n\n';
ts +=
  'export interface UbigeoEntry {\n  c: string;\n  d: string;\n  p: string;\n  dp: string;\n}\n\n';
ts += 'export const UBIGEO_DATA: UbigeoEntry[] = ' + JSON.stringify(districts) + ';\n';

const outPath = path.join(__dirname, '..', 'src', 'lib', 'ubigeo-data.ts');
fs.writeFileSync(outPath, ts);
console.log(
  'Written',
  outPath,
  '(' + (ts.length / 1024).toFixed(1) + ' KB)',
);
