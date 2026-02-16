#!/bin/bash

# Script de Rollback para Actualización de Prisma
# Uso: bash scripts/rollback-prisma-upgrade.sh

set -e

echo "⏪ Iniciando rollback a Prisma 6.5.0..."
echo ""

# Verificar que estamos en un branch de prueba
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "test/prisma-7-migration" ]; then
  echo "⚠️ ADVERTENCIA: No estás en el branch test/prisma-7-migration"
  echo "Branch actual: $CURRENT_BRANCH"
  read -p "¿Continuar con rollback? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 1. Descartar cambios no commiteados
echo "🗑️ Descartando cambios no guardados..."
git reset --hard

# 2. Volver a develop
echo "🔄 Volviendo a branch develop..."
git checkout develop

# 3. Eliminar branch de prueba (opcional)
read -p "¿Eliminar branch test/prisma-7-migration? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git branch -D test/prisma-7-migration 2>/dev/null || echo "Branch ya no existe"
fi

# 4. Reinstalar Prisma 6.5.0
echo "📦 Reinstalando Prisma 6.5.0..."
cd backend
npm install prisma@6.5.0 @prisma/client@6.5.0

# 5. Regenerar cliente
echo "🔧 Regenerando cliente de Prisma 6.5.0..."
npx prisma generate

# 6. Verificar instalación
echo "✅ Verificando instalación..."
npx prisma version

# 7. Compilar backend
echo "🔨 Compilando backend..."
npm run build

echo ""
echo "✅ Rollback completado exitosamente!"
echo "✅ Prisma 6.5.0 restaurado"
echo ""
echo "Puedes iniciar el servidor con: cd backend && npm run start:dev"
echo ""
