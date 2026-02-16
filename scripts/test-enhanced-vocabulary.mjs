#!/usr/bin/env node
/**
 * Script de demostración del sistema de vocabulario expandido.
 * Prueba consultas en español con diferentes variaciones.
 *
 * Uso: node scripts/test-enhanced-vocabulary.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar el knowledge base
const kbPath = resolve(__dirname, '../backend/ml/help-kb-static.json');
const entries = JSON.parse(readFileSync(kbPath, 'utf-8'));

console.log('🧪 Probando Sistema de Vocabulario Expandido\n');
console.log(`📚 Cargadas ${entries.length} entradas de ayuda\n`);

// Función simple de normalización
function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Función de matching simple basada en keywords
function findMatches(query) {
  const normalizedQuery = normalize(query);
  const queryWords = normalizedQuery.split(' ');

  const results = [];

  entries.forEach(entry => {
    let score = 0;

    // 1. Check question
    if (normalize(entry.question).includes(normalizedQuery)) {
      score += 1.0;
    }

    // 2. Check aliases
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        if (normalize(alias).includes(normalizedQuery) || normalizedQuery.includes(normalize(alias))) {
          score += 0.9;
          break;
        }
      }
    }

    // 3. Check keywords
    if (entry.keywords) {
      const matchingKeywords = entry.keywords.filter(kw =>
        queryWords.some(word => normalize(kw).includes(word) || word.includes(normalize(kw)))
      );
      if (matchingKeywords.length > 0) {
        score += 0.3 + (matchingKeywords.length / entry.keywords.length) * 0.4;
      }
    }

    // 4. Word overlap
    const answerWords = normalize(entry.answer).split(' ');
    const commonWords = queryWords.filter(word =>
      word.length > 3 && answerWords.includes(word)
    );
    if (commonWords.length > 0) {
      score += commonWords.length * 0.1;
    }

    if (score > 0.3) {
      results.push({ entry, score });
    }
  });

  return results.sort((a, b) => b.score - a.score);
}

// Casos de prueba
const testCases = [
  {
    category: '🎯 Coincidencias Exactas',
    queries: [
      'Como registro una nueva venta',
      'Como consulto el historial de ventas',
      'Como creo un nuevo producto',
    ]
  },
  {
    category: '💬 Variaciones Coloquiales',
    queries: [
      'como vendo algo',
      'necesito facturar',
      'quiero cobrar a un cliente',
      'como agrego un producto',
    ]
  },
  {
    category: '🇵🇪 Términos Regionales (Perú)',
    queries: [
      'como saco una boleta',
      'emitir comprobante',
      'hacer una factura',
    ]
  },
  {
    category: '🔍 Búsqueda por Keywords',
    queries: [
      'inventario',
      'stock',
      'producto',
      'proveedor',
      'cotizacion',
    ]
  },
  {
    category: '🎨 Intención de Usuario',
    queries: [
      'como creo una categoria',
      'necesito modificar un precio',
      'quiero ver el stock',
      'donde elimino un producto',
    ]
  },
  {
    category: '❌ Errores Ortográficos',
    queries: [
      'como ago una venta',
      'nesesito facturar',
      'bentana',
    ]
  },
];

// Ejecutar tests
testCases.forEach(({ category, queries }) => {
  console.log(`\n${category}`);
  console.log('='.repeat(60));

  queries.forEach(query => {
    const results = findMatches(query);

    console.log(`\n📝 Consulta: "${query}"`);

    if (results.length === 0) {
      console.log('   ❌ Sin resultados');
    } else {
      const topResults = results.slice(0, 3);
      topResults.forEach((result, i) => {
        const icon = i === 0 ? '✅' : '  ';
        const scoreBar = '█'.repeat(Math.round(result.score * 10));
        console.log(
          `   ${icon} [${scoreBar.padEnd(10)}] ${(result.score * 100).toFixed(0)}% - ${result.entry.question}`
        );
      });

      // Mostrar keywords del mejor resultado
      if (topResults[0].entry.keywords) {
        const keywords = topResults[0].entry.keywords.slice(0, 8).join(', ');
        console.log(`      🏷️  Keywords: ${keywords}...`);
      }
    }
  });

  console.log('');
});

// Estadísticas finales
console.log('\n' + '='.repeat(60));
console.log('📊 Estadísticas del Sistema\n');

const totalKeywords = entries.reduce((sum, e) => sum + (e.keywords?.length || 0), 0);
const avgKeywords = (totalKeywords / entries.length).toFixed(1);
const entriesWithSteps = entries.filter(e => e.steps && e.steps.length > 0).length;
const avgAliases = (entries.reduce((sum, e) => sum + (e.aliases?.length || 0), 0) / entries.length).toFixed(1);

console.log(`Total de entradas:           ${entries.length}`);
console.log(`Keywords totales:            ${totalKeywords}`);
console.log(`Promedio keywords/entrada:   ${avgKeywords}`);
console.log(`Entradas con guías visuales: ${entriesWithSteps}`);
console.log(`Promedio aliases/entrada:    ${avgAliases}`);

const totalSearchTerms = entries.reduce((sum, e) =>
  sum + 1 + (e.aliases?.length || 0) + (e.keywords?.length || 0), 0
);
console.log(`\n🎯 Términos de búsqueda:      ${totalSearchTerms}`);
console.log(`   (question + aliases + keywords)\n`);

console.log('✅ Prueba completada!');
console.log('\n💡 Tip: Los resultados con score >= 70% se consideran coincidencias fuertes.');
console.log('   El sistema frontend responderá inmediatamente sin consultar el backend.\n');
