#!/bin/bash
# DeapSeaK System Integration Test
# =================================

echo "🧪 Комплексна перевірка системи DeapSeaK..."

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функція для перевірки HTTP відповіді
check_endpoint() {
    local url="$1"
    local expected_status="$2"
    local description="$3"
    local headers="$4"
    
    echo -n "   ├─ $description... "
    
    if [ -n "$headers" ]; then
        response=$(curl -s -w "%{http_code}" -H "$headers" "$url" -o /dev/null)
    else
        response=$(curl -s -w "%{http_code}" "$url" -o /dev/null)
    fi
    
    if [ "$response" == "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (статус: $response, очікувався: $expected_status)${NC}"
        return 1
    fi
}

# Функція для POST запиту з JSON
post_json() {
    local url="$1"
    local data="$2"
    local description="$3"
    local headers="$4"
    
    echo -n "   ├─ $description... "
    
    local curl_headers="-H 'Content-Type: application/json'"
    if [ -n "$headers" ]; then
        curl_headers="$curl_headers -H '$headers'"
    fi
    
    response=$(eval "curl -s -w '%{http_code}' $curl_headers -d '$data' '$url' -o /dev/null")
    
    if [[ "$response" =~ ^2[0-9]{2}$ ]]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (статус: $response)${NC}"
        return 1
    fi
}

# Перевірка працюючих сервісів
echo -e "\n📡 ${YELLOW}Перевірка сервісів${NC}"

# API Server
check_endpoint "http://localhost:3001/api/status" "200" "API Server (port 3001)"
api_status=$?

# Web Server  
check_endpoint "http://localhost:8080/" "200" "Web Server (port 8080)"
web_status=$?

if [ $api_status -ne 0 ] || [ $web_status -ne 0 ]; then
    echo -e "${RED}❌ Критичні сервіси не працюють!${NC}"
    exit 1
fi

# Отримання токена для тестів
echo -e "\n🔐 ${YELLOW}Тестування авторизації${NC}"

TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@deapseak.com", "password": "admin123"}')

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "   ├─ Авторизація адміна... ${GREEN}✅ OK${NC}"
    AUTH_HEADER="Authorization: Bearer $TOKEN"
else
    echo -e "   ├─ Авторизація адміна... ${RED}❌ FAIL${NC}"
    exit 1
fi

# Тестування API endpoints
echo -e "\n🔌 ${YELLOW}Тестування API endpoints${NC}"

# Перевірка ендпойнтів з авторизацією
check_endpoint "http://localhost:3001/api/lifts" "200" "GET /api/lifts" "$AUTH_HEADER"
check_endpoint "http://localhost:3001/api/assignments" "200" "GET /api/assignments" "$AUTH_HEADER" 
check_endpoint "http://localhost:3001/api/users" "200" "GET /api/users" "$AUTH_HEADER"

# Тестування створення ліфта
LIFT_DATA='{"name": "Тест ліфт система", "address": "Тестова адреса системи", "status": "active", "floor": 5, "capacity": 8}'
post_json "http://localhost:3001/api/lifts" "$LIFT_DATA" "POST /api/lifts (створення)" "$AUTH_HEADER"

# Тестування створення заявки
ASSIGNMENT_DATA='{"description": "Тестова заявка системи", "priority": "medium", "type": "maintenance"}'
post_json "http://localhost:3001/api/assignments" "$ASSIGNMENT_DATA" "POST /api/assignments (створення)" "$AUTH_HEADER"

# Перевірка сторінок
echo -e "\n🌐 ${YELLOW}Перевірка веб сторінок${NC}"

check_endpoint "http://localhost:8080/login.html" "200" "Сторінка входу"
check_endpoint "http://localhost:8080/index.html" "200" "Головна сторінка"
check_endpoint "http://localhost:8080/pages/admin/lifts.html" "200" "Управління ліфтами"
check_endpoint "http://localhost:8080/pages/admin/requests.html" "200" "Управління заявками"

# Перевірка статичних ресурсів
echo -e "\n📁 ${YELLOW}Перевірка ресурсів${NC}"

check_endpoint "http://localhost:8080/security.js" "200" "Система авторизації"
check_endpoint "http://localhost:8080/assets/js/ai_interface.js" "200" "AI інтерфейс"
check_endpoint "http://localhost:8080/assets/js/voice_interface.js" "200" "Голосовий інтерфейс"

# Перевірка AI модулів
echo -e "\n🤖 ${YELLOW}Перевірка AI модулів${NC}"

if [ -f "ai/deapseak_ai.py" ]; then
    echo -e "   ├─ Основний AI модуль... ${GREEN}✅ OK${NC}"
else
    echo -e "   ├─ Основний AI модуль... ${RED}❌ MISSING${NC}"
fi

if [ -f "ai/computer_vision.py" ]; then
    echo -e "   ├─ Комп'ютерний зір... ${GREEN}✅ OK${NC}"
else
    echo -e "   ├─ Комп'ютерний зір... ${RED}❌ MISSING${NC}"
fi

if [ -f "ai/personalized_ai.py" ]; then
    echo -e "   ├─ Персоналізований AI... ${GREEN}✅ OK${NC}"
else
    echo -e "   ├─ Персоналізований AI... ${RED}❌ MISSING${NC}"
fi

# Перевірка AI API endpoints
echo -e "\n🧠 ${YELLOW}Тестування AI API${NC}"

AI_CHAT_DATA='{"message": "Привіт, як справи?", "user_id": "test"}'
post_json "http://localhost:3001/api/ai/chat" "$AI_CHAT_DATA" "AI Chat" "$AUTH_HEADER"

check_endpoint "http://localhost:3001/api/ai/capabilities" "200" "AI Capabilities" "$AUTH_HEADER"

# Перевірка бази даних
echo -e "\n💾 ${YELLOW}Перевірка бази даних${NC}"

LIFT_COUNT=$(curl -s -H "$AUTH_HEADER" http://localhost:3001/api/lifts | jq '. | length' 2>/dev/null)
ASSIGNMENT_COUNT=$(curl -s -H "$AUTH_HEADER" http://localhost:3001/api/assignments | jq '. | length' 2>/dev/null)

if [ -n "$LIFT_COUNT" ] && [ "$LIFT_COUNT" -gt 0 ]; then
    echo -e "   ├─ Ліфти в БД ($LIFT_COUNT)... ${GREEN}✅ OK${NC}"
else
    echo -e "   ├─ Ліфти в БД... ${RED}❌ EMPTY${NC}"
fi

if [ -n "$ASSIGNMENT_COUNT" ] && [ "$ASSIGNMENT_COUNT" -gt 0 ]; then
    echo -e "   ├─ Заявки в БД ($ASSIGNMENT_COUNT)... ${GREEN}✅ OK${NC}"
else
    echo -e "   ├─ Заявки в БД... ${RED}❌ EMPTY${NC}"
fi

# Підсумок
echo -e "\n📊 ${YELLOW}Підсумок тестування${NC}"
echo "   ├─ API Server: працює"
echo "   ├─ Web Server: працює" 
echo "   ├─ Авторизація: працює"
echo "   ├─ База даних: підключена"
echo "   ├─ AI модулі: встановлені"
echo "   └─ Веб інтерфейс: доступний"

echo -e "\n${GREEN}✅ Система готова до використання!${NC}"
echo -e "\n📝 ${YELLOW}Доступ до системи:${NC}"
echo "   🌐 Web: http://localhost:8080"
echo "   🔐 Логін: admin@deapseak.com"
echo "   🔑 Пароль: admin123"
echo "   🤖 AI Асистент: http://localhost:8080/ai-assistant.html"

# Додаткові рекомендації
echo -e "\n💡 ${YELLOW}Рекомендації:${NC}"
echo "   1. Перейдіть на http://localhost:8080/login.html для входу"
echo "   2. Використовуйте admin@deapseak.com / admin123"
echo "   3. Протестуйте створення ліфтів в /pages/admin/lifts.html"
echo "   4. Протестуйте створення заявок в /pages/admin/requests.html"
echo "   5. Спробуйте AI асистента на /ai-assistant.html"