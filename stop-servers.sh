#!/bin/bash

# Скрипт для зупинки всіх серверів DeapSeak системи

echo "🛑 Зупинка DeapSeak системи..."

# Функція для зупинки процесу на порту
stop_port() {
    local port=$1
    local name=$2
    
    echo "🔍 Пошук процесів на порту $port..."
    
    local pids=$(lsof -t -i:$port 2>/dev/null)
    
    if [ -z "$pids" ]; then
        echo "✅ $name: немає активних процесів на порту $port"
        return 0
    fi
    
    echo "🔄 Зупинка $name (PID: $pids)..."
    
    # Спочатку спробуємо м'яко зупинити
    kill $pids 2>/dev/null
    sleep 3
    
    # Перевіримо чи зупинився
    local remaining=$(lsof -t -i:$port 2>/dev/null)
    
    if [ -z "$remaining" ]; then
        echo "✅ $name зупинено"
        return 0
    fi
    
    # Якщо не зупинився, примусово
    echo "🔥 Примусова зупинка $name..."
    kill -9 $remaining 2>/dev/null
    sleep 2
    
    # Фінальна перевірка
    if lsof -t -i:$port >/dev/null 2>&1; then
        echo "❌ Не вдалося зупинити $name"
        return 1
    else
        echo "✅ $name примусово зупинено"
        return 0
    fi
}

# Зупинити сервери по портах
stop_port "3001" "API Server"
stop_port "3002" "WebSocket Server" 
stop_port "8080" "Web Server"

# Зупинити процеси за іменами (додаткова безпека)
echo ""
echo "🔍 Пошук процесів за іменами..."

# Node.js процеси
if pgrep -f "api-server.js" > /dev/null; then
    echo "🔄 Зупинка api-server.js..."
    pkill -f "api-server.js"
fi

if pgrep -f "websocket-server.js" > /dev/null; then
    echo "🔄 Зупинка websocket-server.js..."
    pkill -f "websocket-server.js"
fi

# Python HTTP сервер
if pgrep -f "http.server 8080" > /dev/null; then
    echo "🔄 Зупинка python http.server..."
    pkill -f "http.server 8080"
fi

# Очистити nohup файли
if [ -f nohup.out ]; then
    rm nohup.out
    echo "🧹 Видалено nohup.out"
fi

# Показати стан портів
echo ""
echo "📊 Фінальна перевірка портів:"

for port in 3001 3002 8080; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "❌ Порт $port ще зайнятий"
    else
        echo "✅ Порт $port вільний"
    fi
done

echo ""
echo "🎉 Зупинка завершена!"
echo ""
echo "📋 Для повторного запуску використовуйте:"
echo "   ./start-all-servers.sh"