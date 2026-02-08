#!/bin/bash

# =============================================================================
# 🔍 ПОВНА ДІАГНОСТИКА СИСТЕМИ DEAPSEAK
# =============================================================================
# Перевіряє:
# - Всі панелі (admin, tech, resident)
# - Всі кнопки та їх функції
# - Реальні vs штучні дані
# - API endpoints
# - Міжпанельні переходи
# =============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 ПОВНА ДІАГНОСТИКА СИСТЕМИ DEAPSEAK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5000"
PAGES_TESTED=0
PAGES_PASSED=0
ISSUES_FOUND=0

# =============================================================================
# ФУНКЦІЯ: Перевірка файлу на використання demo/mock даних
# =============================================================================
check_demo_data() {
    local file="$1"
    local name="$2"
    
    echo -n "  📄 $name: "
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Файл не знайдено${NC}"
        ((ISSUES_FOUND++))
        return
    fi
    
    # Шукаємо ознаки demo даних
    local demo_patterns=(
        "demo.*data"
        "mock.*data"
        "sample.*data"
        "fake.*data"
        "hardcoded.*data"
        "const.*tasks.*=.*\["
        "const.*lifts.*=.*\["
        "localStorage\.setItem.*demo"
        "\/\/.*demo"
        "\/\/.*mock"
        "\/\/.*sample"
        "\/\/.*fake"
    )
    
    local found_demo=false
    local demo_lines=""
    
    for pattern in "${demo_patterns[@]}"; do
        if grep -inE "$pattern" "$file" > /dev/null 2>&1; then
            found_demo=true
            demo_lines=$(grep -inE "$pattern" "$file" | head -5)
            break
        fi
    done
    
    # Перевіряємо чи використовує API
    local uses_api=false
    if grep -E "(fetch|axios|XMLHttpRequest).*\/api\/" "$file" > /dev/null 2>&1; then
        uses_api=true
    fi
    
    if [ "$found_demo" = true ] && [ "$uses_api" = false ]; then
        echo -e "${RED}❌ ВИКОРИСТОВУЄ DEMO ДАНІ${NC}"
        echo "     Знайдено: $(echo "$demo_lines" | head -1)"
        ((ISSUES_FOUND++))
    elif [ "$found_demo" = true ] && [ "$uses_api" = true ]; then
        echo -e "${YELLOW}⚠️  Має demo дані, але також використовує API${NC}"
    elif [ "$uses_api" = true ]; then
        echo -e "${GREEN}✅ Використовує реальний API${NC}"
    else
        echo -e "${YELLOW}⚠️  Немає ознак API запитів${NC}"
        ((ISSUES_FOUND++))
    fi
}

