#!/bin/bash

# DeapSeaK v2 - Console.log Analysis & Cleanup
# Аналіз та видалення console.log з production коду

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🔍 Console.log Analysis & Cleanup Tool                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Функція для підрахунку console.log
count_console_logs() {
    local dir=$1
    local pattern=$2
    grep -r "console\.\(log\|warn\|error\|debug\)" "$dir" --include="*.js" --include="*.html" 2>/dev/null | wc -l || echo 0
}

# Аналіз по директоріях
echo -e "${BLUE}📊 Аналіз використання console.*() по директоріях:${NC}"
echo ""

TOTAL=0

echo -e "${YELLOW}Backend:${NC}"
BACKEND_COUNT=$(count_console_logs "backend" "*.js")
echo "  backend/              : $BACKEND_COUNT випадків"
TOTAL=$((TOTAL + BACKEND_COUNT))

echo ""
echo -e "${YELLOW}Frontend Assets:${NC}"
ASSETS_COUNT=$(count_console_logs "assets/js" "*.js")
echo "  assets/js/            : $ASSETS_COUNT випадків"
TOTAL=$((TOTAL + ASSETS_COUNT))

echo ""
echo -e "${YELLOW}Pages:${NC}"
ADMIN_COUNT=$(count_console_logs "pages/admin" "*.html")
echo "  pages/admin/          : $ADMIN_COUNT випадків"
TOTAL=$((TOTAL + ADMIN_COUNT))

TECH_COUNT=$(count_console_logs "pages/tech" "*.html")
echo "  pages/tech/           : $TECH_COUNT випадків"
TOTAL=$((TOTAL + TECH_COUNT))

DISPATCHER_COUNT=$(count_console_logs "pages/dispatcher" "*.html")
echo "  pages/dispatcher/     : $DISPATCHER_COUNT випадків"
TOTAL=$((TOTAL + DISPATCHER_COUNT))

CLIENT_COUNT=$(count_console_logs "pages/client" "*.html")
echo "  pages/client/         : $CLIENT_COUNT випадків"
TOTAL=$((TOTAL + CLIENT_COUNT))

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Всього знайдено:${NC} ${RED}${TOTAL}${NC} випадків console.*()"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Топ файлів з найбільшою кількістю console.log
echo -e "${YELLOW}🔝 Топ 10 файлів з найбільшою кількістю console.*():${NC}"
echo ""

grep -r "console\.\(log\|warn\|error\|debug\)" . \
    --include="*.js" --include="*.html" \
    ! -path "*/node_modules/*" \
    ! -path "*/plugins/*" \
    ! -path "*/archive/*" \
    2>/dev/null | \
    cut -d: -f1 | \
    sort | uniq -c | \
    sort -rn | \
    head -10 | \
    while read count file; do
        echo "  $count × $(echo $file | sed 's/^\.\///')"
    done

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Питання про автоматичну заміну
echo -e "${YELLOW}💡 Рекомендації:${NC}"
echo ""
echo "1. ${GREEN}Для production:${NC} Замінити console.log → CONFIG.log"
echo "2. ${GREEN}Для debugging:${NC} Використовувати conditional logging"
echo "3. ${GREEN}Для помилок:${NC} Завжди використовувати console.error"
echo ""

read -p "Показати приклади файлів з console.log? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}📝 Приклади використання console.log:${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Показати перші 20 прикладів
    grep -rn "console\.log" . \
        --include="*.js" --include="*.html" \
        ! -path "*/node_modules/*" \
        ! -path "*/plugins/*" \
        ! -path "*/archive/*" \
        2>/dev/null | \
        head -20 | \
        while IFS=: read -r file line content; do
            file_short=$(echo "$file" | sed 's/^\.\///')
            echo -e "${GREEN}$file_short${NC}:${BLUE}$line${NC}"
            echo "  $content"
            echo ""
        done
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🛠️  Як виправити:${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "1. Додайте до config.js:"
echo ""
cat << 'EOF'
   const CONFIG = {
       DEBUG_MODE: false, // true для development
       
       log(...args) {
           if (this.DEBUG_MODE) {
               console.log(...args);
           }
       },
       
       error(...args) {
           console.error(...args); // Завжди логуємо помилки
       }
   };
EOF
echo ""
echo "2. Замініть в коді:"
echo "   console.log('text') → CONFIG.log('text')"
echo ""
echo "3. Або використовуйте regex replace в VS Code:"
echo "   Знайти:    console\\.log\\("
echo "   Замінити:  CONFIG.log("
echo ""
echo -e "${GREEN}✅ Аналіз завершено!${NC}"
