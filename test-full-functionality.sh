#!/bin/bash
# 🧪 Повна симуляція функціоналу DeapSeaK v2

echo "🧪 ПОВНА СИМУЛЯЦІЯ ФУНКЦІОНАЛУ"
echo "================================"
echo ""

# Кольори
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Лічильники
PASSED=0
FAILED=0

# Функція для тестування
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing $name... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" = "$expected" ]; then
        echo -e "${GREEN}✅ PASS${NC} ($status)"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC} (expected $expected, got $status)"
        ((FAILED++))
    fi
}

echo -e "${BLUE}1️⃣  СТАТИЧНІ СТОРІНКИ${NC}"
echo "-------------------"
test_endpoint "Головна сторінка" "http://localhost:5000/" "200"
test_endpoint "Login (нова)" "http://localhost:5000/pages/auth/login.html" "200"
test_endpoint "Register" "http://localhost:5000/pages/auth/register.html" "200"
test_endpoint "Tech Dashboard" "http://localhost:5000/pages/tech/dashboard.html" "200"
test_endpoint "Admin Dashboard" "http://localhost:5000/pages/admin/admin-dashboard.html" "200"
test_endpoint "Dispatcher Dashboard" "http://localhost:5000/pages/dispatcher/dashboard.html" "200"
test_endpoint "Client Dashboard" "http://localhost:5000/pages/client/dashboard.html" "200"
test_endpoint "AI Assistant" "http://localhost:5000/pages/ai-assistant/ai-assistant.html" "200"
echo ""

echo -e "${BLUE}2️⃣  CSS/JS ASSETS${NC}"
echo "---------------"
test_endpoint "main.css" "http://localhost:5000/assets/css/main.css" "200"
test_endpoint "auth.css" "http://localhost:5000/assets/css/auth.css" "200"
test_endpoint "theme-dark.css" "http://localhost:5000/assets/css/theme-dark.css" "200"
test_endpoint "auth.js" "http://localhost:5000/assets/js/auth.js" "200"
test_endpoint "global-settings.js" "http://localhost:5000/assets/js/global-settings.js" "200"
test_endpoint "config.js" "http://localhost:5000/config.js" "200"
echo ""

echo -e "${BLUE}3️⃣  API ENDPOINTS${NC}"
echo "---------------"

# Login API
echo -n "POST /api/auth/login... "
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"info@festlift.pt","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
    
    # Отримати токен
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   🔑 Token: ${TOKEN:0:50}..."
    
    # Тест protected API
    echo -n "GET /api/lifts (з токеном)... "
    LIFTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        http://localhost:5000/api/lifts)
    
    if [ "$LIFTS_STATUS" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC} ($LIFTS_STATUS)"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC} ($LIFTS_STATUS)"
        ((FAILED++))
    fi
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAILED++))
fi
echo ""

echo -e "${BLUE}4️⃣  НАВІГАЦІЯ (перевірка links)${NC}"
echo "-------------------------------"

# Перевірка що logout links правильні
echo -n "Tech Dashboard logout link... "
TECH_LOGOUT=$(curl -s http://localhost:5000/pages/tech/dashboard.html | grep -o 'href="[^"]*pages/auth/login.html"')
if [ -n "$TECH_LOGOUT" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAILED++))
fi

echo -n "Admin Dashboard logout link... "
ADMIN_LOGOUT=$(curl -s http://localhost:5000/pages/admin/admin-dashboard.html | grep -o 'href="[^"]*pages/auth/login.html"')
if [ -n "$ADMIN_LOGOUT" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAILED++))
fi

echo -n "Index → Login link... "
INDEX_LOGIN=$(curl -s http://localhost:5000/ | grep -o 'href="pages/auth/login.html"')
if [ -n "$INDEX_LOGIN" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAILED++))
fi
echo ""

echo -e "${BLUE}5️⃣  AUTH.JS REDIRECTS${NC}"
echo "-------------------"
echo -n "logout() redirect... "
if grep -q "window.location.replace('/pages/auth/login.html')\|window.location.href.*pages/auth/login.html" /workspaces/deapseak/assets/js/auth.js; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAILED++))
fi

echo -n "checkAuthOnPageLoad() redirect... "
if grep -q "window.location.replace\|window.location.href.*login" /workspaces/deapseak/assets/js/auth.js; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAILED++))
fi
echo ""

echo -e "${BLUE}6️⃣  СЕРВІСИ${NC}"
echo "----------"
echo -n "MongoDB... "
if pgrep mongod > /dev/null; then
    echo -e "${GREEN}✅ RUNNING${NC} (PID: $(pgrep mongod))"
    ((PASSED++))
else
    echo -e "${RED}❌ STOPPED${NC}"
    ((FAILED++))
fi

echo -n "Unified Server... "
if pgrep -f "node unified-server" > /dev/null; then
    echo -e "${GREEN}✅ RUNNING${NC} (PID: $(pgrep -f 'node unified-server'))"
    ((PASSED++))
else
    echo -e "${RED}❌ STOPPED${NC}"
    ((FAILED++))
fi
echo ""

# Підсумок
echo "================================"
echo -e "${YELLOW}📊 ПІДСУМОК${NC}"
echo "================================"
echo -e "${GREEN}✅ Пройшло: $PASSED${NC}"
echo -e "${RED}❌ Провалено: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ВСІ ТЕСТИ ПРОЙШЛИ!${NC}"
    echo ""
    echo "📝 Примітки:"
    echo "   - Темна тема: Це налаштування користувача (localStorage.user_settings)"
    echo "   - Для скидання: відкрий DevTools → Console → localStorage.clear()"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  ДЕЯКІ ТЕСТИ ПРОВАЛИЛИСЬ${NC}"
    exit 1
fi
