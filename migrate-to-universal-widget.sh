#!/bin/bash

# Міграція на Universal AI Widget
# Автоматично замінює старі віджети на новий universal widget

set -e

# Кольори
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Лічильники
TOTAL=0
MIGRATED=0
SKIPPED=0
ERRORS=0

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 AI Widget Migration to Universal      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Функція для міграції одного файлу
migrate_file() {
    local file="$1"
    local backup_file="${file}.migration-backup"
    
    # Перевірити чи вже має universal widget
    if grep -q "ai-widget-universal.js" "$file"; then
        echo -e "${YELLOW}⊘ Skipped:${NC} $file (already has universal widget)"
        ((SKIPPED++))
        return
    fi
    
    # Перевірити чи має старий віджет або просто додати до всіх
    local has_old_widget=false
    if grep -qE "ai-widget.js|ai-assistant-include|ai-assistant.js|ai-assistant-fab" "$file"; then
        has_old_widget=true
    fi
    
    # Створити backup
    cp "$file" "$backup_file"
    
    # Видалити старі посилання (якщо є)
    if [ "$has_old_widget" = true ]; then
        sed -i '/ai-widget.js/d' "$file"
        sed -i '/ai-assistant-include/d' "$file"
        sed -i '/ai-assistant.js/d' "$file"
        sed -i '/<!-- AI Assistant Widget -->/d' "$file"
        sed -i '/<!-- AI Assistant Floating Button/d' "$file"
        sed -i '/<!-- AI Assistant Include -->/d' "$file"
        sed -i '/ai-assistant-fab/d' "$file"
    fi
    
    # Знайти позицію </body>
    if ! grep -q "</body>" "$file"; then
        echo -e "${RED}✗ Error:${NC} $file (no </body> tag found)"
        mv "$backup_file" "$file"  # Відновити з backup
        ((ERRORS++))
        return
    fi
    
    # Додати новий віджет перед </body>
    sed -i '/<\/body>/i\    <!-- AI Universal Widget -->\n    <script src="/components/ai-widget-universal.js"></script>' "$file"
    
    # Перевірити чи додалось
    if grep -q "ai-widget-universal.js" "$file"; then
        if [ "$has_old_widget" = true ]; then
            echo -e "${GREEN}✓ Migrated:${NC} $file (removed old + added new)"
        else
            echo -e "${GREEN}✓ Added:${NC} $file (new widget)"
        fi
        rm "$backup_file"  # Видалити backup якщо успішно
        ((MIGRATED++))
    else
        echo -e "${RED}✗ Error:${NC} $file (failed to add universal widget)"
        mv "$backup_file" "$file"  # Відновити з backup
        ((ERRORS++))
    fi
}

# Знайти всі HTML файли в pages/
echo -e "${BLUE}📁 Finding HTML files in pages/...${NC}"
echo ""

# Знайти файли (виключаючи archive)
FILES=$(find pages/ -type f -name "*.html" ! -path "*/archive/*" | sort)

# Підрахувати загальну кількість
TOTAL=$(echo "$FILES" | wc -l)

echo -e "${BLUE}Found $TOTAL HTML files${NC}"
echo ""
echo -e "${YELLOW}Starting migration...${NC}"
echo ""

# Обробити кожен файл
while IFS= read -r file; do
    migrate_file "$file"
done <<< "$FILES"

# Показати підсумок
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            📊 Migration Summary            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Total files processed:${NC} $TOTAL"
echo -e "${GREEN}✓ Successfully migrated:${NC} $MIGRATED"
echo -e "${YELLOW}⊘ Skipped:${NC} $SKIPPED"
echo -e "${RED}✗ Errors:${NC} $ERRORS"
echo ""

# Показати рекомендації
if [ $MIGRATED -gt 0 ]; then
    echo -e "${GREEN}🎉 Migration completed!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Test the widget on several pages"
    echo "2. Check browser console (F12) for errors"
    echo "3. If everything works, commit the changes:"
    echo ""
    echo -e "${BLUE}   git add ."
    echo "   git commit -m 'Migrate to universal AI widget'"
    echo "   git push origin v2_refactor${NC}"
    echo ""
fi

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}⚠️  Some files had errors!${NC}"
    echo "Please check these files manually."
    echo ""
fi

# Показати список файлів з backup (якщо є)
BACKUPS=$(find pages/ -type f -name "*.migration-backup" 2>/dev/null | wc -l)
if [ $BACKUPS -gt 0 ]; then
    echo -e "${YELLOW}Found $BACKUPS backup files (.migration-backup)${NC}"
    echo "After testing, you can remove them with:"
    echo -e "${BLUE}   find pages/ -name '*.migration-backup' -delete${NC}"
    echo ""
fi

# Показати як перевірити прогрес
echo -e "${BLUE}To check migration status:${NC}"
echo ""
echo "Old widget files:"
echo -e "${YELLOW}  grep -r 'ai-widget.js\\|ai-assistant-include' pages/ --include='*.html' -l | wc -l${NC}"
echo ""
echo "New widget files:"
echo -e "${GREEN}  grep -r 'ai-widget-universal.js' pages/ --include='*.html' -l | wc -l${NC}"
echo ""

# Вихідний код
if [ $ERRORS -gt 0 ]; then
    exit 1
else
    exit 0
fi
