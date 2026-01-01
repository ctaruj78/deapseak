#!/bin/bash
# Navigation Test Script - Перевірка всіх посилань у sidebar

echo "======================================"
echo "🧭 ТЕСТ НАВІГАЦІЇ SIDEBAR"
echo "======================================"
echo ""

BASE_DIR="/workspaces/deapseak/pages/admin"
cd "$BASE_DIR" || exit 1

# Кольори для виводу
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Лічильники
TOTAL=0
FOUND=0
MISSING=0

echo -e "${BLUE}📂 Базова директорія: $BASE_DIR${NC}"
echo ""

# Функція перевірки файлу
check_file() {
    local file="$1"
    local description="$2"
    local category="$3"
    
    TOTAL=$((TOTAL + 1))
    
    if [ -f "$BASE_DIR/$file" ]; then
        echo -e "  ${GREEN}✓${NC} $description"
        echo -e "    ${YELLOW}→${NC} $file"
        FOUND=$((FOUND + 1))
    else
        echo -e "  ${RED}✗${NC} $description"
        echo -e "    ${RED}ВІДСУТНІЙ:${NC} $file"
        MISSING=$((MISSING + 1))
    fi
}

echo "======================================"
echo "📋 ГОЛОВНІ ПУНКТИ МЕНЮ"
echo "======================================"
echo ""

echo "1️⃣  Dashboard"
check_file "admin-dashboard.html" "Дашборд" "main"
echo ""

echo "2️⃣  QR Система (підменю)"
check_file "qr-management.html" "Керування QR-кодами" "qr"
check_file "qr-analytics.html" "Аналітика QR-кодів" "qr"
check_file "qr-history.html" "Історія сканувань" "qr"
echo ""

echo "3️⃣  Ліфти (підменю)"
check_file "lifts.html" "Управління ліфтами" "lifts"
check_file "requests.html" "Заявки" "lifts"
check_file "maps.html" "Мапа ліфтів" "lifts"
echo ""

echo "4️⃣  Користувачі"
check_file "users.html" "Користувачі" "main"
echo ""

echo "5️⃣  Документи (підменю)"
check_file "invoice-template.html" "Orçamentos (Створити)" "docs"
check_file "orcamentos-list.html" "Orçamentos (Список)" "docs"
check_file "reports.html" "Звіти" "docs"
check_file "email-template.html" "Email шаблони" "docs"
echo ""

echo "6️⃣  Аналітика (підменю)"
check_file "unified-analytics.html" "Unified Analytics" "analytics"
check_file "predictive-maintenance.html" "Predictive Maintenance" "analytics"
echo ""

echo "7️⃣  AI Асистент"
check_file "ai-assistant-full.html" "AI Асистент" "main"
echo ""

echo "8️⃣  Підтримка (підменю)"
check_file "notifications.html" "Сповіщення" "support"
echo ""

echo "9️⃣  Налаштування"
check_file "settings.html" "Налаштування" "main"
echo ""

echo "======================================"
echo "📊 РЕЗУЛЬТАТИ ТЕСТУВАННЯ"
echo "======================================"
echo ""
echo -e "${BLUE}Всього перевірено:${NC} $TOTAL файлів"
echo -e "${GREEN}Знайдено:${NC} $FOUND файлів"
echo -e "${RED}Відсутні:${NC} $MISSING файлів"
echo ""

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ ТЕСТ ПРОЙДЕНО! Всі файли на місці.${NC}"
    EXIT_CODE=0
else
    echo -e "${RED}❌ ТЕСТ НЕ ПРОЙДЕНО! Відсутні файли: $MISSING${NC}"
    EXIT_CODE=1
fi

echo ""
echo "======================================"
echo "🔍 ПЕРЕВІРКА ПОСИЛАНЬ У HTML"
echo "======================================"
echo ""

# Перевіримо чи посилання в inspection-template.html правильні
if [ -f "$BASE_DIR/inspection-template.html" ]; then
    echo "Перевіряю inspection-template.html..."
    echo ""
    
    # Витягуємо всі href з sidebar
    grep -E 'href="[^"]+\.html"' "$BASE_DIR/inspection-template.html" | \
    grep -v 'http' | \
    sed 's/.*href="\([^"]*\)".*/\1/' | \
    sort -u | \
    while read -r link; do
        if [ -f "$BASE_DIR/$link" ]; then
            echo -e "  ${GREEN}✓${NC} $link"
        else
            echo -e "  ${RED}✗${NC} $link ${RED}(ВІДСУТНІЙ)${NC}"
        fi
    done
else
    echo -e "${RED}inspection-template.html не знайдено!${NC}"
fi

echo ""
echo "======================================"
echo "🎯 СПЕЦИФІЧНІ ПЕРЕВІРКИ"
echo "======================================"
echo ""

# Перевіримо чи inspection-template.html існує
echo "📄 Поточна сторінка (inspection-template.html):"
if [ -f "$BASE_DIR/inspection-template.html" ]; then
    echo -e "  ${GREEN}✓${NC} Файл існує"
    
    # Перевіримо чи є sidebar
    if grep -q "CANONICAL ADMIN SIDEBAR" "$BASE_DIR/inspection-template.html"; then
        echo -e "  ${GREEN}✓${NC} Sidebar знайдено"
    else
        echo -e "  ${RED}✗${NC} Sidebar відсутній!"
    fi
    
    # Перевіримо чи всі посилання relative
    ABSOLUTE_LINKS=$(grep -E 'href="/pages/admin/' "$BASE_DIR/inspection-template.html" | wc -l)
    if [ "$ABSOLUTE_LINKS" -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} Всі посилання relative (готово до deployment)"
    else
        echo -e "  ${YELLOW}⚠${NC}  Знайдено $ABSOLUTE_LINKS absolute посилань"
    fi
else
    echo -e "  ${RED}✗${NC} Файл не існує!"
fi

echo ""
exit $EXIT_CODE
