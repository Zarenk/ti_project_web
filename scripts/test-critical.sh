#!/bin/bash
# ─────────────────────────────────────────────────────────
# Critical E2E Test Suite — Orchestration Script
#
# Usage: npm run test:critical
#        OR: bash scripts/test-critical.sh
#
# Prerequisites:
#   - PostgreSQL running on localhost:5432
#   - Node.js + npm installed
#   - Backend and frontend dependencies installed
# ─────────────────────────────────────────────────────────
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/fronted"
TEST_DB_NAME="ecoterra_test"

# Read PostgreSQL credentials from backend/.env
PG_USER="postgres"
PG_PASSWORD="postgres"
PG_HOST="localhost"
PG_PORT="5432"

if [ -f "$BACKEND_DIR/.env" ]; then
  DB_LINE=$(grep '^DATABASE_URL=' "$BACKEND_DIR/.env" | head -1)
  if [[ "$DB_LINE" =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/ ]]; then
    PG_USER="${BASH_REMATCH[1]}"
    PG_PASSWORD="${BASH_REMATCH[2]}"
    PG_HOST="${BASH_REMATCH[3]}"
    PG_PORT="${BASH_REMATCH[4]}"
    echo "  Read DB credentials from .env (user=$PG_USER, host=$PG_HOST)"
  fi
fi

TEST_DB_URL="postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${TEST_DB_NAME}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKEND_PID=""
FRONTEND_PID=""
EXIT_CODE=0

# ── Cleanup function ───────────────────────────────────────
cleanup() {
  echo -e "\n${BLUE}[cleanup]${NC} Stopping servers..."
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    echo -e "${BLUE}[cleanup]${NC} Backend stopped (PID $BACKEND_PID)"
  fi
  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo -e "${BLUE}[cleanup]${NC} Frontend stopped (PID $FRONTEND_PID)"
  fi
}
trap cleanup EXIT

# ── Step 1: Check ports ───────────────────────────────────
echo -e "${BLUE}[1/6]${NC} Checking ports 4000 and 3000..."

check_port() {
  local port=$1
  if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":$port.*LISTEN"; then
    echo -e "${RED}ERROR:${NC} Port $port is already in use. Stop the process and try again."
    exit 1
  fi
}

check_port 4000
check_port 3000
echo -e "${GREEN}  Ports 4000 and 3000 are free.${NC}"

# ── Step 2: Reset test database ──────────────────────────
echo -e "${BLUE}[2/6]${NC} Resetting test database '${TEST_DB_NAME}'..."

export PGPASSWORD="$PG_PASSWORD"

# Drop and recreate the test database
PGPASSWORD="$PG_PASSWORD" psql -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$TEST_DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true
PGPASSWORD="$PG_PASSWORD" psql -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -d postgres \
  -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" 2>/dev/null || true
PGPASSWORD="$PG_PASSWORD" psql -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -d postgres \
  -c "CREATE DATABASE $TEST_DB_NAME;" 2>/dev/null || {
  echo -e "${YELLOW}  Using existing database (could not create).${NC}"
}

# Push schema
echo -e "${BLUE}  Pushing Prisma schema...${NC}"
cd "$BACKEND_DIR"
npx prisma db push --accept-data-loss --url "$TEST_DB_URL" 2>&1 | tail -3

# Run seed
echo -e "${BLUE}  Seeding test data...${NC}"
DATABASE_URL="$TEST_DB_URL" npx ts-node prisma/seed/e2e-critical.seed.ts

echo -e "${GREEN}  Database ready.${NC}"

# ── Step 3: Start backend ─────────────────────────────────
echo -e "${BLUE}[3/6]${NC} Starting backend..."
cd "$BACKEND_DIR"
DATABASE_URL="$TEST_DB_URL" \
  PORT=4000 \
  JWT_SECRET=e2e-test-secret \
  ACCOUNTING_HOOK_ENABLED=true \
  NODE_ENV=test \
  npm run start:dev > /tmp/e2e-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "  Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo -e "${BLUE}  Waiting for backend health...${NC}"
for i in $(seq 1 60); do
  if curl -sf http://localhost:4000/api 2>/dev/null || curl -sf http://localhost:4000 2>/dev/null; then
    echo -e "${GREEN}  Backend ready! (${i}s)${NC}"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo -e "${RED}  Backend failed to start in 60s. Check /tmp/e2e-backend.log${NC}"
    exit 1
  fi
  sleep 1
done

# ── Step 4: Start frontend ────────────────────────────────
echo -e "${BLUE}[4/6]${NC} Starting frontend..."
cd "$FRONTEND_DIR"
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000 \
  PORT=3000 \
  npm run dev > /tmp/e2e-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "  Frontend PID: $FRONTEND_PID"

# Wait for frontend to be ready
echo -e "${BLUE}  Waiting for frontend health...${NC}"
for i in $(seq 1 90); do
  if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}  Frontend ready! (${i}s)${NC}"
    break
  fi
  if [ "$i" -eq 90 ]; then
    echo -e "${RED}  Frontend failed to start in 90s. Check /tmp/e2e-frontend.log${NC}"
    exit 1
  fi
  sleep 1
done

# ── Step 5: Run Cypress ───────────────────────────────────
echo -e "${BLUE}[5/6]${NC} Running Cypress critical E2E tests..."
cd "$FRONTEND_DIR"

# CRITICAL: Unset ELECTRON_RUN_AS_NODE. VS Code sets this to "1" in its
# integrated terminal, which forces Cypress (an Electron app) to run as
# plain Node.js, breaking the test runner completely.
unset ELECTRON_RUN_AS_NODE

FRONTEND_BASE_URL=http://localhost:3000 \
  CYPRESS_BACKEND_URL=http://localhost:4000/api \
  npx cypress run \
    --spec "cypress/e2e/critical/**/*.cy.ts" \
    --browser chrome \
    --headless \
  && EXIT_CODE=0 || EXIT_CODE=$?

# ── Step 6: Report ────────────────────────────────────────
echo ""
if [ "$EXIT_CODE" -eq 0 ]; then
  echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ALL CRITICAL E2E TESTS PASSED                   ${NC}"
  echo -e "${GREEN}  Safe to deploy to production.                    ${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
else
  echo -e "${RED}═══════════════════════════════════════════════════${NC}"
  echo -e "${RED}  CRITICAL E2E TESTS FAILED (exit code: $EXIT_CODE)${NC}"
  echo -e "${RED}  DO NOT deploy. Fix the failing tests first.     ${NC}"
  echo -e "${RED}═══════════════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  Backend log: /tmp/e2e-backend.log${NC}"
  echo -e "${YELLOW}  Frontend log: /tmp/e2e-frontend.log${NC}"
fi

exit $EXIT_CODE
