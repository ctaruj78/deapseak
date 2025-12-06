#!/bin/bash

# ============================================
# 🚀 DeapSeaK Unified Server Start
# ============================================
# Запуск Unified Server на порту 5000
# Один сервер для Frontend + API + WebSocket
# ============================================

set -e

# Кольори
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 DeapSeaK Unified Server${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Зупинити попередні процеси
echo -e "${YELLOW}⏹️  Зупинка попередніх процесів...${NC}"
pkill -f "node.*unified-server" 2>/dev/null || true
sleep 2

# Перевірка MongoDB
echo -e "${BLUE}🔍 Перевірка MongoDB...${NC}"
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB не запущено. Запускаю автоматично...${NC}"
    mkdir -p ~/mongodb-data
    mongod --dbpath ~/mongodb-data --fork --logpath ~/mongodb-data/mongod.log
    sleep 3
    
    if pgrep -x "mongod" > /dev/null; then
        echo -e "${GREEN}✅ MongoDB успішно запущено${NC}"
    else
        echo -e "${RED}❌ Не вдалося запустити MongoDB${NC}"
        echo -e "${YELLOW}📝 Спробуйте вручну: mongod --dbpath ~/mongodb-data${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ MongoDB вже активний${NC}"
fi

# Перехід в робочу директорію
cd /workspaces/deapseak

# Перевірка node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Встановлення залежностей...${NC}"
    npm install
fi

# Створення папки для логів
mkdir -p logs

# КРИТИЧНО: Codespaces встановлює PORT=3001, ми використовуємо DEAPSEAK_PORT
export DEAPSEAK_PORT=5000
export NODE_ENV=development

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Запуск Unified Server на порту 5000${NC}"
echo -e "${BLUE}🔧 Змінні: DEAPSEAK_PORT=${DEAPSEAK_PORT}, системний PORT=${PORT}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Запуск сервера в фоновому режимі
nohup node unified-server.js > logs/unified-server.log 2>&1 &
SERVER_PID=$!

# Очікування запуску
echo -e "${YELLOW}⏳ Очікування запуску сервера (5 сек)...${NC}"
sleep 5

# Перевірка чи процес працює
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Unified Server запущено (PID: $SERVER_PID)${NC}"
    
    # Перевірка через curl
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API endpoint відповідає${NC}"
        
        # Показати останні логи
        echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}📋 Останні логи:${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        tail -10 logs/unified-server.log | grep -E "🚀|✅|❌|PORT|port" || tail -10 logs/unified-server.log
        
        echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✅ Unified Server успішно запущено!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        
        echo -e "${BLUE}🌐 URL:${NC}        http://localhost:5000"
        echo -e "${BLUE}🔐 API:${NC}        http://localhost:5000/api/*"
        echo -e "${BLUE}📁 Frontend:${NC}   http://localhost:5000"
        echo -e "${BLUE}📊 WebSocket:${NC}  ws://localhost:5000"
        echo -e "${BLUE}📝 Логи:${NC}       tail -f logs/unified-server.log"
        echo -e "${BLUE}⏹️  Зупинка:${NC}    pkill -f \"node.*unified-server\"\n"
        
        # GitHub Codespaces URL
        if [ -n "$CODESPACE_NAME" ]; then
            CODESPACE_URL="https://${CODESPACE_NAME}-5000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
            echo -e "${YELLOW}☁️  Codespaces URL: ${CODESPACE_URL}${NC}\n"
        fi
    else
        echo -e "${RED}❌ API endpoint не відповідає на http://localhost:5000${NC}"
        echo -e "${YELLOW}📝 Перевірте логи:${NC}"
        tail -20 logs/unified-server.log
        exit 1
    fi
else
    echo -e "${RED}❌ Процес сервера (PID: $SERVER_PID) не працює${NC}"
    echo -e "${YELLOW}📝 Останні логи:${NC}"
    cat logs/unified-server.log
    exit 1
fi
