#!/bin/bash

# ============================================
# 🤖 Add AI Widget Universal to All Pages
# ============================================
# 
# Цей скрипт автоматично додає універсальний
# AI віджет до всіх HTML сторінок проекту
#
# Використання: ./add-ai-widget-to-all.sh
# ============================================

echo "🤖 AI Widget Universal - Автоматичне додавання до всіх сторінок"
echo "================================================================"
echo ""

# Кольори для виводу
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Лічильники
TOTAL=0
ADDED=0
SKIPPED=0
ERRORS=0

# Рядок для додавання
WIDGET_SCRIPT='    <script src="/components/ai-widget-universal.js"></script>'

# Функція для перевірки чи вже є віджет
has_widget() {
    local file="$1"
    grep -q "ai-widget-universal.js" "$file" 2>/dev/null
    return $?
}

# Функція для додавання віджету
add_widget() {
    local file="$1"
    
    # Перевірка чи файл існує
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Файл не знайдено: $file${NC}"
        ((ERRORS++))
        return 1
    fi
    
    # Перевірка чи вже є віджет
    if has_widget "$file"; then
        echo -e "${YELLOW}⏭️  Пропущено (віджет вже є): $file${NC}"
        ((SKIPPED++))
        return 0
    fi
    
    # Перевірка чи є закриваючий тег </body>
    if ! grep -q "</body>" "$file"; then
        echo -e "${YELLOW}⚠️  Пропущено (немає </body>): $file${NC}"
        ((SKIPPED++))
        return 0
    fi
    
    # Створення backup
    cp "$file" "$file.backup"
    
    # Додавання віджету перед </body>
    sed -i "/<\/body>/i\\
$WIDGET_SCRIPT" "$file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Додано віджет: $file${NC}"
        ((ADDED++))
        # Видалення backup якщо все ок
        rm "$file.backup"
        return 0
    else
        echo -e "${RED}❌ Помилка при додаванні: $file${NC}"
        # Відновлення з backup
        mv "$file.backup" "$file"
        ((ERRORS++))
        return 1
    fi
}

echo -e "${BLUE}📁 Пошук HTML файлів...${NC}"
echo ""

# Пошук всіх HTML файлів (крім архіву)
HTML_FILES=$(find pages -name "*.html" -not -path "*/archive/*" -not -path "*/old-*" -type f | sort)

# Обробка кожного файлу
for file in $HTML_FILES; do
    ((TOTAL++))
    add_widget "$file"
done

echo ""
echo "================================================================"
echo -e "${BLUE}📊 СТАТИСТИКА:${NC}"
echo "================================================================"
echo -e "📄 Всього файлів:       ${TOTAL}"
echo -e "${GREEN}✅ Додано віджет:       ${ADDED}${NC}"
echo -e "${YELLOW}⏭️  Пропущено:          ${SKIPPED}${NC}"
echo -e "${RED}❌ Помилок:             ${ERRORS}${NC}"
echo "================================================================"

if [ $ADDED -gt 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Віджет успішно додано до $ADDED файлів!${NC}"
    echo ""
    echo -e "${BLUE}💡 Що далі:${NC}"
    echo "   1. Перевірте кілька сторінок в браузері"
    echo "   2. Відкрийте http://localhost:5000/ai-widget-demo.html для тесту"
    echo "   3. Якщо все працює - зробіть git commit"
    echo ""
fi

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo -e "${RED}⚠️  Виникли помилки. Перевірте файли вручну.${NC}"
    exit 1
fi

exit 0
