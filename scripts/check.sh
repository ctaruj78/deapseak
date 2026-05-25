#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  FestLift — Швидкий health check після будь-яких змін
#  Запуск: ./scripts/check.sh
#  Запуск з авто-виправленням: ./scripts/check.sh --fix
#  Повна перевірка: ./scripts/check.sh --full
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

MODE="$1"

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}  FestLift Health Check${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"

# Перевіряємо чи PM2 процес запущений
if ! pm2 list 2>/dev/null | grep -q "deapseak.*online"; then
    echo -e "${RED}❌ PM2 процес 'deapseak' НЕ запущено!${NC}"
    echo -e "${YELLOW}Запуск: pm2 start $ROOT/unified-server.js --name deapseak${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PM2 deapseak: online${NC}"

# Запускаємо Node.js health check
if [ "$MODE" = "--full" ]; then
    echo -e "${CYAN}Режим: ПОВНА ПЕРЕВІРКА (HTML + API + DB)${NC}"
    node "$SCRIPT_DIR/healthcheck.js" --fix --api
elif [ "$MODE" = "--fix" ]; then
    echo -e "${CYAN}Режим: HTML + AUTO-FIX${NC}"
    node "$SCRIPT_DIR/healthcheck.js" --fix
else
    echo -e "${CYAN}Режим: БАЗОВА ПЕРЕВІРКА (HTML + HTTP)${NC}"
    node "$SCRIPT_DIR/healthcheck.js"
fi

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ ВСЕ ГАРАЗД!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}\n"
else
    echo -e "\n${RED}═══════════════════════════════════════${NC}"
    echo -e "${RED}  ❌ ЗНАЙДЕНО ПРОБЛЕМИ${NC}"
    echo -e "${RED}═══════════════════════════════════════${NC}"
    echo -e "${YELLOW}Запустіть з --full для повної діагностики:${NC}"
    echo -e "${YELLOW}  ./scripts/check.sh --full${NC}\n"
fi

exit $EXIT_CODE
