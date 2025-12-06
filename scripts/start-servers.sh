#!/bin/bash

echo "🚀 Запускаю сервери DeapSeaK..."

# Перевіряємо чи MongoDB працює
if ! pgrep -f mongod > /dev/null; then
    echo "📂 Запускаю MongoDB..."
    sudo mkdir -p /data/db && sudo chown -R $USER:$USER /data/db
    mongod --dbpath /data/db --logpath /data/db/mongod.log --fork
    sleep 3
else
    echo "✅ MongoDB вже працює"
fi

# Перевіряємо чи API сервер працює
if ! pgrep -f "node api-server.js" > /dev/null; then
    echo "🔧 Запускаю API сервер..."
    cd /workspaces/deapseak
    nohup node api-server.js > api-server.log 2>&1 &
    sleep 2
else
    echo "✅ API сервер вже працює"
fi

# Перевіряємо чи веб-сервер працює
if ! pgrep -f "http.server 8080" > /dev/null; then
    echo "🌐 Запускаю веб-сервер..."
    cd /workspaces/deapseak
    nohup python3 -m http.server 8080 > web-server.log 2>&1 &
    sleep 2
else
    echo "✅ Веб-сервер вже працює"
fi

echo ""
echo "🎉 Готово! Ваші сервери:"
echo "📊 MongoDB:     localhost:27017"
echo "🔗 API сервер:  http://localhost:3001"
echo "🌐 Веб-сайт:    http://localhost:8080"
echo ""
echo "📋 Тестові сторінки:"
echo "🔍 QR API тест: http://localhost:8080/test-qr-api.html"
echo "🏠 Головна:     http://localhost:8080/index.html"
echo "🔑 Логін:       http://localhost:8080/login.html"
echo ""
echo "👨‍💻 Для зупинки процесів використайте: pkill -f 'mongod|api-server|http.server'"