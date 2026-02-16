#!/bin/bash

# Script de Prueba Automatizada para Upgrade de Prisma
# Uso: bash scripts/test-prisma-upgrade.sh

set -e

echo "🧪 Iniciando pruebas post-upgrade de Prisma..."
echo ""

cd backend

# 1. Verificar versión
echo "1️⃣ Verificando versión de Prisma..."
PRISMA_VERSION=$(npx prisma version | grep "prisma" | head -1 | awk '{print $3}')
echo "   Versión instalada: $PRISMA_VERSION"
if [[ $PRISMA_VERSION != 7.* ]]; then
  echo "   ❌ ERROR: Se esperaba Prisma 7.x, encontrado: $PRISMA_VERSION"
  exit 1
fi
echo "   ✅ Versión correcta"
echo ""

# 2. Validar schema
echo "2️⃣ Validando schema.prisma..."
npx prisma validate
echo "   ✅ Schema válido"
echo ""

# 3. Verificar que el cliente se generó
echo "3️⃣ Verificando cliente de Prisma..."
if [ ! -d "node_modules/.prisma/client" ]; then
  echo "   ❌ ERROR: Cliente de Prisma no encontrado"
  exit 1
fi
echo "   ✅ Cliente generado"
echo ""

# 4. Compilar backend
echo "4️⃣ Compilando backend..."
npm run build
if [ $? -ne 0 ]; then
  echo "   ❌ ERROR: Falló la compilación"
  exit 1
fi
echo "   ✅ Backend compilado"
echo ""

# 5. Ejecutar tests unitarios
echo "5️⃣ Ejecutando tests unitarios..."
npm run test 2>&1 | tee test-output.txt
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "   ⚠️ ADVERTENCIA: Algunos tests fallaron"
  echo "   Ver test-output.txt para detalles"
else
  echo "   ✅ Tests unitarios pasando"
fi
echo ""

# 6. Probar conexión a base de datos
echo "6️⃣ Probando conexión a base de datos..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => { console.log('   ✅ Conexión exitosa'); return prisma.\$disconnect(); })
  .catch((e) => { console.error('   ❌ ERROR:', e.message); process.exit(1); });
"
echo ""

# 7. Resumen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN DE PRUEBAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Versión: $PRISMA_VERSION"
echo "✅ Schema válido"
echo "✅ Cliente generado"
echo "✅ Backend compila"
echo "✅ Conexión a DB"
if [ -f "test-output.txt" ]; then
  FAILED_TESTS=$(grep -c "FAIL" test-output.txt || echo "0")
  if [ "$FAILED_TESTS" -gt 0 ]; then
    echo "⚠️ Tests: $FAILED_TESTS fallidos"
  else
    echo "✅ Tests pasando"
  fi
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Pruebas completadas!"
echo ""
echo "Siguiente paso: Iniciar servidor y probar manualmente"
echo "  npm run start:dev"
echo ""
