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
pkill -f "node.*unified-server" || true
sleep 2

# Перевірка MongoDB
echo -e "${BLUE}🔍 Перевірка MongoDB...${NC}"
if ! pgrep -x "mongod" > /dev/null; then
    echo -e "${RED}❌ MongoDB не запущено!${NC}"
    echo -e "${YELLOW}📝 Запустіть: sudo systemctl start mongod${NC}"
    exit 1
fi
echo -e "${GREEN}✅ MongoDB активний${NC}"

# Перехід в робочу директорію
cd /workspaces/deapseak

# Перевірка node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Встановлення залежностей...${NC}"
    npm install
fi

# Створення папки для логів
mkdir -p logs

# ЯВНЕ встановлення PORT=5000 (запобігає конфліктам з системними змінними)
export PORT=5000
export NODE_ENV=development

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Запуск Unified Server на порту ${PORT}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Запуск сервера в фоновому режимі
nohup node unified-server.js > logs/unified-server.log 2>&1 &
SERVER_PID=$!

# Очікування запуску
echo -e "${YELLOW}⏳ Очікування запуску сервера...${NC}"
sleep 3

# Перевірка чи процес працює
if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✅ Unified Server запущено (PID: $SERVER_PID)${NC}"
    
    # Перевірка через curl
    sleep 2
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API endpoint відповідає${NC}"
        
        # Показати останні логи
        echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}📋 Останні логи:${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        tail -5 logs/unified-server.log
        
        echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✅ Unified Server успішно запущено!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        
        echo -e "${BLUE}🌐 URL:${NC}        http://localhost:5000"
        echo -e "${BLUE}🔐 API:${NC}        http://localhost:5000/api/*"
        echo -e "${BLUE}📁 Frontend:${NC}   http://localhost:5000"
        echo -e "${BLUE}📊 WebSocket:${NC}  ws://localhost:5000"
        echo -e "${BLUE}📝 Логи:${NC}       tail -f logs/unified-server.log"
        echo -e "${BLUE}⏹️  Зупинка:${NC}    pkill -f \"node.*unified-server\"\n"
    else
        echo -e "${RED}❌ API endpoint не відповідає${NC}"
        echo -e "${YELLOW}📝 Перевірте логи: tail -f logs/unified-server.log${NC}"
    fi
else
    echo -e "${RED}❌ Не вдалося запустити сервер${NC}"
    echo -e "${YELLOW}📝 Перевірте логи: cat logs/unified-server.log${NC}"
    exit 1
fi
