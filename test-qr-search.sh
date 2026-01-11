#!/bin/bash

echo "🔍 Тестування пошуку QR кодів..."
echo ""

# Кольори
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Перевірка 1: Чи файл qr-manager.js існує
echo "1️⃣ Перевірка існування qr-manager.js..."
if [ -f "/workspaces/deapseak/assets/js/modules/qr-manager.js" ]; then
    echo -e "${GREEN}✅ Файл знайдено${NC}"
else
    echo -e "${RED}❌ Файл не знайдено${NC}"
    exit 1
fi

# Перевірка 2: Чи є функція searchQR
echo ""
echo "2️⃣ Перевірка функції searchQR()..."
if grep -q "function searchQR()" /workspaces/deapseak/assets/js/modules/qr-manager.js; then
    echo -e "${GREEN}✅ Функція searchQR знайдена${NC}"
    grep -A 7 "function searchQR()" /workspaces/deapseak/assets/js/modules/qr-manager.js | head -8
else
    echo -e "${RED}❌ Функція searchQR не знайдена${NC}"
fi

# Перевірка 3: Чи є розширений пошук в filterQRData
echo ""
echo "3️⃣ Перевірка розширеного пошуку (4 поля)..."
if grep -q "matchCode.*matchName.*matchLocation.*matchId" /workspaces/deapseak/assets/js/modules/qr-manager.js; then
    echo -e "${GREEN}✅ Розширений пошук (код, адреса, локація, ID)${NC}"
else
    echo -e "${YELLOW}⚠️ Можливо не всі поля для пошуку${NC}"
fi

# Перевірка 4: Чи є event listener для input
echo ""
echo "4️⃣ Перевірка event listener для searchInput..."
if grep -q "searchInput.*on.*input" /workspaces/deapseak/assets/js/modules/qr-manager.js; then
    echo -e "${GREEN}✅ Event listener для input знайдено${NC}"
    grep "searchInput.*on.*input" /workspaces/deapseak/assets/js/modules/qr-manager.js
else
    echo -e "${RED}❌ Event listener для input не знайдено${NC}"
fi

# Перевірка 5: Чи є підтримка Enter
echo ""
echo "5️⃣ Перевірка підтримки Enter..."
if grep -q "keypress.*13.*Enter" /workspaces/deapseak/assets/js/modules/qr-manager.js; then
    echo -e "${GREEN}✅ Підтримка Enter знайдена${NC}"
else
    echo -e "${RED}❌ Підтримка Enter не знайдена${NC}"
fi

# Перевірка 6: Чи є debounce функція
echo ""
echo "6️⃣ Перевірка debounce функції..."
if grep -q "function debounce" /workspaces/deapseak/assets/js/modules/qr-manager.js; then
    echo -e "${GREEN}✅ Debounce функція знайдена${NC}"
else
    echo -e "${YELLOW}⚠️ Debounce функція не знайдена (може бути глобальна)${NC}"
fi

# Перевірка 7: Чи є логування
echo ""
echo "7️⃣ Перевірка логування пошуку..."
if grep -q "console.log.*Пошук" /workspaces/deapseak/assets/js/modules/qr-manager.js; then
    echo -e "${GREEN}✅ Логування пошуку знайдено${NC}"
else
    echo -e "${YELLOW}⚠️ Логування пошуку не знайдено${NC}"
fi

# Перевірка 8: Чи немає подвійної ініціалізації
echo ""
echo "8️⃣ Перевірка подвійної ініціалізації..."
auto_init_count=$(grep -c "document.ready.*qrManager.init" /workspaces/deapseak/assets/js/modules/qr-manager.js || echo "0")
if [ "$auto_init_count" -eq 0 ]; then
    echo -e "${GREEN}✅ Немає автоініціалізації в модулі (добре)${NC}"
else
    echo -e "${YELLOW}⚠️ Знайдено $auto_init_count автоініціалізацій (може бути конфлікт)${NC}"
fi

# Перевірка 9: Чи правильно підключений на сторінці
echo ""
echo "9️⃣ Перевірка підключення на сторінці qr-management.html..."
if grep -q "qr-manager.js" /workspaces/deapseak/pages/admin/qr-management.html; then
    echo -e "${GREEN}✅ qr-manager.js підключено${NC}"
    grep "qr-manager.js" /workspaces/deapseak/pages/admin/qr-management.html
else
    echo -e "${RED}❌ qr-manager.js НЕ підключено${NC}"
fi

# Перевірка 10: Чи є searchInput на сторінці
echo ""
echo "🔟 Перевірка наявності searchInput на сторінці..."
if grep -q 'id="searchInput"' /workspaces/deapseak/pages/admin/qr-management.html; then
    echo -e "${GREEN}✅ searchInput знайдено${NC}"
    grep 'id="searchInput"' /workspaces/deapseak/pages/admin/qr-management.html
else
    echo -e "${RED}❌ searchInput НЕ знайдено${NC}"
fi

# Перевірка 11: Тест API lifts
echo ""
echo "1️⃣1️⃣ Тестування API /api/lifts..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/lifts -H "Authorization: Bearer test")
if [ "$response" -eq 200 ] || [ "$response" -eq 401 ]; then
    echo -e "${GREEN}✅ API працює (код: $response)${NC}"
else
    echo -e "${RED}❌ API не відповідає (код: $response)${NC}"
fi

# Підсумок
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 ПІДСУМОК ТЕСТУВАННЯ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Для перевірки в браузері:"
echo "1. Відкрийте: http://localhost:5000/pages/admin/qr-management.html"
echo "2. Відкрийте Console (F12)"
echo "3. Подивіться на логи:"
echo "   - '✅ QR Manager initialized'"
echo "   - '🔗 Налаштування event listeners...'"
echo "   - '✅ Event listeners встановлено'"
echo "4. Введіть текст в поле пошуку"
echo "5. Перевірте лог '🔍 Пошук: <текст>'"
echo "6. Перевірте лог '📝 Input event triggered'"
echo ""
echo "Якщо не працює:"
echo "- Перезавантажте сторінку (Ctrl+F5)"
echo "- Очистіть кеш браузера"
echo "- Перевірте Network tab чи завантажився qr-manager.js"
echo ""
