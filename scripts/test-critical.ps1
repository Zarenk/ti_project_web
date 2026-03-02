# ─────────────────────────────────────────────────────────
# Critical E2E Test Suite — Orchestration Script (Windows)
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts\test-critical.ps1
#        OR from project root: .\scripts\test-critical.ps1
#
# Prerequisites:
#   - PostgreSQL running on localhost:5432 (with psql in PATH)
#   - Node.js + npm installed
#   - Backend and frontend dependencies installed
# ─────────────────────────────────────────────────────────

# Use Continue so that stderr output from npx/node doesn't abort the script.
# We check $LASTEXITCODE explicitly after each command instead.
$ErrorActionPreference = "Continue"

$PROJECT_ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BACKEND_DIR = Join-Path $PROJECT_ROOT "backend"
$FRONTEND_DIR = Join-Path $PROJECT_ROOT "fronted"
$TEST_DB_NAME = "ecoterra_test"

# Read PostgreSQL connection from backend/.env
$BACKEND_ENV = Join-Path $BACKEND_DIR ".env"
$PG_PASSWORD = "postgres"
$PG_HOST = "localhost"
$PG_PORT = "5432"
$PG_USER = "postgres"

if (Test-Path $BACKEND_ENV) {
    $dbUrlLine = Get-Content $BACKEND_ENV | Where-Object { $_ -match "^DATABASE_URL=" } | Select-Object -First 1
    if ($dbUrlLine -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/') {
        $PG_USER = $Matches[1]
        $PG_PASSWORD = $Matches[2]
        $PG_HOST = $Matches[3]
        $PG_PORT = $Matches[4]
        Write-Host "  Read DB credentials from .env (user=$PG_USER, host=$PG_HOST)" -ForegroundColor DarkGray
    }
}

$TEST_DB_URL = "postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${TEST_DB_NAME}"

$BACKEND_LOG = Join-Path $env:TEMP "e2e-backend.log"
$FRONTEND_LOG = Join-Path $env:TEMP "e2e-frontend.log"

$backendProcess = $null
$frontendProcess = $null
$EXIT_CODE = 0

function Write-Step($step, $msg) {
    Write-Host "[$step]" -ForegroundColor Cyan -NoNewline
    Write-Host " $msg"
}
function Write-Ok($msg) { Write-Host "  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "  $msg" -ForegroundColor Red }

function Cleanup {
    Write-Host "`n[cleanup] Stopping servers..." -ForegroundColor Cyan
    if ($backendProcess -and !$backendProcess.HasExited) {
        try {
            Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
            # Also kill any child node processes on port 4000
            Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue |
                ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
            Write-Host "  Backend stopped." -ForegroundColor Cyan
        } catch {}
    }
    if ($frontendProcess -and !$frontendProcess.HasExited) {
        try {
            Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
            Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
                ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
            Write-Host "  Frontend stopped." -ForegroundColor Cyan
        } catch {}
    }
}

# Register cleanup on script exit
Register-EngineEvent PowerShell.Exiting -Action { Cleanup } | Out-Null
trap { Cleanup; break }

# ── Step 1: Check ports ───────────────────────────────────
Write-Step "1/6" "Checking ports 4000 and 3000..."

function Test-PortInUse($port) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $connections -and $connections.Count -gt 0)
}

if (Test-PortInUse 4000) {
    Write-Err "ERROR: Port 4000 is already in use. Stop the process and try again."
    exit 1
}
if (Test-PortInUse 3000) {
    Write-Err "ERROR: Port 3000 is already in use. Stop the process and try again."
    exit 1
}
Write-Ok "Ports 4000 and 3000 are free."

# ── Step 2: Reset test database ──────────────────────────
Write-Step "2/6" "Resetting test database '$TEST_DB_NAME'..."

$env:PGPASSWORD = $PG_PASSWORD

# Drop and recreate using psql (more reliable than dropdb/createdb on Windows)
try {
    # Terminate existing connections
    psql -U $PG_USER -h $PG_HOST -p $PG_PORT -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$TEST_DB_NAME' AND pid <> pg_backend_pid();" 2>$null | Out-Null
    psql -U $PG_USER -h $PG_HOST -p $PG_PORT -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" 2>$null | Out-Null
    psql -U $PG_USER -h $PG_HOST -p $PG_PORT -d postgres -c "CREATE DATABASE $TEST_DB_NAME;" 2>$null | Out-Null
    Write-Ok "Database created."
} catch {
    Write-Warn "Using existing database (could not recreate): $_"
}

# Push schema
Write-Host "  Pushing Prisma schema..." -ForegroundColor Cyan
Push-Location $BACKEND_DIR
$pushOutput = npx prisma db push --accept-data-loss --url $TEST_DB_URL 2>&1
$pushOutput | Select-Object -Last 5 | ForEach-Object { Write-Host "    $_" }
if ($LASTEXITCODE -ne 0) {
    Write-Err "Prisma db push failed!"
    Pop-Location
    exit 1
}
Pop-Location

