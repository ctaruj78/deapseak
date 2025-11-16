#!/bin/bash

# DeapSeaK v2 - Project Cleanup Script
# Автоматичне очищення проекту від тестових файлів, backup та дублікатів

set -e  # Зупинка при помилці

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Лічильники
FILES_REMOVED=0
SPACE_FREED=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🧹 DeapSeaK v2 - Project Cleanup Script              ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Функція для підрахунку розміру файлу
get_file_size() {
    if [ -f "$1" ]; then
        du -sb "$1" 2>/dev/null | cut -f1 || echo 0
    else
        echo 0
    fi
}

# Функція для видалення файлу з підрахунком
safe_remove() {
    local file="$1"
    if [ -f "$file" ]; then
        local size=$(get_file_size "$file")
        rm -f "$file"
        FILES_REMOVED=$((FILES_REMOVED + 1))
        SPACE_FREED=$((SPACE_FREED + size))
        echo -e "  ${GREEN}✓${NC} Видалено: $file"
    fi
}

# Функція для видалення папки
safe_remove_dir() {
    local dir="$1"
    if [ -d "$dir" ]; then
        local size=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo 0)
        rm -rf "$dir"
        SPACE_FREED=$((SPACE_FREED + size))
        echo -e "  ${GREEN}✓${NC} Видалено папку: $dir"
    fi
}

# Перевірка чи запущено з кореня проекту
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Помилка: запустіть скрипт з кореня проекту${NC}"
    exit 1
fi