# =============================================================================
# ФУНКЦІЯ: Перевірка кнопок та їх обробників
# =============================================================================
check_buttons() {
    local file="$1"
    local name="$2"
    
    echo -n "  🔘 Кнопки в $name: "
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Файл не знайдено${NC}"
        return
    fi
    
    # Знаходимо всі кнопки
    local buttons=$(grep -oE 'id="[^"]*"[^>]*type="button"' "$file" | grep -oE 'id="[^"]*"' | cut -d'"' -f2)
    local button_count=$(echo "$buttons" | wc -w)
    
    if [ "$button_count" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Кнопок не знайдено${NC}"
        return
    fi
    
    echo -e "${BLUE}Знайдено $button_count кнопок${NC}"
    
    # Перевіряємо кожну кнопку на обробник
    local no_handler=0
    while IFS= read -r button_id; do
        if [ -z "$button_id" ]; then continue; fi
        
        # Шукаємо обробник події
        if grep -E "(addEventListener|onclick|jQuery.*on\(|\.click\()" "$file" | grep -q "$button_id"; then
            echo -e "     ${GREEN}✅${NC} #$button_id має обробник"
        else
            echo -e "     ${RED}❌${NC} #$button_id НЕ МАЄ ОБРОБНИКА"
            ((no_handler++))
            ((ISSUES_FOUND++))
        fi
    done <<< "$buttons"
    
    if [ "$no_handler" -gt 0 ]; then
        echo -e "     ${RED}⚠️  $no_handler кнопок без обробників!${NC}"
    fi
}

# =============================================================================
# ФУНКЦІЯ: Перевірка API викликів
# =============================================================================
check_api_calls() {
    local file="$1"
    local name="$2"
    
    echo -n "  🌐 API виклики в $name: "
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Файл не знайдено${NC}"
        return
    fi
    
    # Знаходимо всі API endpoints
    local api_calls=$(grep -oE "(fetch|axios|XMLHttpRequest).*['\"]/(api/[^'\"]+)" "$file" | grep -oE "/api/[^'\"]+")
    local api_count=$(echo "$api_calls" | grep -v '^$' | wc -l)
    
    if [ "$api_count" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  API викликів не знайдено${NC}"
        return
    fi
    
    echo -e "${BLUE}Знайдено $api_count викликів${NC}"
    
    # Перевіряємо унікальні endpoints
    local unique_endpoints=$(echo "$api_calls" | sort -u)
    
    while IFS= read -r endpoint; do
        if [ -z "$endpoint" ]; then continue; fi
        
        # Перевіряємо endpoint на сервері
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
        
        case $status in
            200)
                echo -e "     ${GREEN}✅${NC} $endpoint (200 OK)"
                ;;
            401)
                echo -e "     ${GREEN}✅${NC} $endpoint (401 - потрібна авторизація)"
                ;;
            404)
                echo -e "     ${RED}❌${NC} $endpoint (404 NOT FOUND)"
                ((ISSUES_FOUND++))
                ;;
            500|502|503)
                echo -e "     ${RED}❌${NC} $endpoint ($status SERVER ERROR)"
                ((ISSUES_FOUND++))
                ;;
            000)
                echo -e "     ${YELLOW}⚠️${NC} $endpoint (Сервер не відповідає)"
                ;;
            *)
                echo -e "     ${YELLOW}⚠️${NC} $endpoint ($status)"
                ;;
        esac
    done <<< "$unique_endpoints"
}

# =============================================================================
# ФУНКЦІЯ: Перевірка міжпанельних посилань
# =============================================================================
check_navigation() {
    local file="$1"
    local name="$2"
    
    echo -n "  🔗 Навігація в $name: "
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Файл не знайдено${NC}"
        return
    fi
    
    # Знаходимо всі внутрішні посилання
    local links=$(grep -oE 'href="[^"]*\.html[^"]*"' "$file" | cut -d'"' -f2 | grep -v '^http' | grep -v '^#')
    local link_count=$(echo "$links" | grep -v '^$' | wc -l)
    
    if [ "$link_count" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Посилань не знайдено${NC}"
        return
    fi
    
    echo -e "${BLUE}Знайдено $link_count посилань${NC}"
    
    local broken_links=0
    while IFS= read -r link; do
        if [ -z "$link" ]; then continue; fi
        
        # Розв'язуємо відносний шлях
        local dir=$(dirname "$file")
        local full_path
        
        if [[ "$link" =~ ^\/ ]]; then
            # Абсолютний шлях
            full_path="/workspaces/deapseak$link"
        else
            # Відносний шлях
            full_path="$dir/$link"
        fi
        
        # Видаляємо query параметри
        full_path=$(echo "$full_path" | cut -d'?' -f1)
        
        if [ -f "$full_path" ]; then
            echo -e "     ${GREEN}✅${NC} $link"
        else
            echo -e "     ${RED}❌${NC} $link (файл не існує: $full_path)"
            ((broken_links++))
            ((ISSUES_FOUND++))
        fi
    done <<< "$links"
    
    if [ "$broken_links" -gt 0 ]; then
        echo -e "     ${RED}⚠️  $broken_links поламаних посилань!${NC}"
    fi
}

# =============================================================================
# 1. ПЕРЕВІРКА ПАНЕЛІ АДМІНІСТРАТОРА
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👔 ПАНЕЛЬ АДМІНІСТРАТОРА"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ADMIN_PAGES=(
    "pages/admin/dashboard.html:Dashboard"
    "pages/admin/lifts.html:Lifts Management"
    "pages/admin/requests.html:Requests"
    "pages/admin/users.html:Users"
    "pages/admin/reports.html:Reports"
    "pages/admin/settings.html:Settings"
)

