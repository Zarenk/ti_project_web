const fs = require('fs');
const path = require('path');
let AdmZip;
try {
  AdmZip = require('adm-zip');
} catch (err) {
  try {
    AdmZip = require(path.join(__dirname, '..', 'backend', 'node_modules', 'adm-zip'));
  } catch (innerErr) {
    console.error(
      'No se encontró adm-zip. Instálalo en la raíz o en backend: npm i adm-zip',
    );
    throw innerErr;
  }
}

const repoRoot = path.join(__dirname, '..');
const apiBase = process.env.API_BASE || 'http://localhost:4000/api';
const outDir = process.env.OUT_DIR || path.join(repoRoot, 'storage', 'sunat-tests');
const fixturePath =
  process.env.FIXTURE ||
  path.join(repoRoot, 'backend', 'src', 'guide', 'fixtures', 'gre-beta-sample.json');
const onlyValidate = process.env.ONLY_VALIDATE === 'true';

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function run() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const raw = fs.readFileSync(fixturePath, 'utf8').replace(/^\uFEFF/, '');
  const payload = JSON.parse(raw);

  console.log('[Guide] validate...');
  const validate = await postJson(`${apiBase}/guide/validate`, payload);
  console.log('[Guide] validate status:', validate.status);
  if (validate.status >= 400) {
    console.error(validate.data);
    process.exit(1);
  }
  if (validate.data?.xmlPreview) {
    fs.writeFileSync(path.join(outDir, 'preview.xml'), validate.data.xmlPreview, 'utf8');
  }

  if (onlyValidate) {
    console.log('[Guide] ONLY_VALIDATE=true, done.');
    return;
  }

  console.log('[Guide] send-rest...');
  const send = await postJson(`${apiBase}/guide/send-rest`, payload);
  console.log('[Guide] send-rest status:', send.status);
  if (send.status >= 400) {
    console.error(send.data);
    process.exit(1);
  }

  const b64 = send.data?.applicationResponse;
  if (!b64) {
    console.warn('[Guide] no applicationResponse in response');
    console.log(send.data);
    return;
  }

  const cdrZip = Buffer.from(b64, 'base64');
  const cdrZipPath = path.join(outDir, 'cdr.zip');
  fs.writeFileSync(cdrZipPath, cdrZip);

  const zip = new AdmZip(cdrZip);
  zip.extractAllTo(outDir, true);

  const entries = zip.getEntries().map((e) => e.entryName);
  console.log('[Guide] CDR entries:', entries);
  console.log('[Guide] output dir:', outDir);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
