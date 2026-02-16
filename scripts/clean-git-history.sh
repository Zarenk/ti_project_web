#!/bin/bash

###############################################################################
# Script de Limpieza de Historial Git - Remover Secretos Comprometidos
#
# ADVERTENCIA: Este script REESCRIBE el historial de git.
#              Todos los desarrolladores deberán re-clonar el repositorio.
#
# Uso: ./scripts/clean-git-history.sh
###############################################################################

set -e  # Exit on error

# Colores
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔒 Limpieza de Secretos del Historial de Git            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que estamos en el directorio raíz del repositorio
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: Este script debe ejecutarse desde la raíz del repositorio${NC}"
    exit 1
fi

# Verificar que git está instalado
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Error: git no está instalado${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  ADVERTENCIA CRÍTICA${NC}"
echo ""
echo "Este script va a:"
echo "  1. Crear un backup del repositorio actual"
echo "  2. Remover TODOS los archivos .env del historial de git"
echo "  3. Reescribir el historial completo"
echo "  4. Requerir force push a origin"
echo ""
echo "Después de ejecutar este script:"
echo "  - Todos los desarrolladores DEBEN re-clonar el repositorio"
echo "  - No se puede hacer git pull, el historial será diferente"
echo "  - Las credenciales antiguas quedarán inválidas"
echo ""
read -p "¿Continuar? (escribe 'SI ESTOY SEGURO' para confirmar): " confirm

if [ "$confirm" != "SI ESTOY SEGURO" ]; then
    echo -e "${YELLOW}⏸  Operación cancelada${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}📦 Paso 1: Crear backup del repositorio${NC}"

# Nombre del backup con timestamp
BACKUP_DIR="../TI_projecto_web_backup_$(date +%Y%m%d_%H%M%S)"

echo "Creando backup en: $BACKUP_DIR"
cp -r . "$BACKUP_DIR"
echo -e "${GREEN}✅ Backup creado exitosamente${NC}"
echo ""

echo -e "${BLUE}🔍 Paso 2: Verificar archivos .env en el historial${NC}"

# Buscar .env en el historial
echo "Buscando archivos .env comprometidos..."
ENV_FILES=$(git log --all --full-history --pretty=format: --name-only -- "*/.env" "*/.env.*" | grep -v ".env.example" | sort -u || true)

if [ -z "$ENV_FILES" ]; then
    echo -e "${GREEN}✅ No se encontraron archivos .env en el historial${NC}"
    echo "El repositorio parece estar limpio."
    exit 0
else
    echo -e "${YELLOW}⚠️  Archivos .env encontrados en historial:${NC}"
    echo "$ENV_FILES"
    echo ""
fi

echo -e "${BLUE}🧹 Paso 3: Limpiar archivos .env del historial${NC}"

# Verificar si BFG está instalado
if command -v bfg &> /dev/null; then
    echo "Usando BFG Repo-Cleaner (método recomendado)..."

    # Crear lista de archivos a borrar
    cat > .bfg-delete-files.txt << EOF
.env
.env.local
.env.development
.env.development.local
.env.production
.env.production.local
.env.test
.env.test.local
.env.backup
EOF

    # Ejecutar BFG
    bfg --delete-files .bfg-delete-files.txt --no-blob-protection

    # Limpiar archivo temporal
    rm .bfg-delete-files.txt

else
    echo -e "${YELLOW}⚠️  BFG no encontrado, usando git filter-branch (más lento)${NC}"
    echo "Para instalar BFG: brew install bfg (Mac) o choco install bfg-repo-cleaner (Windows)"
    echo ""

    # Lista de archivos a remover
    FILES_TO_REMOVE=(
        "backend/.env"
        "backend/.env.local"
        "backend/.env.backup"
        "fronted/.env"
        "fronted/.env.local"
        "fronted/.env.backup"
    )

    for file in "${FILES_TO_REMOVE[@]}"; do
        echo "Removiendo $file del historial..."
        git filter-branch --force --index-filter \
            "git rm --cached --ignore-unmatch $file" \
            --prune-empty --tag-name-filter cat -- --all
    done
fi

echo -e "${GREEN}✅ Archivos .env removidos del historial${NC}"
echo ""

echo -e "${BLUE}🗑️  Paso 4: Limpiar referencias y garbage collection${NC}"

# Remover referencias a commits antiguos
echo "Limpiando referencias..."
git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all

# Garbage collection agresivo
echo "Ejecutando garbage collection..."
git gc --prune=now --aggressive

echo -e "${GREEN}✅ Limpieza completada${NC}"
echo ""

echo -e "${BLUE}🔍 Paso 5: Verificar que .env ya no está en historial${NC}"

# Verificar que los archivos ya no existen
REMAINING=$(git log --all --full-history -- "*/.env" | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo -e "${GREEN}✅ Verificación exitosa: No hay archivos .env en el historial${NC}"
else
    echo -e "${RED}❌ Advertencia: Aún se encontraron referencias a .env${NC}"
    echo "Puede ser necesario ejecutar el script nuevamente"
fi

echo ""
echo -e "${BLUE}📊 Paso 6: Estadísticas del repositorio${NC}"

# Tamaño del repositorio antes y después
REPO_SIZE=$(du -sh .git | cut -f1)
echo "Tamaño del directorio .git: $REPO_SIZE"

OBJECTS=$(git count-objects -v | grep "count:" | awk '{print $2}')
echo "Objetos en el repositorio: $OBJECTS"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Limpieza Completada Exitosamente                     ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}⚠️  PRÓXIMOS PASOS CRÍTICOS:${NC}"
echo ""
echo "1. Verificar que el repositorio funciona correctamente:"
echo "   npm run build (en backend y fronted)"
echo ""
echo "2. Force push a origin (SOLO después de verificar):"
echo "   ${BLUE}git push origin --force --all${NC}"
echo "   ${BLUE}git push origin --force --tags${NC}"
echo ""
echo "3. Notificar a TODO el equipo de desarrollo:"
echo "   - Deben BORRAR su copia local"
echo "   - Deben RE-CLONAR desde origin"
echo "   - NO usar git pull (el historial cambió)"
echo ""
echo "4. Rotar TODAS las credenciales:"
echo "   - Ver: docs/SECURITY_CREDENTIALS_ROTATION.md"
echo ""
echo "5. Configurar Railway con nuevas credenciales:"
echo "   railway variables set JWT_SECRET=\"...\""
echo ""
echo -e "${BLUE}📁 Backup del repositorio original: ${BACKUP_DIR}${NC}"
echo ""
echo -e "${GREEN}Presiona ENTER para continuar...${NC}"
read

# Ofrecer hacer el force push automáticamente
echo ""
read -p "¿Deseas hacer el force push a origin AHORA? (y/n): " push_confirm

if [ "$push_confirm" = "y" ] || [ "$push_confirm" = "Y" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Haciendo force push a origin...${NC}"
    echo "Esto SOBRESCRIBIRÁ el historial remoto"
    echo ""
    read -p "Confirmar force push (escribe 'FORCE PUSH'): " final_confirm

    if [ "$final_confirm" = "FORCE PUSH" ]; then
        git push origin --force --all
        git push origin --force --tags
        echo -e "${GREEN}✅ Force push completado${NC}"
        echo ""
        echo "🚨 NOTIFICA AL EQUIPO INMEDIATAMENTE 🚨"
    else
        echo -e "${YELLOW}⏸  Force push cancelado${NC}"
        echo "Ejecuta manualmente cuando estés listo:"
        echo "  git push origin --force --all"
        echo "  git push origin --force --tags"
    fi
else
    echo -e "${YELLOW}⏸  Force push omitido${NC}"
    echo "Recuerda ejecutarlo después de verificar:"
    echo "  git push origin --force --all"
    echo "  git push origin --force --tags"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Limpieza de historial completada${NC}"
echo -e "${BLUE}Fecha: $(date)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
