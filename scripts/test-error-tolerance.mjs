#!/usr/bin/env node
/**
 * Demo del sistema mejorado de tolerancia a errores
 * Muestra cómo el sistema maneja errores ortográficos, typos y consultas ambiguas
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const kbPath = resolve(__dirname, '../backend/ml/help-kb-static.json');

// Errores comunes de escritura
const commonTypos = {
  "aser": "hacer", "ago": "hago", "benta": "venta", "bendo": "vendo",
  "nesesito": "necesito", "quero": "quiero", "beo": "veo",
  "stok": "stock", "inbentario": "inventario", "fatura": "factura",
  "clente": "cliente", "prodcuto": "producto", "categria": "categoría",
};

function autoCorrect(query) {
  const words = query.toLowerCase().split(/\s+/);
  const corrected = words.map(word => {
    const clean = word.replace(/[¿?¡!.,;:]/g, "");
    return commonTypos[clean] || word;
  });
  return corrected.join(" ");
}

function levenshteinDistance(s1, s2) {
  const len1 = s1.length, len2 = s2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

function similarity(s1, s2) {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(s1, s2) / maxLen;
}

function findMatches(query, entries) {
  const corrected = autoCorrect(query);
  const wasAutoCorrected = corrected !== query.toLowerCase();

  const results = [];

  entries.forEach(entry => {
    let bestScore = 0;
    let matchType = "";

    // Búsqueda en pregunta y aliases
    const textsToCheck = [entry.question, ...(entry.aliases || [])];

    textsToCheck.forEach(text => {
      const sim = similarity(corrected.toLowerCase(), text.toLowerCase());
      if (sim > bestScore) {
        bestScore = sim;
        matchType = sim > 0.9 ? "exact" : sim > 0.7 ? "high" : "fuzzy";
      }
    });

    // Boost por keywords
    if (entry.keywords) {
      const queryWords = corrected.split(/\s+/);
      const matchingKeywords = entry.keywords.filter(kw =>
        queryWords.some(word => kw.toLowerCase().includes(word) || word.includes(kw.toLowerCase()))
      );
      if (matchingKeywords.length > 0) {
        bestScore += 0.2;
      }
    }

    if (bestScore > 0.5) {
      results.push({
        entry,
        score: bestScore,
        matchType,
        wasAutoCorrected
      });
    }
  });

  return results.sort((a, b) => b.score - a.score);
}

console.log('🧪 Demo: Tolerancia a Errores y Auto-Corrección\n');
console.log('='.repeat(70));

const entries = JSON.parse(readFileSync(kbPath, 'utf-8'));

const testCases = [
  {
    category: '❌ Errores Ortográficos Comunes',
    tests: [
      { original: 'como ago una benta', corrected: 'como hago una venta' },
      { original: 'nesesito bender', corrected: 'necesito vender' },
      { original: 'quero ber el stok', corrected: 'quiero ver el stock' },
      { original: 'como creo un clente', corrected: 'como creo un cliente' },
    ]
  },
  {
    category: '⌨️ Typos de Teclado',
    tests: [
      { original: 'venta de prodcutos', corrected: 'venta de productos' },
      { original: 'inbentario', corrected: 'inventario' },
      { original: 'fatura electronica', corrected: 'factura electronica' },
      { original: 'provedor nuevo', corrected: 'proveedor nuevo' },
    ]
  },
  {
    category: '🔤 Variaciones de Escritura',
    tests: [
      { original: 'COMO HAGO UNA VENTA', corrected: 'como hago una venta' },
      { original: 'cOmO cReO uN pRoDuCtO', corrected: 'como creo un producto' },
      { original: 'VeNtA!!!', corrected: 'venta' },
    ]
  },
  {
    category: '🗣️ Lenguaje Coloquial',
    tests: [
      { original: 'como bendo algo', corrected: 'como vendo algo' },
      { original: 'nesesito facturar ya', corrected: 'necesito facturar ya' },
      { original: 'quero cobrar', corrected: 'quiero cobrar' },
    ]
  },
  {
    category: '🌐 Spanglish Tech',
    tests: [
      { original: 'como deleteo un producto', corrected: 'como elimino un producto' },
      { original: 'necesito updatear precios', corrected: 'necesito actualizar precios' },
      { original: 'como printeo una factura', corrected: 'como imprimo una factura' },
    ]
  },
];

testCases.forEach(({ category, tests }) => {
  console.log(`\n${category}`);
  console.log('-'.repeat(70));

  tests.forEach(({ original, corrected }) => {
    const autoC = autoCorrect(original);
    const matches = findMatches(original, entries);

    console.log(`\n📝 Original:   "${original}"`);
    console.log(`✅ Corregido:  "${corrected}"`);
    console.log(`🤖 Auto-fix:   "${autoC}"`);
    console.log(`🎯 Coincide:   ${autoC === corrected ? '✓ Sí' : '✗ No'}`);

    if (matches.length > 0) {
      const top = matches[0];
      const scoreBar = '█'.repeat(Math.round(top.score * 20));
      console.log(`🔍 Resultado:  [${scoreBar.padEnd(20)}] ${(top.score * 100).toFixed(0)}%`);
      console.log(`   "${top.entry.question.substring(0, 60)}..."`);
      if (top.wasAutoCorrected) {
        console.log(`   💡 Corrección automática aplicada`);
      }
    } else {
      console.log(`🔍 Resultado:  ❌ Sin coincidencias`);
    }
  });
});

console.log('\n' + '='.repeat(70));
console.log('📊 Estadísticas de Corrección\n');

let totalTests = 0;
let correctionsApplied = 0;
let successfulMatches = 0;

testCases.forEach(({ tests }) => {
  tests.forEach(({ original }) => {
    totalTests++;
    const autoC = autoCorrect(original);
    if (autoC !== original.toLowerCase()) correctionsApplied++;

    const matches = findMatches(original, entries);
    if (matches.length > 0 && matches[0].score > 0.7) successfulMatches++;
  });
});

console.log(`Total de pruebas:           ${totalTests}`);
console.log(`Correcciones aplicadas:     ${correctionsApplied} (${Math.round(correctionsApplied / totalTests * 100)}%)`);
console.log(`Búsquedas exitosas:         ${successfulMatches} (${Math.round(successfulMatches / totalTests * 100)}%)`);

const improvement = successfulMatches / totalTests;
console.log(`\n🎯 Tasa de éxito:            ${(improvement * 100).toFixed(1)}%`);

if (improvement >= 0.8) {
  console.log(`\n✨ ¡Excelente! El sistema maneja muy bien los errores.`);
} else if (improvement >= 0.6) {
  console.log(`\n✅ Bueno. El sistema tolera la mayoría de errores comunes.`);
} else {
  console.log(`\n⚠️  Se puede mejorar la tolerancia a errores.`);
}

console.log('\n💡 Tip: El sistema ahora corrige automáticamente errores comunes');
console.log('   y sugiere alternativas cuando la consulta no es clara.\n');
