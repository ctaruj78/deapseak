#!/bin/bash

echo "🧹 Повне очищення кешу та перезавантаження системи"
echo "=================================================="
echo ""

# 1. Зупинка сервера
echo "1️⃣ Зупинка unified-server..."
pkill -f "node.*unified-server" 2>/dev/null
sleep 2

# 2. Додавання нового timestamp
TIMESTAMP=$(date +%s)
echo "2️⃣ Версія JavaScript: v${TIMESTAMP}"

# 3. Запуск сервера
echo "3️⃣ Запуск unified-server на порту 5000..."
cd /workspaces/deapseak
nohup node unified-server.js > logs/unified-server.log 2>&1 &
sleep 3

# 4. Перевірка
PID=$(pgrep -f "node.*unified-server")
if [ -n "$PID" ]; then
    echo "   ✅ Сервер запущено (PID: $PID)"
else
    echo "   ❌ Помилка запуску!"
    exit 1
fi

# 5. Перевірка портів
echo "4️⃣ Перевірка портів..."
if lsof -i :5000 >/dev/null 2>&1 || netstat -tln 2>/dev/null | grep -q ":5000"; then
    echo "   ✅ Порт 5000: unified-server"
else
    echo "   ⚠️ Порт 5000 не слухається"
fi

if lsof -i :3002 >/dev/null 2>&1 || netstat -tln 2>/dev/null | grep -q ":3002"; then
    echo "   ⚠️ УВАГА: Порт 3002 досі активний (старий сервер?)"
    echo "   Виконайте: pkill -f 'node.*3002'"
fi

# 6. Тест API
echo "5️⃣ Тест API..."
HEALTH=$(curl -s http://localhost:5000/api/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "   ✅ API працює"
else
    echo "   ❌ API не відповідає"
fi

# 7. Перевірка WebSocket в логах
echo "6️⃣ Перевірка WebSocket..."
if grep -q "WebSocket server running" logs/unified-server.log 2>/dev/null; then
    echo "   ✅ WebSocket server ініціалізовано"
else
    echo "   ⚠️ WebSocket: перевірте logs/unified-server.log"
fi

# 8. Інструкції для браузера
echo ""
echo "=============================================="
echo "✅ СЕРВЕР ГОТОВИЙ!"
echo "=============================================="
echo ""
echo "🌐 URL: http://127.0.0.1:5000"
echo "📡 WebSocket: ws://localhost:5000"
echo "🔑 Login: client@festlift.pt / client123"
echo ""
echo "🧹 ОБОВ'ЯЗКОВО очистіть кеш браузера:"
echo ""
echo "   Chrome/Edge:"
echo "   1. Ctrl+Shift+Delete"
echo "   2. Time range: 'All time'"
echo "   3. ✅ Cookies and site data"
echo "   4. ✅ Cached images and files"
echo "   5. Clear data"
echo ""
echo "   Або через DevTools (F12):"
echo "   1. Network tab → Disable cache ✅"
echo "   2. Правий клік на Reload → Empty Cache and Hard Reload"
echo ""
echo "🔄 Після очищення кешу:"
echo "   - Відкрийте: http://127.0.0.1:5000/login.html"
echo "   - Залогіньтесь як client@festlift.pt"
echo "   - Перейдіть на Dashboard"
echo "   - Перевірте консоль (F12) - має бути:"
echo "     ✅ [WebSocket] Підключення для ролі: client до ws://localhost:5000"
echo "     ✅ [WebSocket] Підключено успішно"
echo ""
echo "📊 Очікувана кількість ліфтів: 5"
echo ""
echo "📝 Логи сервера:"
echo "   tail -f logs/unified-server.log"
echo ""
