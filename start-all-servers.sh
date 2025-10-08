#!/bin/bash

# Скрипт для запуску всіх серверів DeapSeak системи
# Включає API сервер, WebSocket сервер та веб сервер

echo "🚀 Запуск DeapSeak системи..."

# Перевірка наявності Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не встановлено!"
    exit 1
fi

# Перевірка наявності MongoDB
if ! pgrep mongod > /dev/null; then
    echo "⚠️ MongoDB не запущено. Спробуйте запустити: sudo systemctl start mongod"
fi

# Функція для запуску процесу в фоні
start_server() {
    local name=$1
    local command=$2
    local port=$3
    local log_file=$4
    
    echo "📡 Запуск $name на порту $port..."
    
    # Перевірити чи порт вільний
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️ Порт $port вже зайнятий. Зупиняємо процес..."
        kill $(lsof -t -i:$port) 2>/dev/null || true
        sleep 2
    fi
    
    # Запустити сервер
    nohup $command > $log_file 2>&1 &
    local pid=$!
    
    # Перевірити запуск
    sleep 3
    if ps -p $pid > /dev/null; then
        echo "✅ $name запущено (PID: $pid)"
        return 0
    else
        echo "❌ Не вдалося запустити $name"
        return 1
    fi
}

# Створити директорію для логів
mkdir -p logs

# Запуск API сервера (MongoDB + REST API)
start_server "API Server" "node api-server.js" "3001" "logs/api-server.log"

# Запуск WebSocket сервера
start_server "WebSocket Server" "node websocket-server.js" "3002" "logs/websocket-server.log"

# Запуск веб сервера для статичних файлів
start_server "Web Server" "python3 -m http.server 8080" "8080" "logs/web-server.log"

echo ""
echo "🎉 Всі сервери запущено!"
echo ""
echo "📊 Стан серверів:"
echo "   🔗 Веб інтерфейс:    http://localhost:8080"
echo "   🔗 API сервер:       http://localhost:3001"
echo "   🔗 WebSocket сервер: ws://localhost:3002"
echo ""
echo "📋 Корисні команди:"
echo "   Перевірити статус:   curl http://localhost:3001/api/status"
echo "   Зупинити всі:        ./stop-servers.sh"
echo "   Переглянути логи:    tail -f logs/*.log"
echo "   Тестування:          http://localhost:8080/test-comprehensive-system.html"
echo ""

# Перевірка роботи серверів
sleep 5
echo "🔍 Перевірка доступності серверів..."

# Перевірка API
if curl -s http://localhost:3001/api/status > /dev/null; then
    echo "✅ API сервер відповідає"
else
    echo "❌ API сервер не відповідає"
fi

# Перевірка веб сервера
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Веб сервер відповідає"
else
    echo "❌ Веб сервер не відповідає"
fi

# Перевірка WebSocket (базова)
if netstat -ln | grep :3002 > /dev/null; then
    echo "✅ WebSocket сервер слухає на порту 3002"
else
    echo "❌ WebSocket сервер не доступний"
fi

echo ""
echo "✨ Система готова до роботи!"
echo "🔗 Відкрийте http://localhost:8080 для початку роботи"