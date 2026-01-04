#!/bin/bash
# ЕКСТРЕНЕ ВИДАЛЕННЯ ВІДЖЕТУ

echo "🚨 ВИДАЛЯЮ AI WIDGET З УСІХ СТОРІНОК..."

REMOVED=0

for file in $(find pages/ -name "*.html" -type f ! -path "*/archive/*"); do
    if grep -q "ai-widget-universal.js" "$file"; then
        # Видалити рядки з віджетом
        sed -i '/ai-widget-universal.js/d' "$file"
        sed -i '/<!-- AI Universal Widget -->/d' "$file"
        echo "✓ $file"
        ((REMOVED++))
    fi
done

echo ""
echo "📊 Видалено віджет з $REMOVED файлів"
echo "✅ ГОТОВО! Перезавантажте сторінку (Ctrl+Shift+R)"
