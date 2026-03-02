/**
 * Genera un archivo de cache con embeddings pre-computados para producción.
 *
 * Ejecutar localmente (requiere Python + sentence_transformers):
 *   npx ts-node scripts/generate-help-embeddings-cache.ts
 *
 * Genera: ml/help-embeddings-cache.json
 * Este archivo se commitea y se despliega con el código. En producción,
 * si Python no está disponible, el servicio carga los embeddings desde aquí.
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

interface KBEntry {
  sourceId: string;
  sourceType: 'static' | 'promoted';
  section: string;
  question: string;
  answer: string;
  aliases?: string[];
}

interface CacheEntry {
  sourceId: string;
  sourceType: string;
  section: string;
  question: string;
  answer: string;
  embedding: number[];
}

const KB_PATH = path.resolve(__dirname, '../ml/help-kb-static.json');
const SCRIPT_PATH = path.resolve(__dirname, '../ml/help_embeddings.py');
const CACHE_PATH = path.resolve(__dirname, '../ml/help-embeddings-cache.json');

function encodeBatch(texts: string[]): Promise<number[][] | null> {
  return new Promise((resolve) => {
    const proc = spawn('python', [SCRIPT_PATH, 'encode-batch'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python failed (code ${code}): ${stderr.slice(0, 500)}`);
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(stdout) as number[][]);
      } catch {
        console.error(`Failed to parse: ${stdout.slice(0, 200)}`);
        resolve(null);
      }
    });

    proc.on('error', (err) => {
      console.error(`Spawn error: ${err.message}`);
      resolve(null);
    });

    proc.stdin.write(JSON.stringify(texts));
    proc.stdin.end();
  });
}

async function main() {
  if (!existsSync(KB_PATH)) {
    console.error(`KB file not found: ${KB_PATH}`);
    process.exit(1);
  }
  if (!existsSync(SCRIPT_PATH)) {
    console.error(`Python script not found: ${SCRIPT_PATH}`);
    process.exit(1);
  }

  const entries: KBEntry[] = JSON.parse(readFileSync(KB_PATH, 'utf-8'));
  console.log(`Loaded ${entries.length} KB entries`);

  // Build texts the same way the service does
  const texts = entries.map((e) => {
    const parts = [e.question];
    if (e.aliases && e.aliases.length > 0) {
      parts.push(e.aliases.join(', '));
    }
    return parts.join(' — ');
  });

  console.log('Generating embeddings via Python (this may take ~15 seconds)...');
  const embeddings = await encodeBatch(texts);

  if (!embeddings || embeddings.length !== entries.length) {
    console.error(
      `Embedding count mismatch: expected ${entries.length}, got ${embeddings?.length ?? 0}`,
    );
    process.exit(1);
  }

  // Build cache
  const cache: CacheEntry[] = entries.map((entry, i) => ({
    sourceId: entry.sourceId,
    sourceType: entry.sourceType,
    section: entry.section,
    question: entry.question,
    answer: entry.answer,
    embedding: embeddings[i],
  }));

  writeFileSync(CACHE_PATH, JSON.stringify(cache));

  const sizeKB = (Buffer.byteLength(JSON.stringify(cache)) / 1024).toFixed(1);
  console.log(`Cache written: ${CACHE_PATH}`);
  console.log(`  ${cache.length} entries, ${sizeKB} KB`);
  console.log(`  Embedding dimensions: ${embeddings[0].length}`);
  console.log('\nDone. Commit ml/help-embeddings-cache.json with the code.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
