#!/bin/bash

echo "� DEAPSEAK - Налаштування портів для GitHub Codespaces"
echo "====================================================="

# Функція для відкриття порту
open_port() {
    local port=$1
    local name=$2
    
    echo "🔓 Відкриваю порт $port для $name..."
    
    # Використовуємо gh CLI для відкриття порту
    if command -v gh &> /dev/null; then
        gh codespace ports visibility $port:public 2>/dev/null || echo "  ⚠️  Порт $port вже налаштований або gh CLI недоступний"
    fi
    
    # Також спробуємо через curl до Codespaces API
    echo "  📡 Перевіряю доступність порту $port..."
    
    # Отримуємо назву Codespace з середовища
    if [ -n "$CODESPACE_NAME" ]; then
        CODESPACE_URL="https://${CODESPACE_NAME}-${port}.app.github.dev"
        echo "  🌐 URL: $CODESPACE_URL"
        
        # Тестуємо доступність
        if curl -s --max-time 5 "$CODESPACE_URL" >/dev/null 2>&1; then
            echo "  ✅ Порт $port доступний публічно"
        else
            echo "  ❌ Порт $port недоступний публічно"
            echo "  💡 Відкрийте порт вручну в Codespaces: Ports -> Forward Port -> $port -> Change Visibility -> Public"
        fi
    else
        echo "  ⚠️  Не в Codespaces середовищі"
    fi
}

echo ""
echo "🔍 Перевіряю необхідні порти..."

# Функція для встановлення публічної видимості порту
set_port_public() {
    local port=$1
    echo "📡 Налаштування порту $port як PUBLIC..."
    
    # Використання gh CLI для налаштування порту
    if command -v gh &> /dev/null; then
        gh codespace ports visibility $port:public -c $CODESPACE_NAME 2>/dev/null || echo "⚠️ Не вдалося змінити через gh CLI"
    fi
    
    # Альтернативний метод - через VS Code
    echo "💡 Відкрийте Ports панель у VS Code та змініть visibility порту $port на 'Public'"
}

# Перевірка чи ми в Codespaces
if [ -n "$CODESPACE_NAME" ]; then
    echo "✅ GitHub Codespaces виявлено: $CODESPACE_NAME"
    echo ""
    
    # Налаштування портів
    set_port_public 3001
    set_port_public 8080
    set_port_public 8081
    
    echo ""
    echo "=============================================="
    echo "✅ Готово!"
    echo ""
    echo "📋 ВАЖЛИВІ КРОКИ:"
    echo "1. Відкрийте панель PORTS у VS Code:"
    echo "   - Натисніть Ctrl+Shift+\` (або Ctrl+J)"
    echo "   - Перейдіть на вкладку 'PORTS'"
    echo ""
    echo "2. Знайдіть порт 3001 (api-server.js)"
    echo "   - Клікніть правою кнопкою на порт 3001"
    echo "   - Виберіть 'Port Visibility' → 'Public'"
    echo ""
    echo "3. Те саме для портів 8080 та 8081 якщо потрібно"
    echo ""
    echo "🔗 Публічні URL будуть:"
    echo "   API:  https://$CODESPACE_NAME-3001.app.github.dev"
    echo "   Web:  https://$CODESPACE_NAME-8080.app.github.dev"
    echo ""
    
else
    echo "⚠️ Це не GitHub Codespaces"
    echo "Налаштування портів не потрібні для локальної розробки"
fi

echo ""
echo "🚀 Тепер перезавантажте сторінку логіну та спробуйте ще раз!"
