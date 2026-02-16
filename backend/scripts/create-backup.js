#!/usr/bin/env node

/**
 * Script para crear backup de PostgreSQL sin necesidad de pg_dump
 * Usa el paquete pg para conectarse y ejecutar pg_dump en Railway
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Obtener DATABASE_URL de las variables de entorno
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está configurada');
  console.error('');
  console.error('Ejecuta:');
  console.error('  railway run node scripts/create-backup.js');
  process.exit(1);
}

console.log('🔍 Creando backup de la base de datos...');
console.log('');

// Generar nombre de archivo con timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const filename = `backup-railway-${timestamp}.sql`;
const filepath = path.join(__dirname, '..', filename);

// Comando pg_dump - Railway tiene pg_dump disponible
const command = `pg_dump "${DATABASE_URL}"`;

console.log(`📝 Archivo: ${filename}`);
console.log('⏳ Esto puede tomar 1-2 minutos...');
console.log('');

// Ejecutar pg_dump y guardar en archivo
exec(command, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ ERROR al crear backup:');
    console.error(error.message);
    if (stderr) {
      console.error('');
      console.error('Detalles:');
      console.error(stderr);
    }
    process.exit(1);
  }

  // Guardar stdout en archivo
  fs.writeFileSync(filepath, stdout, 'utf8');

  // Verificar tamaño
  const stats = fs.statSync(filepath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('✅ Backup creado exitosamente!');
  console.log('');
  console.log(`📁 Ubicación: ${filepath}`);
  console.log(`📊 Tamaño: ${fileSizeMB} MB`);
  console.log('');
  console.log('🔒 IMPORTANTE: No commitear este archivo a Git!');
  console.log('   Muévelo a un lugar seguro fuera del proyecto.');
});
