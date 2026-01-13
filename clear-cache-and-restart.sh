#!/bin/bash

echo "🧹 Очищення кешу та перезапуск системи..."

# 1. Зупинка сервера
echo "1️⃣ Зупинка unified-server..."
pkill -f "node.*unified-server" 2>/dev/null
sleep 2

# 2. Додавання timestamp до JavaScript файлів (version busting)
echo "2️⃣ Оновлення версій JavaScript файлів..."
TIMESTAMP=$(date +%s)

# Створюємо резервні копії
cp pages/client/my-lifts.html pages/client/my-lifts.html.backup
cp assets/js/auth.js assets/js/auth.js.backup
cp assets/js/modules/lifts-manager.js assets/js/modules/lifts-manager.js.backup

# Додаємо timestamp до посилань на скрипти в my-lifts.html
sed -i "s|auth\.js|auth.js?v=$TIMESTAMP|g" pages/client/my-lifts.html
sed -i "s|lifts-manager\.js|lifts-manager.js?v=$TIMESTAMP|g" pages/client/my-lifts.html
sed -i "s|push-notifications-client\.js|push-notifications-client.js?v=$TIMESTAMP|g" pages/client/my-lifts.html
sed -i "s|messenger-client\.js|messenger-client.js?v=$TIMESTAMP|g" pages/client/my-lifts.html
sed -i "s|voice-assistant-client\.js|voice-assistant-client.js?v=$TIMESTAMP|g" pages/client/my-lifts.html

echo "   ✅ Версії оновлено: ?v=$TIMESTAMP"

# 3. Перезапуск сервера
echo "3️⃣ Запуск unified-server..."
cd /workspaces/deapseak
nohup node unified-server.js > logs/unified-server.log 2>&1 &
sleep 3

# 4. Перевірка
if pgrep -f "node.*unified-server" > /dev/null; then
    echo "   ✅ Сервер запущено (PID: $(pgrep -f 'node.*unified-server'))"
else
    echo "   ❌ Помилка запуску! Перевірте logs/unified-server.log"
    exit 1
fi

# 5. Тест API
echo "4️⃣ Тестування API..."
HEALTH=$(curl -s http://localhost:5000/api/health | grep -o '"status":"ok"')
if [ -n "$HEALTH" ]; then
    echo "   ✅ API працює"
else
    echo "   ⚠️ API не відповідає"
fi

echo ""
echo "✅ ГОТОВО! Тепер виконайте в браузері:"
echo ""
echo "1️⃣ Натисніть Ctrl+Shift+Delete"
echo "2️⃣ Виберіть 'Cached images and files' та 'Cookies'"
echo "3️⃣ Time range: 'All time'"
echo "4️⃣ Натисніть 'Clear data'"
echo ""
echo "5️⃣ Перейдіть на сторінку:"
echo "   http://127.0.0.1:5000/pages/client/my-lifts.html?t=$TIMESTAMP"
echo ""
echo "6️⃣ Натисніть Ctrl+F5 (hard refresh)"
echo ""
echo "📝 Логи сервера: tail -f logs/unified-server.log"
echo ""
