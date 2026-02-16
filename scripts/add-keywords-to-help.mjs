#!/usr/bin/env node
/**
 * Script para agregar keywords automáticamente a entradas de ayuda
 * basándose en el contenido de la pregunta y respuesta.
 *
 * Uso: node scripts/add-keywords-to-help.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HELP_SECTIONS_DIR = resolve(__dirname, '../fronted/src/data/help/sections');

// Palabras clave comunes por módulo
const moduleKeywords = {
  sales: ['venta', 'factura', 'boleta', 'ticket', 'cliente', 'cobrar', 'pagar', 'monto', 'precio'],
  entries: ['ingreso', 'entrada', 'compra', 'proveedor', 'recepción', 'mercadería', 'almacén'],
  products: ['producto', 'artículo', 'item', 'precio', 'stock', 'código', 'sku', 'categoría', 'marca'],
  categories: ['categoría', 'clasificación', 'grupo', 'tipo', 'organizar'],
  providers: ['proveedor', 'supplier', 'distribuidor', 'contacto', 'ruc', 'razón social'],
  quotes: ['cotización', 'presupuesto', 'quote', 'proforma', 'cliente', 'productos'],
  inventory: ['inventario', 'stock', 'existencias', 'disponibilidad', 'cantidad', 'almacén'],
  users: ['usuario', 'user', 'rol', 'permisos', 'acceso', 'cuenta'],
  stores: ['tienda', 'almacén', 'sucursal', 'local', 'punto de venta'],
  cashregister: ['caja', 'cash', 'efectivo', 'apertura', 'cierre', 'arqueo'],
  accounting: ['contabilidad', 'asiento', 'cuenta', 'debe', 'haber', 'balance'],
  messages: ['mensaje', 'chat', 'conversación', 'responder', 'cliente'],
  orders: ['pedido', 'order', 'solicitud', 'procesar', 'despachar'],
  exchange: ['cambio', 'dólar', 'moneda', 'tasa', 'conversión'],
  catalog: ['catálogo', 'portada', 'exportar', 'pdf', 'productos'],
};

// Palabras a ignorar (stop words en español)
const stopWords = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'a', 'en', 'por', 'para', 'con', 'sin',
  'es', 'son', 'está', 'están', 'ser', 'estar',
  'y', 'o', 'pero', 'si', 'no',
  'que', 'como', 'donde', 'cuando', 'cual',
  'este', 'esta', 'estos', 'estas',
  'mi', 'tu', 'su', 'nuestro',
]);

/**
 * Extraer palabras clave de un texto
 */
function extractKeywords(text, moduleKey) {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover tildes
    .replace(/[¿?¡!.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalized.split(' ');
  const keywords = new Set();

  // Agregar palabras significativas del texto (3+ caracteres, no stop words)
  words.forEach(word => {
    if (word.length >= 3 && !stopWords.has(word)) {
      keywords.add(word);
    }
  });

  // Agregar keywords del módulo
  if (moduleKeywords[moduleKey]) {
    moduleKeywords[moduleKey].forEach(kw => keywords.add(kw));
  }

  return Array.from(keywords).slice(0, 15); // Máximo 15 keywords
}

/**
 * Procesar un archivo de sección
 */
function processSection(filePath) {
  console.log(`\nProcesando: ${filePath}`);

  const content = readFileSync(filePath, 'utf-8');

  // Detectar el módulo por el nombre del archivo
  const fileName = filePath.split(/[/\\]/).pop().replace('.ts', '');
  const moduleKey = fileName;

  // Encontrar todas las entradas en el archivo
  let modified = content;
  let addedCount = 0;

  // Patrón para encontrar entradas que NO tienen keywords
  const entryPattern = /{\s*id:\s*"([^"]+)",\s*question:\s*"([^"]+)",\s*(?:aliases:\s*\[[^\]]*\],\s*)?answer:\s*"([^"]+)",(?!\s*keywords:)/g;

  let match;
  const replacements = [];

  while ((match = entryPattern.exec(content)) !== null) {
    const [fullMatch, id, question, answer] = match;

    // Extraer keywords del question y answer
    const combinedText = `${question} ${answer}`;
    const keywords = extractKeywords(combinedText, moduleKey);

    console.log(`  - ${id}: ${keywords.length} keywords`);

    // Crear el nuevo texto con keywords
    const keywordsArray = keywords.map(k => `"${k}"`).join(', ');
    const newText = fullMatch.replace(
      /answer:\s*"([^"]+)",/,
      `answer:\n        "$1",\n      keywords: [${keywordsArray}],`
    );

    replacements.push({ old: fullMatch, new: newText });
    addedCount++;
  }

  // Aplicar todos los reemplazos
  replacements.forEach(({ old, new: newText }) => {
    modified = modified.replace(old, newText);
  });

  if (addedCount > 0) {
    writeFileSync(filePath, modified, 'utf-8');
    console.log(`  ✅ ${addedCount} entradas actualizadas`);
  } else {
    console.log(`  ℹ️  No se encontraron entradas sin keywords`);
  }

  return addedCount;
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Agregando keywords a entradas de ayuda...\n');

  const sections = [
    'sales.ts',
    'entries.ts',
    'products.ts',
    'categories.ts',
    'providers.ts',
    'quotes.ts',
    'inventory.ts',
    'users.ts',
    'stores.ts',
    'cashregister.ts',
    'accounting.ts',
    'messages.ts',
    'orders.ts',
    'exchange.ts',
    'catalog.ts',
    'general.ts',
  ];

  let totalAdded = 0;

  for (const section of sections) {
    const filePath = resolve(HELP_SECTIONS_DIR, section);
    try {
      const added = processSection(filePath);
      totalAdded += added;
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }

  console.log(`\n✅ Proceso completado!`);
  console.log(`   Total de entradas actualizadas: ${totalAdded}`);
  console.log(`\n💡 Próximos pasos:`);
  console.log(`   1. Revisa los archivos generados`);
  console.log(`   2. Ajusta keywords manualmente si es necesario`);
  console.log(`   3. Regenera help-kb-static.json: cd backend/ml && node export-help-kb.mjs`);
}

main().catch(console.error);
