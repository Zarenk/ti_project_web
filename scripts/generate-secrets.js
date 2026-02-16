#!/usr/bin/env node

/**
 * Script para generar credenciales seguras
 *
 * Uso:
 *   node scripts/generate-secrets.js
 *
 * Genera:
 *   - JWT_SECRET (64 caracteres base64)
 *   - Database passwords (32 caracteres)
 *   - Admin password temporal (16 caracteres)
 */

const crypto = require('crypto');

console.log('\n🔐 GENERADOR DE CREDENCIALES SEGURAS\n');
console.log('=' .repeat(70));

// Generar JWT Secret (64 bytes = ~86 caracteres base64)
const jwtSecret = crypto.randomBytes(64).toString('base64');
console.log('\n✅ JWT_SECRET (Copiar en backend/.env y fronted/.env):');
console.log('─'.repeat(70));
console.log(`JWT_SECRET='${jwtSecret}'`);

// Generar contraseña de base de datos
const dbPassword = crypto.randomBytes(24).toString('base64').replace(/[\/\+=]/g, '_');
console.log('\n✅ DATABASE_PASSWORD (Contraseña fuerte para PostgreSQL):');
console.log('─'.repeat(70));
console.log(dbPassword);
console.log('\nEjemplo de uso:');
console.log(`DATABASE_URL="postgresql://postgres:${dbPassword}@localhost:5432/tu_db?schema=public"`);

// Generar contraseña de admin temporal
const adminPassword = crypto.randomBytes(12).toString('base64').replace(/[\/\+=]/g, '_');
console.log('\n✅ DEFAULT_ADMIN_PASSWORD (Temporal - cambiar después del primer login):');
console.log('─'.repeat(70));
console.log(adminPassword);

// Generar contraseña adicional (uso general)
const generalPassword = crypto.randomBytes(16).toString('base64').replace(/[\/\+=]/g, '_');
console.log('\n✅ CONTRASEÑA GENERAL (Para SUNAT, SMTP u otros servicios):');
console.log('─'.repeat(70));
console.log(generalPassword);

// Información adicional
console.log('\n' + '='.repeat(70));
console.log('📝 NOTAS IMPORTANTES:\n');
console.log('1. Copia cada credencial en tu archivo .env correspondiente');
console.log('2. NUNCA compartas estas credenciales ni las subas a git');
console.log('3. Usa credenciales diferentes para desarrollo y producción');
console.log('4. Guarda estas credenciales en un gestor de contraseñas seguro');
console.log('5. La contraseña de admin es TEMPORAL - cámbiala tras el primer login');
console.log('\n🔒 Estas credenciales son únicas y no se guardan en ningún archivo.\n');
console.log('=' .repeat(70) + '\n');

// Opcional: Verificar si los archivos .env existen
const fs = require('fs');
const path = require('path');

const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
const frontendEnvPath = path.join(__dirname, '..', 'fronted', '.env');

console.log('📁 VERIFICACIÓN DE ARCHIVOS:\n');

if (fs.existsSync(backendEnvPath)) {
  console.log('✅ backend/.env existe');
} else {
  console.log('⚠️  backend/.env NO existe - copia desde backend/.env.example');
}

if (fs.existsSync(frontendEnvPath)) {
  console.log('✅ fronted/.env existe');
} else {
  console.log('⚠️  fronted/.env NO existe - copia desde fronted/.env.example');
}

console.log('\n' + '='.repeat(70));
console.log('\n💡 PRÓXIMOS PASOS:\n');
console.log('1. Copia las credenciales generadas arriba');
console.log('2. Actualiza tus archivos .env (backend y frontend)');
console.log('3. Reinicia los servidores:');
console.log('   - Backend: cd backend && npm run start:dev');
console.log('   - Frontend: cd fronted && npm run dev');
console.log('4. Cambia la contraseña del admin tras el primer login\n');
