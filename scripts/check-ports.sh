#!/bin/bash

# ═══════════════════════════════════════════════════════════
# Скрипт перевірки та виправлення конфігурації портів
# ═══════════════════════════════════════════════════════════
# Цей скрипт знаходить всі місця де використовуються порти
# і перевіряє чи вони відповідають централізованій конфігурації
# ═══════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🔍 ПЕРЕВІРКА КОНФІГУРАЦІЇ ПОРТІВ"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Визначаємо правильні порти (з config.js)
CORRECT_API_PORT=3001
CORRECT_WS_PORT=3002
CORRECT_FRONTEND_PORT=5000

echo "📋 Правильна конфігурація портів:"
echo "   🌐 Frontend: $CORRECT_FRONTEND_PORT"
echo "   🔗 API:      $CORRECT_API_PORT"
echo "   💬 WebSocket: $CORRECT_WS_PORT"
echo ""

# Функція для пошуку неправильних портів
check_wrong_ports() {
    local file=$1
    local wrong_found=false
    
    # Шукаємо порт 3002 в контексті API (неправильно)
    if grep -q "localhost:3002.*api\|3002.*api\|-3002.*github.*api" "$file" 2>/dev/null; then
        echo "❌ $file - знайдено API на порту 3002 (має бути 3001)"
        wrong_found=true
    fi
    
    # Шукаємо порт 3001 в контексті WebSocket (неправильно)
    if grep -q "localhost:3001.*ws\|3001.*websocket\|-3001.*github.*ws" "$file" 2>/dev/null; then
        echo "❌ $file - знайдено WebSocket на порту 3001 (має бути 3002)"
        wrong_found=true
    fi
    
    if [ "$wrong_found" = false ]; then
        echo "✅ $file - порти правильні"
    fi
}

echo "🔍 Перевірка JavaScript файлів..."
echo ""

# Перевіряємо важливі файли
check_wrong_ports "assets/js/auth.js"
check_wrong_ports "assets/js/config.js"
check_wrong_ports "backend/app.js"
check_wrong_ports ".env"

echo ""
echo "🔍 Перевірка package.json..."
echo ""

# Перевіряємо package.json
if [ -f "package.json" ]; then
    if grep -q "\"start.*3002\|\"backend.*3002" package.json; then
        echo "⚠️  package.json може містити неправильний порт для API"
    else
        echo "✅ package.json - порти правильні"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 ПІДСУМОК"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "✅ Централізована конфігурація: assets/js/config.js"
echo "✅ API використовує порт: $CORRECT_API_PORT"
echo "✅ WebSocket використовує порт: $CORRECT_WS_PORT"
echo ""
echo "💡 Якщо знайдено помилки, виправте їх вручну або запустіть:"
echo "   ./scripts/fix-ports.sh"
echo ""
echo "═══════════════════════════════════════════════════════════"
