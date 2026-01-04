#!/bin/bash
# Швидка міграція AI віджету

echo "🚀 Starting quick migration..."

TOTAL=0
ADDED=0

# Знайти всі HTML в pages/ (виключаючи archive)
for file in $(find pages/ -name "*.html" ! -path "*/archive/*"); do
    ((TOTAL++))
    
    # Пропустити якщо вже є
    if grep -q "ai-widget-universal.js" "$file"; then
        continue
    fi
    
    # Пропустити якщо немає </body>
    if ! grep -q "</body>" "$file"; then
        continue
    fi
    
    # Backup
    cp "$file" "${file}.bak"
    
    # Видалити старі віджети
    sed -i '/ai-widget\.js/d' "$file"
    sed -i '/ai-assistant-include/d' "$file"
    sed -i '/ai-assistant\.js/d' "$file"
    sed -i '/<!-- AI Assistant/d' "$file"
    
    # Додати новий віджет
    sed -i '/<\/body>/i\    <!-- AI Universal Widget -->\n    <script src="/components/ai-widget-universal.js"></script>' "$file"
    
    # Перевірити
    if grep -q "ai-widget-universal.js" "$file"; then
        echo "✓ $file"
        rm "${file}.bak"
        ((ADDED++))
    else
        echo "✗ $file FAILED"
        mv "${file}.bak" "$file"
    fi
done

echo ""
echo "📊 Total: $TOTAL files"
echo "✓ Added: $ADDED widgets"
echo ""
echo "🎉 Done!"
