#!/bin/bash

# =====================================================
# Script de Pre-Deploy para Railway
# =====================================================
# Este script se ejecuta ANTES de las migraciones
# Asegura que el schema esté listo para prisma migrate
# =====================================================

set -e  # Salir si hay algún error

echo "========================================"
echo "🔍 Pre-Deploy Safety Check"
echo "========================================"
echo ""

# Verificar que DATABASE_URL esté configurada
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está configurada"
    exit 1
fi

echo "✅ DATABASE_URL configurada"
echo ""

# Ejecutar script de seguridad
echo "📝 Ejecutando verificación de schema..."
echo ""

npx prisma db execute --file ./scripts/deploy-schema-verify.sql

RESULT=$?

echo ""
if [ $RESULT -eq 0 ]; then
    echo "========================================"
    echo "✅ Pre-Deploy Safety Check COMPLETADO"
    echo "========================================"
    echo ""
    echo "El schema está listo para migraciones"
    echo ""
    exit 0
else
    echo "========================================"
    echo "❌ Pre-Deploy Safety Check FALLÓ"
    echo "========================================"
    echo ""
    echo "Revisar logs arriba para detalles"
    echo ""
    exit 1
fi
