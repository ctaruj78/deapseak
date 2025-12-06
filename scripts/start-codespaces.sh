#!/bin/bash

echo "🚀 Запуск DeapSeaK у GitHub Codespaces"
echo "======================================"

# Зупиняємо існуючі процеси
echo "🛑 Зупиняємо існуючі сервери..."
pkill -f "node api-server.js" 2>/dev/null
pkill -f "python.*http.server" 2>/dev/null
sleep 2

# Перевіряємо MongoDB
echo "🔍 Перевіряємо MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️ MongoDB не запущено. Спробуйте запустити вручну."
fi

# Запускаємо API сервер у фоні
echo "🔧 Запускаємо API сервер (порт 3001)..."
cd /workspaces/deapseak
nohup node api-server.js > api.log 2>&1 &
API_PID=$!
echo "✅ API сервер запущено (PID: $API_PID)"

# Чекаємо поки API сервер запуститься
sleep 3

# Перевіряємо API
echo "🩺 Перевіряємо API health..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ API сервер працює"
else
    echo "❌ API сервер не відповідає"
fi

# Запускаємо веб-сервер у фоні
echo "🌐 Запускаємо веб-сервер (порт 8080)..."
nohup python3 -m http.server 8080 > web.log 2>&1 &
WEB_PID=$!
echo "✅ Веб-сервер запущено (PID: $WEB_PID)"

sleep 2

# Показуємо інформацію про порти
echo ""
echo "📡 Інформація про порти:"
echo "========================"
echo "🌐 Веб-сервер:  http://localhost:8080"
echo "🔧 API сервер:  http://localhost:3001"
echo ""

# Перевіряємо Codespaces URLs
if [ ! -z "$CODESPACE_NAME" ]; then
    DOMAIN="app.github.dev"
    WEB_URL="https://${CODESPACE_NAME}-8080.${DOMAIN}"
    API_URL="https://${CODESPACE_NAME}-3001.${DOMAIN}"
    
    echo "🌐 Codespaces URLs:"
    echo "==================="
    echo "🏠 Головна сторінка: $WEB_URL"
    echo "🔐 Логін:           $WEB_URL/login.html"
    echo "🧪 Тести:           $WEB_URL/test-codespaces-urls.html"
    echo "🔧 API Health:      $API_URL/api/health"
    echo ""
    echo "⚠️ ВАЖЛИВО: Переконайтесь що порти 8080 та 3001 мають статус 'Public'"
    echo "   У VS Code: Панель PORTS → клікнути на замок 🔒 → змінити на Public 🌐"
fi

echo ""
echo "🎯 Для зупинки серверів використайте:"
echo "   kill $API_PID $WEB_PID"
echo ""
echo "📝 Логи:"
echo "   API: tail -f api.log"
echo "   Web: tail -f web.log"
echo ""
echo "🚀 DeapSeaK готовий до роботи!"