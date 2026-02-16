# Script de Backup Antes de Actualizar Prisma (PowerShell)
# Uso: .\scripts\backup-before-prisma-upgrade.ps1

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups\prisma-upgrade-$timestamp"

Write-Host "🔒 Iniciando backup antes de actualización de Prisma..." -ForegroundColor Green
Write-Host "📁 Directorio de backup: $backupDir" -ForegroundColor Cyan
Write-Host ""

# Crear directorio de backup
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# 1. Backup de package.json y package-lock.json
Write-Host "📦 Backup de package.json..." -ForegroundColor Yellow
Copy-Item "backend\package.json" "$backupDir\package.json.bak"
if (Test-Path "backend\package-lock.json") {
    Copy-Item "backend\package-lock.json" "$backupDir\package-lock.json.bak"
} else {
    Write-Host "⚠️ No se encontró package-lock.json" -ForegroundColor Yellow
}

# 2. Backup de schema.prisma
Write-Host "📋 Backup de schema.prisma..." -ForegroundColor Yellow
Copy-Item "backend\prisma\schema.prisma" "$backupDir\schema.prisma.bak"

# 3. Backup de prisma.service.ts
Write-Host "🔧 Backup de prisma.service.ts..." -ForegroundColor Yellow
Copy-Item "backend\src\prisma\prisma.service.ts" "$backupDir\prisma.service.ts.bak"

# 4. Listar versiones actuales
Write-Host "📊 Guardando versiones actuales..." -ForegroundColor Yellow
Push-Location backend
npm list prisma @prisma/client 2>&1 | Out-File -FilePath "..\$backupDir\versions.txt"
npx prisma version 2>&1 | Out-File -FilePath "..\$backupDir\versions.txt" -Append
Pop-Location

# 5. Crear commit de seguridad
Write-Host "💾 Creando commit de seguridad..." -ForegroundColor Yellow
git add .
try {
    git commit -m "backup: antes de actualización a Prisma 7.x (automated backup $timestamp)"
} catch {
    Write-Host "⚠️ No hay cambios para commitear" -ForegroundColor Yellow
}

# 6. Crear tag
Write-Host "🏷️ Creando tag de seguridad..." -ForegroundColor Yellow
git tag -a "backup-prisma6-$timestamp" -m "Backup automático antes de actualizar a Prisma 7.x"

Write-Host ""
Write-Host "✅ Backup completado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backup guardado en: $backupDir" -ForegroundColor Cyan
Write-Host "🏷️ Tag creado: backup-prisma6-$timestamp" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para restaurar este backup:" -ForegroundColor Yellow
Write-Host "  git checkout backup-prisma6-$timestamp"
Write-Host "  cd backend && npm install"
Write-Host ""