for page_info in "${ADMIN_PAGES[@]}"; do
    IFS=':' read -r file name <<< "$page_info"
    echo ""
    echo "📄 Перевірка: $name"
    ((PAGES_TESTED++))
    
    check_demo_data "$file" "$name"
    check_buttons "$file" "$name"
    check_api_calls "$file" "$name"
    check_navigation "$file" "$name"
    
    ((PAGES_PASSED++))
done

# =============================================================================
# 2. ПЕРЕВІРКА ПАНЕЛІ ТЕХНІКА
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 ПАНЕЛЬ ТЕХНІКА"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TECH_PAGES=(
    "pages/tech/dashboard.html:Tech Dashboard"
    "pages/tech/tasks.html:Tasks"
    "pages/tech/schedule.html:Schedule"
    "pages/tech/manutencao.html:Maintenance"
    "pages/tech/inspections.html:Inspections"
    "pages/tech/reports.html:Reports"
    "pages/tech/qr-scanner.html:QR Scanner"
    "pages/tech/ar-helper.html:AR Helper"
)

for page_info in "${TECH_PAGES[@]}"; do
    IFS=':' read -r file name <<< "$page_info"
    echo ""
    echo "📄 Перевірка: $name"
    ((PAGES_TESTED++))
    
    check_demo_data "$file" "$name"
    check_buttons "$file" "$name"
    check_api_calls "$file" "$name"
    check_navigation "$file" "$name"
    
    ((PAGES_PASSED++))
done

# =============================================================================
# 3. ПЕРЕВІРКА ПАНЕЛІ МЕШКАНЦЯ
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏠 ПАНЕЛЬ МЕШКАНЦЯ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESIDENT_PAGES=(
    "pages/resident/dashboard.html:Resident Dashboard"
    "pages/resident/my-requests.html:My Requests"
    "pages/resident/new-request.html:New Request"
)

for page_info in "${RESIDENT_PAGES[@]}"; do
    IFS=':' read -r file name <<< "$page_info"
    echo ""
    echo "📄 Перевірка: $name"
    ((PAGES_TESTED++))
    
    check_demo_data "$file" "$name"
    check_buttons "$file" "$name"
    check_api_calls "$file" "$name"
    check_navigation "$file" "$name"
    
    ((PAGES_PASSED++))
done

# =============================================================================
# 4. ПЕРЕВІРКА JAVASCRIPT МОДУЛІВ
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 JAVASCRIPT МОДУЛІ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

JS_MODULES=(
    "assets/js/modules/task-manager.js:Task Manager"
    "assets/js/modules/inspection-manager.js:Inspection Manager"
    "assets/js/modules/schedule-manager.js:Schedule Manager"
    "assets/js/modules/lift-manager.js:Lift Manager"
    "assets/js/modules/request-manager.js:Request Manager"
)

for module_info in "${JS_MODULES[@]}"; do
    IFS=':' read -r file name <<< "$module_info"
    
    if [ ! -f "$file" ]; then
        echo ""
        echo "📄 $name: ${YELLOW}⚠️  Файл не знайдено${NC}"
        continue
    fi
    
    echo ""
    echo "📄 Перевірка: $name"
    
    check_demo_data "$file" "$name"
    check_api_calls "$file" "$name"
done

# =============================================================================
# 5. ПЕРЕВІРКА BACKEND API ROUTES
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 BACKEND API ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

API_ENDPOINTS=(
    "/api/health:Health Check"
    "/api/auth/login:Login"
    "/api/auth/register:Register"
    "/api/lifts:Lifts API"
    "/api/requests:Requests API"
    "/api/users:Users API"
    "/api/settings:Settings API"
)

