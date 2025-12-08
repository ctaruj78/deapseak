#!/bin/bash

# 🔧 Автоматичне підключення Profile API до всіх профілів
# Додає profile-api.js та ініціалізацію до всіх сторінок профілів

echo "🚀 Підключення Profile API Manager до всіх профілів..."
echo ""

TOTAL=0
SUCCESS=0

# Функція для додавання Profile API
add_profile_api() {
    local file=$1
    local depth=$2  # ../../ або ../
    
    echo "📝 Обробка: $(basename $(dirname $file))/$(basename $file)"
    
    # Перевірка чи вже підключено
    if grep -q "profile-api.js" "$file"; then
        echo "   ⚠️  Profile API вже підключено, пропускаємо"
        return
    fi
    
    TOTAL=$((TOTAL + 1))
    
    # Створюємо резервну копію
    cp "$file" "$file.backup"
    
    # Знаходимо рядок з Chart.js або AI Assistant
    if grep -q "chart.umd.min.js" "$file"; then
        # Додаємо ПІСЛЯ Chart.js
        sed -i '/chart\.umd\.min\.js/a \
\
<!-- Profile API Manager -->\
<script src="'"${depth}"'assets/js/modules/profile-api.js"></script>' "$file"
        
        # Додаємо ініціалізацію
        sed -i '/<script>/a \
        \/\/ 🔄 Ініціалізація Profile API\
        document.addEventListener('\''DOMContentLoaded'\'', async function() {\
            if (window.profileAPI) {\
                try {\
                    await window.profileAPI.init();\
                } catch (error) {\
                    console.error('\''Помилка ініціалізації профілю:'\'' error);\
                }\
            }\
        });\
        ' "$file"
        
        SUCCESS=$((SUCCESS + 1))
        echo "   ✅ Profile API підключено успішно"
        rm "$file.backup"
    else
        echo "   ⚠️  Chart.js не знайдено, пропускаємо"
        rm "$file.backup"
    fi
}

# Обробка файлів
echo "📂 Обробка профілів в pages/admin/"
add_profile_api "/workspaces/deapseak/pages/admin/profile.html" "../../"

echo ""
echo "📂 Обробка профілів в pages/client/"
add_profile_api "/workspaces/deapseak/pages/client/profile.html" "../../"

echo ""
echo "📂 Обробка профілів в pages/dispatcher/"
add_profile_api "/workspaces/deapseak/pages/dispatcher/profile.html" "../../"

echo ""
echo "📂 Обробка профілів в pages/tech/"
add_profile_api "/workspaces/deapseak/pages/tech/profile.html" "../../"

echo ""
echo "📂 Обробка профілів в pages/ai-assistant/"
add_profile_api "/workspaces/deapseak/pages/ai-assistant/profile.html" "../../"

echo ""
echo "═══════════════════════════════════════"
echo "✅ ПІДКЛЮЧЕННЯ ЗАВЕРШЕНО!"
echo "═══════════════════════════════════════"
echo "📊 Статистика:"
echo "   Оброблено профілів: $TOTAL"
echo "   Успішно підключено: $SUCCESS"
echo ""
echo "💡 Наступні кроки:"
echo "   1. Тестуй admin/profile.html (вже підключено вручну)"
echo "   2. Якщо працює - запусти цей скрипт для інших"
echo "   3. git commit"
echo ""