# Run seed
Write-Host "  Seeding test data..." -ForegroundColor Cyan
Push-Location $BACKEND_DIR
$env:DATABASE_URL = $TEST_DB_URL
npx ts-node prisma/seed/e2e-critical.seed.ts 2>&1 | ForEach-Object { Write-Host "    $_" }
if ($LASTEXITCODE -ne 0) {
    Write-Err "Seed failed! Check the error above."
    Pop-Location
    exit 1
}
Pop-Location
Write-Ok "Database ready."

# ── Step 3: Start backend ─────────────────────────────────
Write-Step "3/6" "Starting backend..."

$env:DATABASE_URL = $TEST_DB_URL
$env:PORT = "4000"
$env:JWT_SECRET = "e2e-test-secret"
$env:ACCOUNTING_HOOK_ENABLED = "true"
$env:NODE_ENV = "test"

$backendProcess = Start-Process -FilePath "npm" `
    -ArgumentList "run", "start:dev" `
    -WorkingDirectory $BACKEND_DIR `
    -RedirectStandardOutput $BACKEND_LOG `
    -RedirectStandardError (Join-Path $env:TEMP "e2e-backend-err.log") `
    -PassThru -WindowStyle Hidden

Write-Host "  Backend PID: $($backendProcess.Id)"

# Wait for backend to be ready (use -ErrorAction Stop so try/catch works)
Write-Host "  Waiting for backend health..." -ForegroundColor Cyan
$backendReady = $false
for ($i = 1; $i -le 90; $i++) {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:4000/api" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Ok "Backend ready! (${i}s)"
        $backendReady = $true
        break
    } catch {
        # Connection refused or timeout — keep waiting
    }
    if ($backendProcess.HasExited) {
        Write-Err "Backend process exited unexpectedly! Check: $BACKEND_LOG"
        exit 1
    }
    Start-Sleep -Seconds 1
}

if (-not $backendReady) {
    Write-Err "Backend failed to start in 90s. Check: $BACKEND_LOG"
    Cleanup
    exit 1
}

# ── Step 4: Start frontend ────────────────────────────────
Write-Step "4/6" "Starting frontend..."

$env:NEXT_PUBLIC_BACKEND_URL = "http://localhost:4000"
$env:PORT = "3000"

$frontendProcess = Start-Process -FilePath "npm" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory $FRONTEND_DIR `
    -RedirectStandardOutput $FRONTEND_LOG `
    -RedirectStandardError (Join-Path $env:TEMP "e2e-frontend-err.log") `
    -PassThru -WindowStyle Hidden

Write-Host "  Frontend PID: $($frontendProcess.Id)"

# Wait for frontend to be ready (use -ErrorAction Stop so try/catch works)
Write-Host "  Waiting for frontend health..." -ForegroundColor Cyan
$frontendReady = $false
for ($i = 1; $i -le 120; $i++) {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Ok "Frontend ready! (${i}s)"
        $frontendReady = $true
        break
    } catch {
        # Connection refused or timeout — keep waiting
    }
    if ($frontendProcess.HasExited) {
        Write-Err "Frontend process exited unexpectedly! Check: $FRONTEND_LOG"
        Cleanup
        exit 1
    }
    Start-Sleep -Seconds 1
}

if (-not $frontendReady) {
    Write-Err "Frontend failed to start in 120s. Check: $FRONTEND_LOG"
    Cleanup
    exit 1
}

# ── Step 5: Run Cypress ───────────────────────────────────
Write-Step "5/6" "Running Cypress critical E2E tests..."

$env:FRONTEND_BASE_URL = "http://localhost:3000"
$env:CYPRESS_BACKEND_URL = "http://localhost:4000/api"

# CRITICAL: Unset ELECTRON_RUN_AS_NODE. VS Code (an Electron app) sets this to "1"
# in its integrated terminal, which forces ALL Electron binaries (including Cypress)
# to run as plain Node.js instead of Electron. This causes Cypress.exe to reject
# --smoke-test as "bad option" and fail to initialize the test runner.
if (Test-Path "Env:\ELECTRON_RUN_AS_NODE") {
    Remove-Item "Env:\ELECTRON_RUN_AS_NODE" -ErrorAction SilentlyContinue
    Write-Host "  Cleared ELECTRON_RUN_AS_NODE (was set by VS Code)" -ForegroundColor DarkGray
}

Push-Location $FRONTEND_DIR
npx cypress run --spec "cypress/e2e/critical/**/*.cy.ts" --browser chrome --headless 2>&1
$EXIT_CODE = $LASTEXITCODE
Pop-Location

# ── Step 6: Report ────────────────────────────────────────
Write-Host ""
if ($EXIT_CODE -eq 0) {
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host "  ALL CRITICAL E2E TESTS PASSED                    " -ForegroundColor Green
    Write-Host "  Safe to deploy to production.                     " -ForegroundColor Green
    Write-Host "===================================================" -ForegroundColor Green
} else {
    Write-Host "===================================================" -ForegroundColor Red
    Write-Host "  CRITICAL E2E TESTS FAILED (exit code: $EXIT_CODE)" -ForegroundColor Red
    Write-Host "  DO NOT deploy. Fix the failing tests first.      " -ForegroundColor Red
    Write-Host "===================================================" -ForegroundColor Red
    Write-Warn "Backend log: $BACKEND_LOG"
    Write-Warn "Frontend log: $FRONTEND_LOG"
}

Cleanup
exit $EXIT_CODE
