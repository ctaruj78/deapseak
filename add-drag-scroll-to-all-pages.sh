#!/bin/bash

# Скрипт для додавання Universal Drag-to-Scroll до всіх HTML сторінок
# Автоматично знаходить сторінки з таблицями та додає необхідні файли

echo "🔍 Пошук HTML сторінок з таблицями..."

# Знайти всі HTML файли з .table-responsive
FILES=$(grep -rl "table-responsive" pages/ --include="*.html" 2>/dev/null)

if [ -z "$FILES" ]; then
    echo "❌ Не знайдено HTML файлів з таблицями"
    exit 1
fi

COUNT=0
UPDATED=0

echo "📋 Знайдено сторінок з таблицями:"
echo "$FILES" | while read -r file; do
    echo "  - $file"
    COUNT=$((COUNT + 1))
done

echo ""
echo "🚀 Додавання drag-to-scroll компонентів..."
echo ""

for file in $FILES; do
    # Перевірити чи вже додано CSS
    if grep -q "table-drag-scroll.css" "$file"; then
        echo "⏭️  Пропускаємо $file (вже має CSS)"
        continue
    fi
    
    # Перевірити чи вже додано JS
    if grep -q "table-drag-scroll.js" "$file"; then
        echo "⏭️  Пропускаємо $file (вже має JS)"
        continue
    fi
    
    echo "✏️  Оновлюємо $file..."
    
    # Знайти останній <link> в <head> та додати після нього
    if grep -q "</head>" "$file"; then
        # Додати CSS перед </head>
        sed -i 's|</head>|    <link rel="stylesheet" href="/assets/css/table-drag-scroll.css">\n</head>|' "$file"
        echo "   ✅ CSS додано"
    else
        echo "   ⚠️  Не знайдено </head>"
    fi
    
    # Знайти останній <script> перед </body> та додати після нього
    if grep -q "</body>" "$file"; then
        # Додати JS перед </body>
        sed -i 's|</body>|    <script src="/assets/js/table-drag-scroll.js"></script>\n</body>|' "$file"
        echo "   ✅ JS додано"
    else
        echo "   ⚠️  Не знайдено </body>"
    fi
    
    UPDATED=$((UPDATED + 1))
    echo ""
done

echo ""
echo "✅ Готово!"
echo "📊 Оновлено файлів: $UPDATED"
echo ""
echo "🧪 Для тестування:"
echo "   ./autostart.sh"
echo "   Відкрийте будь-яку сторінку з таблицею та спробуйте drag-to-scroll"
echo ""
