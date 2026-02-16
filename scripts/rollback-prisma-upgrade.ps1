# Script de Rollback para Actualización de Prisma (PowerShell)
# Uso: .\scripts\rollback-prisma-upgrade.ps1

$ErrorActionPreference = "Stop"

Write-Host "⏪ Iniciando rollback a Prisma 6.5.0..." -ForegroundColor Yellow
Write-Host ""

# Verificar branch actual
$currentBranch = git branch --show-current
if ($currentBranch -ne "test/prisma-7-migration") {
    Write-Host "⚠️ ADVERTENCIA: No estás en el branch test/prisma-7-migration" -ForegroundColor Yellow
    Write-Host "Branch actual: $currentBranch" -ForegroundColor Cyan
    $response = Read-Host "¿Continuar con rollback? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        exit 1
    }
}

# 1. Descartar cambios no commiteados
Write-Host "🗑️ Descartando cambios no guardados..." -ForegroundColor Yellow
git reset --hard

# 2. Volver a develop
Write-Host "🔄 Volviendo a branch develop..." -ForegroundColor Yellow
git checkout develop

# 3. Eliminar branch de prueba (opcional)
$response = Read-Host "¿Eliminar branch test/prisma-7-migration? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    try {
        git branch -D test/prisma-7-migration
    } catch {
        Write-Host "Branch ya no existe" -ForegroundColor Yellow
    }
}

# 4. Reinstalar Prisma 6.5.0
Write-Host "📦 Reinstalando Prisma 6.5.0..." -ForegroundColor Yellow
Push-Location backend
npm install prisma@6.5.0 @prisma/client@6.5.0

# 5. Regenerar cliente
Write-Host "🔧 Regenerando cliente de Prisma 6.5.0..." -ForegroundColor Yellow
npx prisma generate

# 6. Verificar instalación
Write-Host "✅ Verificando instalación..." -ForegroundColor Green
npx prisma version

# 7. Compilar backend
Write-Host "🔨 Compilando backend..." -ForegroundColor Yellow
npm run build

Pop-Location

Write-Host ""
Write-Host "✅ Rollback completado exitosamente!" -ForegroundColor Green
Write-Host "✅ Prisma 6.5.0 restaurado" -ForegroundColor Green
Write-Host ""
Write-Host "Puedes iniciar el servidor con: cd backend && npm run start:dev" -ForegroundColor Cyan
Write-Host ""
