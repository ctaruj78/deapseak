#!/bin/bash

# ═══════════════════════════════════════════════════════════
# Скрипт для додавання config.js до всіх HTML сторінок
# ═══════════════════════════════════════════════════════════

echo "🔧 Додавання config.js до всіх HTML сторінок..."

# Лічильник
count=0

# Знаходимо всі HTML файли в pages/
find pages -name "*.html" -type f | while read file; do
    # Перевіряємо чи вже є config.js
    if ! grep -q "config.js" "$file"; then
        # Шукаємо рядок з auth.js
        if grep -q "auth.js" "$file"; then
            # Додаємо config.js перед auth.js
            sed -i '/auth\.js/i\    <!-- 🔌 КОНФІГУРАЦІЯ ПОРТІВ (завантажується ПЕРШОЮ!) -->\n    <script src="../../assets/js/config.js?v=20241116"></script>\n' "$file"
            echo "✅ Додано config.js до: $file"
            ((count++))
        fi
    else
        echo "⏭️  Пропущено (вже є config.js): $file"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Готово! Оброблено файлів: $count"
echo "═══════════════════════════════════════════════════════════"
