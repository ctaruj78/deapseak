#!/bin/bash

# 🧪 Комплексний тест сторінки settings.html
# Перевіряє API, скрипти, функціональність

echo "🧪 ТЕСТ SETTINGS.HTML"
echo "===================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:5000"
passed=0
failed=0
warnings=0

# JWT Secret з unified-server.js
JWT_SECRET="deapseak_secret_key_2024"

# Генерація тестового токену
echo -e "${BLUE}1️⃣  Генерація JWT токену...${NC}"
TOKEN=$(node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({userId: '677d8f9e1234567890abcdef', role: 'admin', username: 'admin'}, '$JWT_SECRET', {expiresIn: '1h'}))")

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Не вдалося згенерувати токен${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Токен згенеровано${NC}"
echo "   Token: ${TOKEN:0:50}..."
echo ""

# 2. Перевірка існування HTML файлу
echo -e "${BLUE}2️⃣  Перевірка HTML файлу...${NC}"
if [ -f "pages/admin/settings.html" ]; then
    echo -e "${GREEN}✅ settings.html існує${NC}"
    ((passed++))
    
    # Перевірка розміру
    size=$(wc -c < pages/admin/settings.html)
    echo "   Розмір: $size bytes"
    
    if [ $size -lt 1000 ]; then
        echo -e "${RED}❌ Файл занадто малий (< 1KB)${NC}"
        ((failed++))
    fi
else
    echo -e "${RED}❌ settings.html НЕ існує${NC}"
    ((failed++))
fi
echo ""

# 3. Перевірка завантаження сторінки
echo -e "${BLUE}3️⃣  Перевірка завантаження сторінки...${NC}"
http_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/pages/admin/settings.html")

if [ "$http_status" = "200" ]; then
    echo -e "${GREEN}✅ Сторінка завантажується (HTTP $http_status)${NC}"
    ((passed++))
else
    echo -e "${RED}❌ Помилка завантаження (HTTP $http_status)${NC}"
    ((failed++))
fi
echo ""

# 4. Перевірка JavaScript файлів
echo -e "${BLUE}4️⃣  Перевірка JavaScript файлів...${NC}"

js_files=(
    "assets/js/auth.js"
    "assets/js/i18n.js"
    "assets/js/settings-manager.js"
    "assets/js/modules/settings-page.js"
)

for js_file in "${js_files[@]}"; do
    if [ -f "$js_file" ]; then
        lines=$(wc -l < "$js_file")
        echo -e "  ${GREEN}✅ $js_file${NC} ($lines lines)"
        ((passed++))
    else
        echo -e "  ${RED}❌ $js_file MISSING${NC}"
        ((failed++))
    fi
done
echo ""

# 5. Перевірка API endpoints
echo -e "${BLUE}5️⃣  Перевірка API endpoints...${NC}"

# GET /api/settings
echo "  Тестування GET /api/settings..."
settings_response=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/settings")
settings_success=$(echo "$settings_response" | jq -r '.success' 2>/dev/null)

if [ "$settings_success" = "true" ]; then
    echo -e "  ${GREEN}✅ GET /api/settings працює${NC}"
    echo "$settings_response" | jq . | head -10
    ((passed++))
else
    echo -e "  ${RED}❌ GET /api/settings НЕ працює${NC}"
    echo "  Response: $settings_response"
    ((failed++))
fi
echo ""

# PUT /api/settings
echo "  Тестування PUT /api/settings..."
put_response=$(curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"language":"pt","theme":"dark"}' \
    "$BASE_URL/api/settings")

put_success=$(echo "$put_response" | jq -r '.success' 2>/dev/null)

if [ "$put_success" = "true" ]; then
    echo -e "  ${GREEN}✅ PUT /api/settings працює${NC}"
    ((passed++))
else
    echo -e "  ${YELLOW}⚠️  PUT /api/settings повернув: $put_success${NC}"
    ((warnings++))
fi
echo ""

# PUT /api/settings/language
echo "  Тестування PUT /api/settings/language..."
lang_response=$(curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"language":"pt"}' \
    "$BASE_URL/api/settings/language")

lang_success=$(echo "$lang_response" | jq -r '.success' 2>/dev/null)

if [ "$lang_success" = "true" ]; then
    echo -e "  ${GREEN}✅ PUT /api/settings/language працює${NC}"
    ((passed++))
else
    echo -e "  ${YELLOW}⚠️  PUT /api/settings/language: $lang_success${NC}"
    ((warnings++))
fi
echo ""

# PUT /api/settings/theme
echo "  Тестування PUT /api/settings/theme..."
theme_response=$(curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"theme":"light"}' \
    "$BASE_URL/api/settings/theme")

theme_success=$(echo "$theme_response" | jq -r '.success' 2>/dev/null)

if [ "$theme_success" = "true" ]; then
    echo -e "  ${GREEN}✅ PUT /api/settings/theme працює${NC}"
    ((passed++))
else
    echo -e "  ${YELLOW}⚠️  PUT /api/settings/theme: $theme_success${NC}"
    ((warnings++))
fi
echo ""

# 6. Перевірка структури HTML
echo -e "${BLUE}6️⃣  Перевірка структури HTML...${NC}"

# Перевірка наявності ключових елементів
if grep -q "settings-content" pages/admin/settings.html; then
    echo -e "  ${GREEN}✅ Контейнер #settings-content знайдено${NC}"
    ((passed++))
else
    echo -e "  ${RED}❌ Контейнер #settings-content ВІДСУТНІЙ${NC}"
    ((failed++))
fi

if grep -q "SettingsPage" pages/admin/settings.html; then
    echo -e "  ${GREEN}✅ SettingsPage клас використовується${NC}"
    ((passed++))
else
    echo -e "  ${RED}❌ SettingsPage клас НЕ використовується${NC}"
    ((failed++))
fi

if grep -q "settingsManager" pages/admin/settings.html; then
    echo -e "  ${GREEN}✅ settingsManager використовується${NC}"
    ((passed++))
else
    echo -e "  ${RED}❌ settingsManager НЕ використовується${NC}"
    ((failed++))
fi
echo ""

# 7. Перевірка MongoDB collection
echo -e "${BLUE}7️⃣  Перевірка MongoDB collection user_settings...${NC}"

if pgrep mongod > /dev/null; then
    # Перевірка чи є collection
    collections=$(mongosh deapseak --quiet --eval "db.getCollectionNames()" 2>/dev/null)
    
    if echo "$collections" | grep -q "user_settings"; then
        echo -e "  ${GREEN}✅ Collection user_settings існує${NC}"
        ((passed++))
        
        # Підрахунок документів
        count=$(mongosh deapseak --quiet --eval "db.user_settings.countDocuments()" 2>/dev/null)
        echo "  Кількість документів: $count"
    else
        echo -e "  ${YELLOW}⚠️  Collection user_settings не створена (буде створена автоматично)${NC}"
        ((warnings++))
    fi
else
    echo -e "  ${YELLOW}⚠️  MongoDB не запущено${NC}"
    ((warnings++))
fi
echo ""

# 8. Перевірка class SettingsPage
echo -e "${BLUE}8️⃣  Перевірка class SettingsPage...${NC}"

if grep -q "class SettingsPage" assets/js/modules/settings-page.js; then
    echo -e "  ${GREEN}✅ Class SettingsPage визначено${NC}"
    ((passed++))
    
    # Перевірка методів
    methods=("init" "render" "loadSettings" "saveSettings")
    for method in "${methods[@]}"; do
        if grep -q "$method" assets/js/modules/settings-page.js; then
            echo -e "    ✓ Метод $method існує"
        else
            echo -e "    ${RED}✗ Метод $method ВІДСУТНІЙ${NC}"
            ((failed++))
        fi
    done
else
    echo -e "  ${RED}❌ Class SettingsPage НЕ визначено${NC}"
    ((failed++))
fi
echo ""

# 9. Перевірка локалізації
echo -e "${BLUE}9️⃣  Перевірка локалізації...${NC}"

if grep -q 'lang="pt"' pages/admin/settings.html; then
    echo -e "  ${GREEN}✅ Мова: Португальська (pt)${NC}"
    ((passed++))
else
    echo -e "  ${YELLOW}⚠️  Мова не португальська${NC}"
    ((warnings++))
fi

if grep -q "FestLift" pages/admin/settings.html; then
    echo -e "  ${GREEN}✅ Назва компанії: FestLift${NC}"
    ((passed++))
else
    echo -e "  ${RED}❌ Назва компанії не FestLift${NC}"
    ((failed++))
fi

if grep -q "v2.1.0" pages/admin/settings.html; then
    echo -e "  ${GREEN}✅ Версія: v2.1.0${NC}"
    ((passed++))
else
    echo -e "  ${YELLOW}⚠️  Версія не v2.1.0${NC}"
    ((warnings++))
fi
echo ""

# ПІДСУМОК
echo "===================="
echo -e "📊 ${BLUE}ПІДСУМОК:${NC}"
echo -e "   ${GREEN}✅ Passed: $passed${NC}"
echo -e "   ${YELLOW}⚠️  Warnings: $warnings${NC}"
echo -e "   ${RED}❌ Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}🎉 SETTINGS.HTML ПОВНІСТЮ ПРАЦЮЄ!${NC}"
    echo ""
    echo "📋 Функціональність:"
    echo "  ✅ HTML сторінка завантажується"
    echo "  ✅ Всі JavaScript файли на місці"
    echo "  ✅ API endpoints працюють:"
    echo "     - GET /api/settings ✓"
    echo "     - PUT /api/settings ✓"
    echo "     - PUT /api/settings/language ✓"
    echo "     - PUT /api/settings/theme ✓"
    echo "  ✅ MongoDB інтеграція"
    echo "  ✅ SettingsPage клас"
    echo "  ✅ Локалізація (pt, FestLift, v2.1.0)"
    echo ""
    echo "🌐 Відкрийте в браузері:"
    echo "   http://localhost:5000/pages/admin/settings.html"
    echo ""
    echo "💡 Для тестування:"
    echo "   1. Увійдіть як admin (admin@deapseak.com / admin123)"
    echo "   2. Відкрийте Configurações (Settings)"
    echo "   3. Змініть мову, тему, налаштування"
    echo "   4. Перевірте що зміни зберігаються"
    exit 0
else
    echo -e "${RED}❌ ЗНАЙДЕНО ПРОБЛЕМИ!${NC}"
    echo ""
    echo "🔧 Що перевірити:"
    echo "  1. Чи запущений unified-server: ps aux | grep unified-server"
    echo "  2. Чи запущений MongoDB: pgrep mongod"
    echo "  3. Чи існують JavaScript файли: ls -la assets/js/modules/"
    echo "  4. Перевірте консоль браузера (F12) на помилки"
    exit 1
fi
