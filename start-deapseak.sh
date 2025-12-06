#!/bin/bash

echo "🚀 Запуск DeapSeaK Server..."
echo ""

# Зупиняємо старі процеси
pkill -f "node.*unified-server" 2>/dev/null && echo "🛑 Зупинено старі процеси"

# Перевіряємо MongoDB
if ! pgrep -x mongod > /dev/null; then
    echo "⚠️  MongoDB не запущено. Запускаю..."
    sudo systemctl start mongod
    sleep 2
fi

# Запускаємо Unified Server
cd /workspaces/deapseak
node unified-server.js > logs/unified-server.log 2>&1 &
SERVER_PID=$!

# Чекаємо запуску
sleep 3

# Перевіряємо
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ | grep -q "200"; then
    echo "✅ Server запущено на http://localhost:3001"
    echo "📝 PID: $SERVER_PID"
    echo "📋 Логи: logs/unified-server.log"
    echo ""
    echo "🌐 Доступні URL:"
    echo "   • Головна: http://localhost:3001/index.html"
    echo "   • CRM Demo: http://localhost:3001/pages/crm-demo.html"
    echo "   • AI Demo: http://localhost:3001/pages/ai-demo.html"
    echo "   • Логін: http://localhost:3001/pages/auth/login.html"
else
    echo "❌ Помилка запуску сервера"
    echo "📋 Перевірте логи: tail -f logs/unified-server.log"
    exit 1
fi