echo ""
for endpoint_info in "${API_ENDPOINTS[@]}"; do
    IFS=':' read -r endpoint name <<< "$endpoint_info"
    
    echo -n "🔌 $name ($endpoint): "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
    
    case $status in
        200)
            echo -e "${GREEN}✅ 200 OK${NC}"
            ;;
        401)
            echo -e "${GREEN}✅ 401 (Auth required)${NC}"
            ;;
        404)
            echo -e "${RED}❌ 404 NOT FOUND${NC}"
            ((ISSUES_FOUND++))
            ;;
        500|502|503)
            echo -e "${RED}❌ $status SERVER ERROR${NC}"
            ((ISSUES_FOUND++))
            ;;
        000)
            echo -e "${YELLOW}⚠️  Сервер не відповідає${NC}"
            ((ISSUES_FOUND++))
            ;;
        *)
            echo -e "${YELLOW}⚠️  $status${NC}"
            ;;
    esac
done

# =============================================================================
# 6. СПЕЦІАЛЬНА ПЕРЕВІРКА: Dashboard використовує штучні дані?
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 СПЕЦІАЛЬНА ПЕРЕВІРКА: TECH DASHBOARD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DASHBOARD_FILE="pages/tech/dashboard.html"

echo ""
echo "📊 Аналіз Tech Dashboard на штучні дані..."

# Перевіряємо конкретні паттерни
if grep -q "const.*assignments.*=.*\[" "$DASHBOARD_FILE" 2>/dev/null; then
    echo -e "${RED}❌ ЗНАЙДЕНО: Hardcoded assignments array${NC}"
    grep -n "const.*assignments.*=.*\[" "$DASHBOARD_FILE" | head -3
    ((ISSUES_FOUND++))
fi

if grep -q "const.*tasks.*=.*\[" "$DASHBOARD_FILE" 2>/dev/null; then
    echo -e "${RED}❌ ЗНАЙДЕНО: Hardcoded tasks array${NC}"
    grep -n "const.*tasks.*=.*\[" "$DASHBOARD_FILE" | head -3
    ((ISSUES_FOUND++))
fi

if grep -q "const.*requests.*=.*\[" "$DASHBOARD_FILE" 2>/dev/null; then
    echo -e "${RED}❌ ЗНАЙДЕНО: Hardcoded requests array${NC}"
    grep -n "const.*requests.*=.*\[" "$DASHBOARD_FILE" | head -3
    ((ISSUES_FOUND++))
fi

# Перевіряємо чи викликається loadTechRequests()
if grep -q "loadTechRequests()" "$DASHBOARD_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ Функція loadTechRequests() викликається${NC}"
else
    echo -e "${RED}❌ Функція loadTechRequests() НЕ ВИКЛИКАЄТЬСЯ${NC}"
    ((ISSUES_FOUND++))
fi

# Перевіряємо чи є fetch до /api/requests
if grep -q "fetch.*['\"].*\/api\/requests" "$DASHBOARD_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ Використовує API endpoint /api/requests${NC}"
else
    echo -e "${RED}❌ НЕ використовує /api/requests${NC}"
    ((ISSUES_FOUND++))
fi

# =============================================================================
# 7. ПІДСУМОК
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 ПІДСУМОК ДІАГНОСТИКИ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 Сторінок перевірено: $PAGES_TESTED"
echo "✅ Сторінок пройшло перевірку: $PAGES_PASSED"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ Проблем не знайдено! Система працює ідеально!${NC}"
else
    echo -e "${RED}⚠️  Знайдено проблем: $ISSUES_FOUND${NC}"
    echo ""
    echo "Рекомендації:"
    echo "1. Замініть всі demo/mock дані на реальні API виклики"
    echo "2. Додайте обробники для всіх кнопок"
    echo "3. Виправте поламані посилання"
    echo "4. Перевірте API endpoints, які повертають 404"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $ISSUES_FOUND
