#!/bin/bash
# DeapSeaK v2 - Startup Script
# Запускає всі необхідні сервіси для роботи системи

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔════════════════════════════════════════════════╗"
echo "║        DeapSeaK v2 - Запуск системи            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Функція для перевірки порту
check_port() {
    local port=$1
    if lsof -ti:$port >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Функція для очікування порту
wait_for_port() {
    local port=$1
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_port $port; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    return 1
}

# 1. MongoDB
echo "1️⃣  Перевірка MongoDB..."
if docker ps | grep -q deapseak-mongodb; then
    echo "   ✅ MongoDB вже запущений"
else
    echo "   🚀 Запуск MongoDB Docker контейнера..."
    docker start deapseak-mongodb 2>/dev/null || \
    docker run -d \
        --name deapseak-mongodb \
        -p 27017:27017 \
        -v "$SCRIPT_DIR/mongodb/data:/data/db" \
        --restart unless-stopped \
        mongo:7.0
    
    echo "   ⏳ Очікування MongoDB..."
    sleep 5
    
    if docker ps | grep -q deapseak-mongodb; then
        echo "   ✅ MongoDB запущений"
    else
        echo "   ❌ Помилка запуску MongoDB"
        exit 1
    fi
fi

# 2. Backend API v2
echo ""
echo "2️⃣  Запуск Backend API v2 (port 3002)..."
if check_port 3002; then
    echo "   ⚠️  Порт 3002 зайнятий, перезапускаю..."
    lsof -ti:3002 | xargs kill 2>/dev/null || true
    sleep 2
fi

nohup node backend/app.js > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > logs/backend.pid

echo "   ⏳ Очікування Backend API..."
if wait_for_port 3002; then
    echo "   ✅ Backend API запущений (PID: $BACKEND_PID)"
else
    echo "   ❌ Backend API не запустився"
    echo "   📋 Перевірте логи: tail -f logs/backend.log"
    exit 1
fi

# 3. Frontend Server
echo ""
echo "3️⃣  Запуск Frontend Server (port 5000)..."
if check_port 5000; then
    echo "   ⚠️  Порт 5000 зайнятий, перезапускаю..."
    lsof -ti:5000 | xargs kill 2>/dev/null || true
    sleep 2
fi

nohup node frontend-server.js > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > logs/frontend.pid

echo "   ⏳ Очікування Frontend Server..."
if wait_for_port 5000; then
    echo "   ✅ Frontend Server запущений (PID: $FRONTEND_PID)"
else
    echo "   ❌ Frontend Server не запустився"
    echo "   📋 Перевірте логи: tail -f logs/frontend.log"
    exit 1
fi

# 4. Codespaces порти (якщо в Codespaces)
if [ -n "$CODESPACE_NAME" ]; then
    echo ""
    echo "4️⃣  Налаштування Codespaces портів..."
    gh codespace ports visibility 3002:public -c "$CODESPACE_NAME" 2>/dev/null || true
    gh codespace ports visibility 5000:public -c "$CODESPACE_NAME" 2>/dev/null || true
    echo "   ✅ Порти налаштовані як public"
fi

# Підсумок
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║          ✅ Система запущена!                  ║"
echo "╠════════════════════════════════════════════════╣"
echo "║  MongoDB:     http://localhost:27017           ║"
echo "║  Backend API: http://localhost:3002            ║"
echo "║  Frontend:    http://localhost:5000            ║"
echo "╠════════════════════════════════════════════════╣"

if [ -n "$CODESPACE_NAME" ]; then
    HOSTNAME=$(echo $CODESPACE_NAME | sed 's/.*\///')
    echo "║  🌐 Codespaces URLs:                           ║"
    echo "║  Frontend: https://${HOSTNAME}-5000.app.github.dev/login.html"
    echo "║  Backend:  https://${HOSTNAME}-3002.app.github.dev/health"
    echo "╠════════════════════════════════════════════════╣"
fi

echo "║                                                ║"
echo "║  📋 Логи:                                      ║"
echo "║    Backend:  tail -f logs/backend.log          ║"
echo "║    Frontend: tail -f logs/frontend.log         ║"
echo "║                                                ║"
echo "║  🛑 Зупинити:                                  ║"
echo "║    ./scripts/stop-servers.sh                   ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Тест API
echo "🔍 Тестування API..."
sleep 2
if curl -s http://localhost:3002/health | jq -e '.status == "ok"' >/dev/null 2>&1; then
    echo "✅ API Health Check: OK"
else
    echo "⚠️  API Health Check: FAILED"
fi

if curl -s http://localhost:5000/status | jq -e '.status == "ok"' >/dev/null 2>&1; then
    echo "✅ Frontend Health Check: OK"
else
    echo "⚠️  Frontend Health Check: FAILED"
fi

echo ""
echo "✨ Готово! Можна працювати!"
