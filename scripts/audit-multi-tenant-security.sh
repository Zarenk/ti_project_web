#!/bin/bash

###############################################################################
# Script de Auditoría de Seguridad Multi-Tenant
#
# Este script escanea el código en busca de posibles vulnerabilidades
# de seguridad multi-tenant.
#
# Uso: ./scripts/audit-multi-tenant-security.sh
###############################################################################

set -e

# Colores
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔒 Auditoría de Seguridad Multi-Tenant                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

cd backend/src

# Contadores
TOTAL_ISSUES=0
CRITICAL_ISSUES=0
WARNING_ISSUES=0

echo -e "${BLUE}1. Endpoints GET/:id sin EntityOwnershipGuard${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GET_ENDPOINTS=$(grep -r "@Get(':id')" --include="*.controller.ts" | grep -v "EntityOwnershipGuard" || true)
GET_COUNT=$(echo "$GET_ENDPOINTS" | grep -c "controller.ts" || echo "0")

if [ "$GET_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Encontrados $GET_COUNT endpoints GET/:id sin guard${NC}"
  echo "$GET_ENDPOINTS" | while read -r line; do
    echo "   - $line"
  done
  WARNING_ISSUES=$((WARNING_ISSUES + GET_COUNT))
else
  echo -e "${GREEN}✅ Todos los endpoints GET/:id usan EntityOwnershipGuard${NC}"
fi
echo ""

echo -e "${BLUE}2. Endpoints DELETE/:id sin EntityOwnershipGuard${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DELETE_ENDPOINTS=$(grep -r "@Delete(':id')" --include="*.controller.ts" | grep -v "EntityOwnershipGuard" || true)
DELETE_COUNT=$(echo "$DELETE_ENDPOINTS" | grep -c "controller.ts" || echo "0")

if [ "$DELETE_COUNT" -gt 0 ]; then
  echo -e "${RED}❌ CRÍTICO: $DELETE_COUNT endpoints DELETE sin guard${NC}"
  echo "$DELETE_ENDPOINTS" | while read -r line; do
    echo "   - $line"
  done
  CRITICAL_ISSUES=$((CRITICAL_ISSUES + DELETE_COUNT))
else
  echo -e "${GREEN}✅ Todos los endpoints DELETE/:id usan EntityOwnershipGuard${NC}"
fi
echo ""

echo -e "${BLUE}3. Queries Prisma sin filtro de tenant${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Buscar findMany() sin organizationId
FINDMANY_ISSUES=$(grep -r "\.findMany()" --include="*.service.ts" | grep -v "organizationId" | grep -v "// IGNORE" | head -10 || true)
FINDMANY_COUNT=$(echo "$FINDMANY_ISSUES" | grep -c "service.ts" || echo "0")

if [ "$FINDMANY_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  $FINDMANY_COUNT posibles queries sin filtro (primeras 10):${NC}"
  echo "$FINDMANY_ISSUES" | while read -r line; do
    echo "   - $line"
  done
  WARNING_ISSUES=$((WARNING_ISSUES + FINDMANY_COUNT))
else
  echo -e "${GREEN}✅ No se encontraron queries obvias sin filtro${NC}"
fi
echo ""

echo -e "${BLUE}4. Deletes sin validación de ownership${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Buscar .delete({ where: { id sin findFirst previo
DELETE_ISSUES=$(grep -r "\.delete({ where: { id" --include="*.service.ts" | head -10 || true)
DELETE_SERVICE_COUNT=$(echo "$DELETE_ISSUES" | grep -c "service.ts" || echo "0")

if [ "$DELETE_SERVICE_COUNT" -gt 0 ]; then
  echo -e "${RED}❌ CRÍTICO: $DELETE_SERVICE_COUNT deletes directos encontrados:${NC}"
  echo "$DELETE_ISSUES" | while read -r line; do
    echo "   - $line"
  done
  CRITICAL_ISSUES=$((CRITICAL_ISSUES + DELETE_SERVICE_COUNT))
else
  echo -e "${GREEN}✅ No se encontraron deletes directos sin validación${NC}"
fi
echo ""

echo -e "${BLUE}5. Mensajes de error que exponen información${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ERROR_MSG_ISSUES=$(grep -r "belongs to" --include="*.ts" || true)
ERROR_MSG_COUNT=$(echo "$ERROR_MSG_ISSUES" | grep -c "\.ts" || echo "0")

if [ "$ERROR_MSG_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  $ERROR_MSG_COUNT posibles mensajes que exponen info:${NC}"
  echo "$ERROR_MSG_ISSUES" | head -5 | while read -r line; do
    echo "   - $line"
  done
else
  echo -e "${GREEN}✅ No se encontraron mensajes obvios que expongan info${NC}"
fi
echo ""

echo -e "${BLUE}6. Controllers sin TenantRequiredGuard${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Buscar @Controller sin @UseGuards que incluya TenantRequiredGuard
CONTROLLERS_WITHOUT_GUARD=$(find . -name "*.controller.ts" -type f -exec sh -c '
  if grep -q "@Controller" "$1" && ! grep -q "TenantRequiredGuard" "$1"; then
    echo "$1"
  fi
' _ {} \; | grep -v "public" | grep -v "auth" | head -10 || true)

CONTROLLER_COUNT=$(echo "$CONTROLLERS_WITHOUT_GUARD" | grep -c "controller.ts" || echo "0")

if [ "$CONTROLLER_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  $CONTROLLER_COUNT controllers sin TenantRequiredGuard:${NC}"
  echo "$CONTROLLERS_WITHOUT_GUARD" | while read -r line; do
    echo "   - $line"
  done
  WARNING_ISSUES=$((WARNING_ISSUES + CONTROLLER_COUNT))
else
  echo -e "${GREEN}✅ Todos los controllers relevantes usan TenantRequiredGuard${NC}"
fi
echo ""

# Resumen
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}RESUMEN DE AUDITORÍA${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

TOTAL_ISSUES=$((CRITICAL_ISSUES + WARNING_ISSUES))

echo -e "Issues Críticos:   ${RED}$CRITICAL_ISSUES${NC}"
echo -e "Issues Advertencia: ${YELLOW}$WARNING_ISSUES${NC}"
echo -e "Total Issues:      $TOTAL_ISSUES"
echo ""

if [ "$CRITICAL_ISSUES" -gt 0 ]; then
  echo -e "${RED}❌ SE ENCONTRARON ISSUES CRÍTICOS DE SEGURIDAD${NC}"
  echo ""
  echo "Recomendaciones:"
  echo "1. Revisar y aplicar EntityOwnershipGuard en endpoints DELETE"
  echo "2. Validar ownership antes de operaciones destructivas"
  echo "3. Revisar mensajes de error que puedan exponer información"
  echo ""
  exit 1
elif [ "$WARNING_ISSUES" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  SE ENCONTRARON ADVERTENCIAS DE SEGURIDAD${NC}"
  echo ""
  echo "Recomendaciones:"
  echo "1. Considerar aplicar EntityOwnershipGuard en endpoints GET/:id"
  echo "2. Revisar queries que puedan no estar filtrando por tenant"
  echo "3. Agregar TenantRequiredGuard en controllers faltantes"
  echo ""
  exit 0
else
  echo -e "${GREEN}✅ NO SE ENCONTRARON ISSUES DE SEGURIDAD${NC}"
  echo ""
  exit 0
fi
