#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}🧪 ПОВНА НАВІГАЦІЙНА СИМУЛЯЦІЯ${NC}"
echo -e "${BLUE}=================================${NC}\n"

# Test pages that use includes/sidebar.html
PAGES=(
    "pages/admin/report-template.html"
    "pages/admin/invoice-template.html"
    "pages/admin/email-template.html"
    "pages/admin/inspection-template.html"
)

# All navigation links to check
declare -A LINKS=(
    ["Dashboard"]="admin-dashboard.html"
    ["QR Management"]="qr-management.html"
    ["QR Analytics"]="qr-analytics.html"
    ["QR History"]="qr-history.html"
    ["Lifts"]="lifts.html"
    ["Requests"]="requests.html"
    ["Maps"]="maps.html"
    ["Users"]="users.html"
    ["Invoice Template"]="invoice-template.html"
    ["Orçamentos List"]="orcamentos-list.html"
    ["Reports"]="reports.html"
    ["Email Template"]="email-template.html"
    ["Unified Analytics"]="unified-analytics.html"
    ["Predictive Maintenance"]="predictive-maintenance.html"
    ["AI Assistant"]="ai-assistant-full.html"
    ["Notifications"]="notifications.html"
    ["Settings"]="settings.html"
)

TOTAL=0
SUCCESS=0
FAILED=0

echo -e "${YELLOW}📄 Тестуємо сторінки з динамічним sidebar:${NC}\n"

for page in "${PAGES[@]}"; do
    if [ -f "$page" ]; then
        echo -e "${GREEN}✓${NC} $page"
    else
        echo -e "${RED}✗${NC} $page ${RED}(НЕ ЗНАЙДЕНО)${NC}"
    fi
done

echo -e "\n${YELLOW}🔍 Перевірка includes/sidebar.html:${NC}\n"

SIDEBAR="pages/admin/includes/sidebar.html"
if [ ! -f "$SIDEBAR" ]; then
    echo -e "${RED}✗ КРИТИЧНА ПОМИЛКА: $SIDEBAR не знайдено!${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} $SIDEBAR існує"

# Check for relative paths (should NOT contain /pages/admin/)
ABSOLUTE_PATHS=$(grep -c 'href="/pages/admin/' "$SIDEBAR" 2>/dev/null || echo "0")
if [ "$ABSOLUTE_PATHS" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Всі шляхи relative (без /pages/admin/)"
else
    echo -e "${RED}✗${NC} Знайдено $ABSOLUTE_PATHS absolute paths (ПОМИЛКА!)"
    FAILED=$((FAILED + ABSOLUTE_PATHS))
fi

# Check for Treeview initialization script
if grep -q "Treeview('init')" "$SIDEBAR"; then
    echo -e "${GREEN}✓${NC} Treeview initialization присутня"
else
    echo -e "${RED}✗${NC} Treeview initialization ВІДСУТНЯ!"
    FAILED=$((FAILED + 1))
fi

echo -e "\n${YELLOW}🔗 Перевірка всіх навігаційних посилань:${NC}\n"

for name in "${!LINKS[@]}"; do
    file="${LINKS[$name]}"
    filepath="pages/admin/$file"
    TOTAL=$((TOTAL + 1))
    
    if grep -q "href=\"$file\"" "$SIDEBAR"; then
        if [ -f "$filepath" ]; then
            echo -e "${GREEN}✓${NC} $name → $file"
            SUCCESS=$((SUCCESS + 1))
        else
            echo -e "${YELLOW}⚠${NC} $name → $file ${YELLOW}(в sidebar, але файл не існує)${NC}"
            FAILED=$((FAILED + 1))
        fi
    else
        echo -e "${RED}✗${NC} $name → $file ${RED}(НЕ ЗНАЙДЕНО в sidebar)${NC}"
        FAILED=$((FAILED + 1))
    fi
done

# Check submenus structure
echo -e "\n${YELLOW}📋 Перевірка структури підменю:${NC}\n"

SUBMENUS=("QR System" "Lifts" "Documents" "Analytics" "Support")
for submenu in "${SUBMENUS[@]}"; do
    # Check if submenu has proper treeview structure
    if grep -q "nav-treeview" "$SIDEBAR"; then
        echo -e "${GREEN}✓${NC} Підменю структура присутня"
        break
    fi
done

# Count nav-item elements
NAV_ITEMS=$(grep -c 'class="nav-item"' "$SIDEBAR")
echo -e "${BLUE}ℹ${NC}  Всього nav-item елементів: $NAV_ITEMS"

# Count nav-treeview elements (submenus)
TREEVIEW_ITEMS=$(grep -c 'class="nav nav-treeview"' "$SIDEBAR")
echo -e "${BLUE}ℹ${NC}  Всього підменю (treeview): $TREEVIEW_ITEMS"

# Statistics
echo -e "\n${BLUE}=================================${NC}"
echo -e "${BLUE}📊 СТАТИСТИКА ТЕСТУВАННЯ${NC}"
echo -e "${BLUE}=================================${NC}"
echo -e "${GREEN}✓ Успішно:${NC} $SUCCESS/$TOTAL"
echo -e "${RED}✗ Помилок:${NC} $FAILED"
echo -e "${BLUE}📈 Відсоток успіху:${NC} $(( SUCCESS * 100 / TOTAL ))%"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ВСЯ НАВІГАЦІЯ ПРАЦЮЄ ІДЕАЛЬНО!${NC}\n"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  Знайдено $FAILED проблем${NC}\n"
    exit 1
fi