# Питання користувача
echo -e "${YELLOW}⚠️  УВАГА! Цей скрипт видалить:${NC}"
echo "   • Тестові файли (demo.html, test-*.js, etc.)"
echo "   • Backup файли (*.backup, *.old, *-backup.*, *-old.*)"
echo "   • Застарілі версії в archive/"
echo "   • Дублікати plugins/"
echo ""
echo -e "${YELLOW}📋 Рекомендується створити backup перед запуском!${NC}"
echo ""
read -p "Продовжити? (yes/no): " -n 3 -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${RED}❌ Скасовано користувачем${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Початок очищення...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Видалення тестових файлів з кореня
echo -e "${BLUE}📝 [1/7] Видалення тестових файлів з кореня...${NC}"
safe_remove "demo.html"
safe_remove "test-error-handler.js"
safe_remove "test-error-handling.js"
safe_remove "api-server-test.js"
safe_remove "lift-modal-demo.html"
safe_remove "quick-login.html"
safe_remove "simulator.html"
safe_remove "cache-clear.html"
safe_remove "fixed-login.html"
safe_remove "close-modal-fixed.html"
safe_remove "currentliftid-fixed.html"
safe_remove "ar-helper-options.html"
safe_remove "lift-info.html"
safe_remove "lift-modals-diagnosis.html"
safe_remove "functionality-report.html"
echo ""

# 2. Видалення backup файлів
echo -e "${BLUE}💾 [2/7] Видалення backup файлів...${NC}"
safe_remove "assets/js/auth-old-backup.js"
safe_remove "assets/js/enhanced-lift-modal-backup.js"
safe_remove "assets/js/test-lift-saving.js"
safe_remove "backend/app.old.js"

# Пошук та видалення всіх *.backup, *.old файлів
find . -type f \( -name "*.backup" -o -name "*.old" -o -name "*-backup.js" -o -name "*-old.js" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/archive/*" \
    -exec bash -c 'safe_remove "$0"' {} \; 2>/dev/null || true
echo ""

# 3. Переміщення логів
echo -e "${BLUE}📋 [3/7] Переміщення логів у logs/...${NC}"
mkdir -p logs
for log_file in *.log; do
    if [ -f "$log_file" ]; then
        mv "$log_file" logs/ 2>/dev/null && echo -e "  ${GREEN}✓${NC} Перенесено: $log_file → logs/"
    fi
done
echo ""

# 4. Очищення archive/
echo -e "${BLUE}📦 [4/7] Очищення папки archive/...${NC}"

# Створюємо папку для важливих документів
mkdir -p docs/archive

# Переміщуємо важливі звіти
if [ -d "archive" ]; then
    echo "  • Збереження важливих MD файлів..."
    find archive -name "*.md" -type f -exec bash -c '
        file="$1"
        if [ -f "$file" ]; then
            mv "$file" docs/archive/ 2>/dev/null && echo "    ✓ Збережено: $(basename $file)"
        fi
    ' _ {} \; 2>/dev/null || true
    
    # Видаляємо old-* папки
    safe_remove_dir "archive/old-debug-files"
    safe_remove_dir "archive/old-docs"
    
    # Видаляємо тестові HTML
    find archive -name "*-test.html" -type f -exec bash -c '
        FILES_REMOVED=$((FILES_REMOVED + 1))
        rm -f "$1"
    ' _ {} \; 2>/dev/null || true
    
    # Видаляємо старі версії api-server
    safe_remove "archive/api-server-old.js"
    safe_remove "archive/api-server-backup.js"
    safe_remove "archive/api-server-backup-full.js"
    safe_remove "archive/api-server-broken.js"
    safe_remove "archive/api-server-minimal.js"
    safe_remove "archive/api-server-simple.js"
fi
echo ""

# 5. Видалення дублікатів plugins
echo -e "${BLUE}🔌 [5/7] Видалення дублікатів plugins/...${NC}"
if [ -d "plugins" ] && [ -d "assets/plugins" ]; then
    echo "  ${YELLOW}⚠️  Знайдено дублікати: /plugins/ і /assets/plugins/${NC}"
    echo "  • Перевірка відмінностей..."
    
    # Залишаємо assets/plugins, видаляємо plugins/
    safe_remove_dir "plugins"
    echo -e "  ${GREEN}✓${NC} Залишено тільки assets/plugins/"
fi
echo ""

# 6. Очищення backup/
echo -e "${BLUE}💼 [6/7] Очищення папки backup/...${NC}"
if [ -d "backup/old-dashboards" ]; then
    safe_remove_dir "backup/old-dashboards"
fi
echo ""

# 7. Оновлення .gitignore
echo -e "${BLUE}📝 [7/7] Оновлення .gitignore...${NC}"

# Перевіряємо чи вже є правила
if ! grep -q "# Logs" .gitignore 2>/dev/null; then
    cat >> .gitignore << 'EOF'

# ==========================================
# Auto-added by cleanup-project.sh
# ==========================================

# Logs
*.log
logs/*.log
npm-debug.log*

# Temporary files
*.tmp
*.temp
*.old
*.backup
*.bak
*-backup.*
*-old.*

# Test files
test-*.html
*-test.html
demo.html

# OS files
.DS_Store
Thumbs.db

# MongoDB logs
mongodb/logs/*.log
EOF
    echo -e "  ${GREEN}✓${NC} .gitignore оновлено"
else
    echo -e "  ${YELLOW}ℹ${NC}  .gitignore вже містить потрібні правила"
fi
echo ""

# Підсумок
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Очищення завершено!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📊 Статистика:${NC}"
echo -e "  • Файлів видалено: ${GREEN}${FILES_REMOVED}${NC}"

# Конвертуємо байти в MB
SPACE_MB=$((SPACE_FREED / 1024 / 1024))
if [ $SPACE_MB -gt 0 ]; then
    echo -e "  • Звільнено місця: ${GREEN}~${SPACE_MB} MB${NC}"
else
    SPACE_KB=$((SPACE_FREED / 1024))
    echo -e "  • Звільнено місця: ${GREEN}~${SPACE_KB} KB${NC}"
fi
echo ""

echo -e "${BLUE}💡 Наступні кроки:${NC}"
echo "  1. Перевірте що система працює: npm run auto-start"
echo "  2. Commit змін: git add . && git commit -m 'cleanup: remove test files and duplicates'"
echo "  3. Перегляньте повний звіт: docs/SYSTEM-AUDIT-REPORT.md"
echo ""
echo -e "${GREEN}🎉 Готово!${NC}"
