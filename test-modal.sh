#!/bin/bash

# 🧪 ШВИДКИЙ ЗАПУСК ТЕСТУВАННЯ МОДАЛЬНОГО ВІКНА
# Запускає тести та відкриває візуальний звіт

echo "████████████████████████████████████████████████████████████"
echo "🧪 ТЕСТУВАННЯ МОДАЛЬНОГО ВІКНА МУНІЦИПАЛІТЕТІВ"
echo "████████████████████████████████████████████████████████████"
echo ""

# Перевірка токена
if [ ! -f "$HOME/.deapseak-token" ]; then
    echo "⚠️  JWT токен не знайдено. Логінюся..."
    TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@deapseak.com","password":"admin123"}' \
        | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo "❌ Помилка логіну. Перевірте сервер."
        exit 1
    fi
    
    echo "$TOKEN" > "$HOME/.deapseak-token"
    echo "✅ Токен збережено"
    echo ""
fi

# Запуск тестів
echo "🚀 Запуск тестів..."
echo ""
node test-municipality-modal.js | tee test-results.txt

# Статус виконання
if [ $? -eq 0 ]; then
    echo ""
    echo "████████████████████████████████████████████████████████████"
    echo "✅ ТЕСТУВАННЯ ЗАВЕРШЕНО УСПІШНО"
    echo "████████████████████████████████████████████████████████████"
    echo ""
    echo "📊 Результати збережено в: test-results.txt"
    echo "📖 Markdown звіт: MUNICIPALITY-MODAL-TEST-REPORT.md"
    echo "🎨 HTML звіт: test-municipality-modal-report.html"
    echo ""
    echo "👁️  Відкрити візуальний звіт:"
    echo "   http://localhost:5000/test-municipality-modal-report.html"
    echo ""
    
    # Спроба відкрити браузер
    if command -v xdg-open > /dev/null; then
        echo "🌐 Відкриваю браузер..."
        xdg-open "http://localhost:5000/test-municipality-modal-report.html" 2>/dev/null &
    elif [ -n "$BROWSER" ]; then
        echo "🌐 Відкриваю браузер..."
        "$BROWSER" "http://localhost:5000/test-municipality-modal-report.html" 2>/dev/null &
    else
        echo "💡 Відкрийте вручну: http://localhost:5000/test-municipality-modal-report.html"
    fi
    
else
    echo ""
    echo "████████████████████████████████████████████████████████████"
    echo "❌ ПОМИЛКА ПРИ ТЕСТУВАННІ"
    echo "████████████████████████████████████████████████████████████"
    echo ""
    echo "📋 Перевірте:"
    echo "   1. Unified Server запущений (http://localhost:5000)"
    echo "   2. MongoDB працює"
    echo "   3. Тестовий ліфт існує (69602002fa867aced6aba725)"
    echo ""
    exit 1
fi
