#!/bin/bash

# ============================================
# 🚀 DeapSeaK Complete Auto-Start
# ============================================
# Автоматичний запуск MongoDB + Unified Server
# + Автоматичне відкриття браузера
# ============================================

set -e

# Кольори
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     ██████╗ ███████╗ █████╗ ██████╗ ███████╗███████╗║
║     ██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝║
║     ██║  ██║█████╗  ███████║██████╔╝███████╗█████╗  ║
║     ██║  ██║██╔══╝  ██╔══██║██╔═══╝ ╚════██║██╔══╝  ║
║     ██████╔╝███████╗██║  ██║██║     ███████║███████╗║
║     ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝     ╚══════╝╚══════╝║
║                                                       ║
║            Lift Management System v2.0               ║
║                 Auto-Start Script                    ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

# Перехід в робочу директорію
cd /workspaces/deapseak

# 1. Зупинка попередніх процесів
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⏹️  Крок 1/5: Зупинка попередніх процесів${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

pkill -f "node.*unified-server" 2>/dev/null && echo -e "${GREEN}✅ Зупинено старий Unified Server${NC}" || echo -e "${BLUE}ℹ️  Unified Server не запущено${NC}"
sleep 2

# 1b. Автоматичний запуск Ollama (якщо встановлено і не запущено)
if command -v ollama &> /dev/null; then
    if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
        OLLAMA_MODEL_INFO=$(curl -s http://127.0.0.1:11434/api/tags | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{ try{ const m=JSON.parse(d).models||[]; console.log(m.length>0?m.map(x=>x.name).join(', '):'(no models)') }catch(e){ console.log('?') } })" 2>/dev/null || echo "?")
        echo -e "${GREEN}🦙 Ollama вже запущена. Моделі: ${OLLAMA_MODEL_INFO}${NC}"
    else
        echo -e "${YELLOW}🦙 Ollama встановлена але не запущена — стартую...${NC}"
        nohup ollama serve > /tmp/ollama.log 2>&1 &
        sleep 3
        if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
            echo -e "${GREEN}🦙 Ollama запущена на http://127.0.0.1:11434${NC}"
        else
            echo -e "${YELLOW}⚠️  Ollama не відповіла — AI буде через Gemini${NC}"
        fi
    fi
fi

# 2. Перевірка та запуск MongoDB
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔍 Крок 2/5: MongoDB${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✅ MongoDB вже запущено${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB не запущено. Запускаю...${NC}"
    mkdir -p ~/mongodb-data
    mongod --dbpath ~/mongodb-data --fork --logpath ~/mongodb-data/mongod.log
    sleep 3
    
    if pgrep -x "mongod" > /dev/null; then
        echo -e "${GREEN}✅ MongoDB успішно запущено${NC}"
    else
        echo -e "${RED}❌ Помилка запуску MongoDB${NC}"
        echo -e "${YELLOW}📋 Перевірте логи: tail -20 ~/mongodb-data/mongod.log${NC}"
        exit 1
    fi
fi

# Перевірка чи є користувачі в БД
echo -e "\n${BLUE}👥 Перевірка demo користувачів...${NC}"
USER_COUNT=$(mongosh --quiet --eval "use deapseak; db.users.countDocuments()" 2>/dev/null || echo "0")

if [ "$USER_COUNT" -eq "0" ]; then
    echo -e "${YELLOW}⚠️  База даних порожня. Створюю demo користувачів...${NC}"
    node create-demo-users.js
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Demo користувачі створені${NC}"
    else
        echo -e "${RED}❌ Помилка створення користувачів${NC}"
    fi
else
    echo -e "${GREEN}✅ Знайдено ${USER_COUNT} користувачів у БД${NC}"
fi

# 3. Встановлення залежностей
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📦 Крок 3/5: Залежності Node.js${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📥 Встановлюю npm packages...${NC}"
    npm install --silent
    echo -e "${GREEN}✅ Залежності встановлено${NC}"
else
    echo -e "${GREEN}✅ Залежності вже встановлені${NC}"
fi

# Створення папки для логів
mkdir -p logs

# 4. Запуск Unified Server
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🚀 Крок 4/5: Запуск Unified Server${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# КРИТИЧНО: Встановлюємо DEAPSEAK_PORT=5000 (обхід Codespaces PORT=3001)
export DEAPSEAK_PORT=5000
export NODE_ENV=development

echo -e "${BLUE}🔧 DEAPSEAK_PORT=${DEAPSEAK_PORT}${NC}"
echo -e "${BLUE}🔧 NODE_ENV=${NODE_ENV}${NC}\n"

# Запуск сервера в фоні
nohup node unified-server.js > logs/unified-server.log 2>&1 &
SERVER_PID=$!
echo -e "${BLUE}📝 Server PID: ${SERVER_PID}${NC}"

# Очікування запуску сервера (до 30 секунд, з retry)
echo -e "${YELLOW}⏳ Очікування запуску (до 30 секунд)...${NC}"
READY=false
for i in $(seq 1 15); do
    sleep 2
    if ps -p $SERVER_PID > /dev/null 2>&1 && curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        READY=true
        break
    fi
    echo -e "${BLUE}   ↺ ${i}/15 — ще не відповідає...${NC}"
done

# Перевірка статусу
if [ "$READY" = "true" ]; then
    echo -e "${GREEN}✅ Unified Server активний і API відповідає${NC}"
else
    if ! ps -p $SERVER_PID > /dev/null 2>&1; then
        echo -e "${RED}❌ Unified Server вилетів (процес мертвий)${NC}"
        echo -e "${YELLOW}📋 Логи:${NC}"
        cat logs/unified-server.log
        exit 1
    else
        echo -e "${YELLOW}⚠️  Сервер запущено, але API ще не відповідає — продовжуємо...${NC}"
        echo -e "${YELLOW}📋 Останні логи:${NC}"
        tail -5 logs/unified-server.log
    fi
fi

# 5. Відкриття браузера
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🌐 Крок 5/5: Відкриття веб-інтерфейсу${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Визначення URL
if [ -n "$CODESPACE_NAME" ]; then
    # GitHub Codespaces
    CODESPACE_URL="https://${CODESPACE_NAME}-5000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    WEB_URL=$CODESPACE_URL
    echo -e "${CYAN}☁️  GitHub Codespaces виявлено${NC}"
else
    # Local
    WEB_URL="http://localhost:5000"
    echo -e "${BLUE}💻 Локальне середовище${NC}"
fi

echo -e "${GREEN}🌐 URL: ${WEB_URL}${NC}\n"

# Відкрити в браузері (якщо можливо)
if [ -n "$CODESPACE_NAME" ]; then
    echo -e "${YELLOW}📱 Відкрийте URL в браузері:${NC}"
    echo -e "${CYAN}${WEB_URL}${NC}\n"
else
    # Локально - спробувати відкрити браузер
    if command -v xdg-open > /dev/null; then
        xdg-open "$WEB_URL" 2>/dev/null &
        echo -e "${GREEN}✅ Браузер відкрито${NC}\n"
    elif command -v open > /dev/null; then
        open "$WEB_URL" 2>/dev/null &
        echo -e "${GREEN}✅ Браузер відкрито${NC}\n"
    else
        echo -e "${YELLOW}📱 Відкрийте URL в браузері:${NC}"
        echo -e "${CYAN}${WEB_URL}${NC}\n"
    fi
fi

# Фінальний звіт
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ СИСТЕМА УСПІШНО ЗАПУЩЕНА!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}📊 Статус сервісів:${NC}"
echo -e "  ${GREEN}✅${NC} MongoDB:       $(pgrep mongod > /dev/null && echo -e "${GREEN}активний${NC}" || echo -e "${RED}не запущено${NC}")"
echo -e "  ${GREEN}✅${NC} Unified Server: $(ps -p $SERVER_PID > /dev/null 2>&1 && echo -e "${GREEN}активний (PID: $SERVER_PID)${NC}" || echo -e "${RED}не запущено${NC}")"
echo ""

echo -e "${BLUE}🌐 Доступні URL:${NC}"
echo -e "  ${CYAN}Головна:${NC}      ${WEB_URL}"
echo -e "  ${CYAN}API:${NC}          ${WEB_URL}/api/*"
echo -e "  ${CYAN}Логін:${NC}        ${WEB_URL}/pages/auth/login.html"
echo -e "  ${CYAN}Реєстрація:${NC}   ${WEB_URL}/pages/auth/register.html"
echo -e "  ${CYAN}Demo:${NC}         ${WEB_URL}/pages/crm-demo.html"
echo -e "  ${CYAN}AI Асистент:${NC}  ${WEB_URL}/pages/ai-demo.html"
echo ""

echo -e "${BLUE}📋 Корисні команди:${NC}"
echo -e "  ${YELLOW}Логи:${NC}         tail -f logs/unified-server.log"
echo -e "  ${YELLOW}Статус:${NC}       ps aux | grep -E 'mongod|unified-server'"
echo -e "  ${YELLOW}Зупинка:${NC}      pkill -f 'node.*unified-server' && pkill -f mongod"
echo -e "  ${YELLOW}Перезапуск:${NC}   ./autostart.sh"
echo ""

echo -e "${BLUE}👥 Demo акаунти:${NC}"
echo -e "  ${CYAN}👨‍💼 Адмін:${NC}      info@festlift.pt / admin123"
echo -e "  ${CYAN}📞 Диспетчер:${NC}  dispatcher@festlift.pt / dispatcher123"
echo -e "  ${CYAN}🔧 Технік:${NC}     tech1@festlift.pt / tech123"
echo -e "  ${CYAN}👤 Клієнт:${NC}     client@festlift.pt / client123"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Готово! Система працює на ${WEB_URL}${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Показати останні логи
echo -e "${BLUE}📋 Останні логи запуску:${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
tail -10 logs/unified-server.log | grep -E "🚀|✅|PORT|port|MongoDB" || tail -10 logs/unified-server.log
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${CYAN}💡 Порада: Відкрийте URL в браузері, не файл напряму!${NC}\n"
