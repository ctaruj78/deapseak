#!/bin/bash

# 🔍 Тест виправлення пошуку QR по містах Португалії
# Перевіряє чи правильно береться location з lift.address.city

echo "🧪 ТЕСТ ПОШУКУ QR ПО МІСТАМ ПОРТУГАЛІЇ"
echo "======================================"
echo ""

# Кольори
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

# 1. Перевірка структури даних в MongoDB
echo "1️⃣  Перевірка структури lift.address в MongoDB..."
result=$(mongosh deapseak --quiet --eval "
    const lift = db.lifts.findOne({}, {address: 1, location: 1});
    if (lift.address && lift.address.city) {
        print('✅ lift.address.city існує: ' + lift.address.city);
    } else {
        print('❌ lift.address.city НЕ існує');
    }
    if (lift.location && lift.location.type === 'Point') {
        print('✅ lift.location це GeoJSON координати');
    } else {
        print('❌ lift.location НЕ GeoJSON');
    }
")
echo "$result"
if echo "$result" | grep -q "✅.*city існує"; then
    ((passed++))
else
    ((failed++))
fi
echo ""

# 2. Перевірка міст в базі
echo "2️⃣  Перевірка міст Португалії в базі..."
cities=$(mongosh deapseak --quiet --eval "
    db.lifts.distinct('address.city').forEach(city => print(city))
" | grep -v "^$")
echo "$cities"
if echo "$cities" | grep -qi "lisboa\|porto\|torres"; then
    echo -e "${GREEN}✅ Знайдено португальські міста${NC}"
    ((passed++))
else
    echo -e "${RED}❌ Португальські міста НЕ знайдено${NC}"
    ((failed++))
fi
echo ""

# 3. Перевірка коду qr-manager.js
echo "3️⃣  Перевірка коду qr-manager.js..."
if grep -q "lift.address?.city" assets/js/modules/qr-manager.js; then
    echo -e "${GREEN}✅ Код використовує lift.address.city${NC}"
    ((passed++))
else
    echo -e "${RED}❌ Код НЕ використовує lift.address.city${NC}"
    ((failed++))
fi

if grep -q "lift.location?.city" assets/js/modules/qr-manager.js; then
    echo -e "${RED}❌ Знайдено СТАРИЙ код lift.location.city (треба видалити!)${NC}"
    ((failed++))
else
    echo -e "${GREEN}✅ Старий код lift.location.city видалено${NC}"
    ((passed++))
fi
echo ""

# 4. Перевірка функції filterQRData
echo "4️⃣  Перевірка функції filterQRData()..."
if grep -A 20 "function filterQRData" assets/js/modules/qr-manager.js | grep -q "matchLocation"; then
    echo -e "${GREEN}✅ Функція filterQRData() шукає по location${NC}"
    ((passed++))
else
    echo -e "${RED}❌ Функція filterQRData() НЕ шукає по location${NC}"
    ((failed++))
fi
echo ""

# 5. Перевірка логування
echo "5️⃣  Перевірка логування для дебагу..."
if grep -A 15 "if (currentFilters.search)" assets/js/modules/qr-manager.js | grep -q "console.log.*Перевірка QR"; then
    echo -e "${GREEN}✅ Додано детальне логування пошуку${NC}"
    ((passed++))
else
    echo -e "${YELLOW}⚠️  Детальне логування відсутнє (необов'язково)${NC}"
fi
echo ""

# 6. Тест: симуляція пошуку
echo "6️⃣  Симуляція пошуку по містах..."
echo "   Перевірка кількості ліфтів по містах:"

lisboa_count=$(mongosh deapseak --quiet --eval "db.lifts.countDocuments({'address.city': /lisboa/i})")
echo "   📍 Lisboa: $lisboa_count ліфтів"

porto_count=$(mongosh deapseak --quiet --eval "db.lifts.countDocuments({'address.city': /porto/i})")
echo "   📍 Porto: $porto_count ліфтів"

torres_count=$(mongosh deapseak --quiet --eval "db.lifts.countDocuments({'address.city': /torres/i})")
echo "   📍 Torres Vedras: $torres_count ліфтів"

if [ "$lisboa_count" -gt 0 ] || [ "$porto_count" -gt 0 ] || [ "$torres_count" -gt 0 ]; then
    echo -e "${GREEN}✅ Знайдено ліфти в португальських містах${NC}"
    ((passed++))
else
    echo -e "${RED}❌ Ліфти в португальських містах НЕ знайдено${NC}"
    ((failed++))
fi
echo ""

# 7. Перевірка API endpoint
echo "7️⃣  Перевірка API /api/lifts (потребує токен)..."
echo "   (Пропущено - потребує автентифікації)"
echo ""

# Підсумок
echo "======================================"
echo "📊 РЕЗУЛЬТАТИ:"
echo -e "   ${GREEN}✅ Пройдено: $passed${NC}"
echo -e "   ${RED}❌ Провалено: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}🎉 ВСІ ТЕСТИ ПРОЙДЕНО! Пошук має працювати.${NC}"
    echo ""
    echo "📝 Інструкції для тестування:"
    echo "   1. Відкрийте: http://localhost:5000/pages/admin/qr-management.html"
    echo "   2. Введіть в пошук: 'lis'"
    echo "   3. Має показати ліфти з Lisboa"
    echo "   4. Перевірте консоль (F12) - має бути логування '🔍 Перевірка QR'"
    exit 0
else
    echo -e "${RED}❌ ТЕСТИ НЕ ПРОЙДЕНО! Перевірте помилки вище.${NC}"
    exit 1
fi
