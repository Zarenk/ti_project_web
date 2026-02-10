#!/bin/bash

# Script de Backup Antes de Actualizar Prisma
# Uso: bash scripts/backup-before-prisma-upgrade.sh

set -e  # Salir si hay error

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/prisma-upgrade-$TIMESTAMP"

echo "🔒 Iniciando backup antes de actualización de Prisma..."
echo "📁 Directorio de backup: $BACKUP_DIR"
echo ""

# Crear directorio de backup
mkdir -p "$BACKUP_DIR"

# 1. Backup de package.json y package-lock.json
echo "📦 Backup de package.json..."
cp backend/package.json "$BACKUP_DIR/package.json.bak"
cp backend/package-lock.json "$BACKUP_DIR/package-lock.json.bak" 2>/dev/null || echo "⚠️ No se encontró package-lock.json"

# 2. Backup de schema.prisma
echo "📋 Backup de schema.prisma..."
cp backend/prisma/schema.prisma "$BACKUP_DIR/schema.prisma.bak"

# 3. Backup de prisma.service.ts
echo "🔧 Backup de prisma.service.ts..."
cp backend/src/prisma/prisma.service.ts "$BACKUP_DIR/prisma.service.ts.bak"

# 4. Listar versiones actuales
echo "📊 Guardando versiones actuales..."
cd backend
npm list prisma @prisma/client > "../$BACKUP_DIR/versions.txt" 2>&1 || true
npx prisma version >> "../$BACKUP_DIR/versions.txt" 2>&1 || true
cd ..

# 5. Crear commit de seguridad
echo "💾 Creando commit de seguridad..."
git add .
git commit -m "backup: antes de actualización a Prisma 7.x (automated backup $TIMESTAMP)" || echo "⚠️ No hay cambios para commitear"

# 6. Crear tag
echo "🏷️ Creando tag de seguridad..."
git tag -a "backup-prisma6-$TIMESTAMP" -m "Backup automático antes de actualizar a Prisma 7.x"

echo ""
echo "✅ Backup completado exitosamente!"
echo ""
echo "📍 Backup guardado en: $BACKUP_DIR"
echo "🏷️ Tag creado: backup-prisma6-$TIMESTAMP"
echo ""
echo "Para restaurar este backup:"
echo "  git checkout backup-prisma6-$TIMESTAMP"
echo "  cd backend && npm install"
echo ""
