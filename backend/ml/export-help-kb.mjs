#!/usr/bin/env node
/**
 * Exporta la base de conocimiento estatica del frontend a JSON
 * para que el servicio de embeddings pueda indexarla.
 *
 * Uso: node backend/ml/export-help-kb.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const SECTIONS_DIR = resolve(
  import.meta.dirname ?? '.',
  '../../fronted/src/data/help/sections',
);
const OUTPUT = resolve(import.meta.dirname ?? '.', 'help-kb-static.json');

function extractEntries(filePath) {
  const content = readFileSync(filePath, 'utf-8');

  // Extract section id (first id: in the file is the section id)
  const sectionMatch = content.match(/id:\s*"([^"]+)"/);
  const sectionId = sectionMatch ? sectionMatch[1] : 'unknown';

  const entries = [];

  // Split by entry blocks — each entry starts with { and has an id field
  // Use a simpler approach: find all id/question/aliases/answer groups
  const idRegex = /id:\s*"([^"]+)"/g;
  const ids = [];
  let m;
  while ((m = idRegex.exec(content)) !== null) {
    ids.push({ id: m[1], index: m.index });
  }

  // Skip the first id (it's the section id)
  const entryIds = ids.slice(1);

  for (let i = 0; i < entryIds.length; i++) {
    const start = entryIds[i].index;
    const end = i + 1 < entryIds.length ? entryIds[i + 1].index : content.length;
    const block = content.slice(start, end);

    const entryId = entryIds[i].id;

    // Extract question (always double-quoted)
    const questionMatch = block.match(/question:\s*"([^"]+)"/);
    if (!questionMatch) continue;
    const question = questionMatch[1];

    // Extract aliases block
    const aliasBlockMatch = block.match(/aliases:\s*\[([\s\S]*?)\]/);
    const aliases = [];
    if (aliasBlockMatch) {
      const aliasRegex = /"([^"]+)"/g;
      let aliasMatch;
      while ((aliasMatch = aliasRegex.exec(aliasBlockMatch[1])) !== null) {
        aliases.push(aliasMatch[1]);
      }
    }

    // Extract answer — handle multiline double-quoted string
    // The answer field looks like: answer:\n        "some text...",
    const answerMatch = block.match(/answer:\s*\n?\s*"([\s\S]*?)(?:(?<!\\)")/);
    if (!answerMatch) continue;
    const answer = answerMatch[1].replace(/\\n/g, '\n').trim();

    // Extract keywords array (optional)
    const keywords = [];
    const keywordsBlockMatch = block.match(/keywords:\s*\[([\s\S]*?)\]/);
    if (keywordsBlockMatch) {
      const keywordRegex = /"([^"]+)"/g;
      let keywordMatch;
      while ((keywordMatch = keywordRegex.exec(keywordsBlockMatch[1])) !== null) {
        keywords.push(keywordMatch[1]);
      }
    }

    // Extract steps array (optional)
    const steps = [];
    const stepsBlockMatch = block.match(/steps:\s*\[([\s\S]*?)\],/);
    if (stepsBlockMatch) {
      // Extract each { text: "...", image: "..." } object
      const stepObjRegex = /\{\s*text:\s*"([^"]+)"(?:\s*,\s*image:\s*"([^"]+)")?\s*\}/g;
      let stepMatch;
      while ((stepMatch = stepObjRegex.exec(stepsBlockMatch[1])) !== null) {
        const step = { text: stepMatch[1] };
        if (stepMatch[2]) step.image = stepMatch[2];
        steps.push(step);
      }
    }

    const entry = {
      sourceId: entryId,
      sourceType: 'static',
      section: sectionId,
      question,
      answer,
      aliases,
    };
    if (keywords.length > 0) entry.keywords = keywords;
    if (steps.length > 0) entry.steps = steps;
    entries.push(entry);
  }

  return entries;
}

function main() {
  const files = readdirSync(SECTIONS_DIR).filter((f) => f.endsWith('.ts'));
  const allEntries = [];

  for (const file of files) {
    const filePath = join(SECTIONS_DIR, file);
    const entries = extractEntries(filePath);
    allEntries.push(...entries);
    console.log(`  ${file}: ${entries.length} entries`);
  }

  writeFileSync(OUTPUT, JSON.stringify(allEntries, null, 2), 'utf-8');
  console.log(`\nTotal: ${allEntries.length} entries -> ${OUTPUT}`);
}

main();
