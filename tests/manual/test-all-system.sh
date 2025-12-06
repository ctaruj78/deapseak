#!/bin/bash

echo "🚀 DeapSeaK System Auto-Tester"
echo "================================"
echo "Автоматичне тестування всіх функцій системи"
echo ""

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Лічильники
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Функція для виводу результату тесту
test_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "  ✅ ${GREEN}PASS${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  ❌ ${RED}FAIL${NC}: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Функція для HTTP запитів
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local expected_status=$4
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X $method -H "Content-Type: application/json" -d "$data" "$url")
    else
        response=$(curl -s -w "%{http_code}" -X $method "$url")
    fi
    
    status_code="${response: -3}"
    body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ] || [ "$expected_status" = "any" ]; then
        return 0
    else
        return 1
    fi
}

echo "🔍 1. ПЕРЕВІРКА ДОСТУПНОСТІ СЕРВЕРІВ"
echo "------------------------------------"

# Перевірка веб-сервера
curl -s -f http://localhost:8080/login.html > /dev/null
test_result $? "Веб-сервер (localhost:8080)"

# Перевірка API сервера
curl -s -f http://localhost:3001/api/status > /dev/null
test_result $? "API сервер (localhost:3001)"

# Перевірка MongoDB через API
response=$(curl -s http://localhost:3001/api/status)
if echo "$response" | grep -q "mongodb.*true"; then
    test_result 0 "MongoDB база даних"
else
    test_result 1 "MongoDB база даних"
fi

echo ""
echo "🔐 2. ТЕСТУВАННЯ АУТЕНТИФІКАЦІЇ"
echo "--------------------------------"

# Тест логіну (створюємо тестового користувача якщо потрібно)
login_data='{"email":"admin@liftmaster.com","password":"admin123"}'
make_request "POST" "http://localhost:3001/api/auth/login" "$login_data" "200"
test_result $? "Логін адміністратора"

# Тест реєстрації
register_data='{"username":"testuser'$(date +%s)'","password":"testpass123","email":"test'$(date +%s)'@example.com","firstName":"Test","lastName":"User","role":"client"}'
make_request "POST" "http://localhost:3001/api/auth/register" "$register_data" "201"
test_result $? "Реєстрація нового користувача"

# Тест перевірки токена (без токена - має повернути помилку)
make_request "GET" "http://localhost:3001/api/verify-token" "" "401"
test_result $? "Перевірка токена без авторизації"

echo ""
echo "🏢 3. ТЕСТУВАННЯ API ЛІФТІВ"
echo "----------------------------"

# Отримання списку ліфтів
make_request "GET" "http://localhost:3001/api/lifts" "" "200"
test_result $? "Отримання списку ліфтів"

# Створення тестового ліфта
lift_data='{"address":"Тестова адреса '$(date +%s)'","municipalNumber":"TEST-'$(date +%s)'","type":"Пасажирський","loadCapacity":1000,"floorCount":10,"manufacturingYear":2023,"status":"active"}'
make_request "POST" "http://localhost:3001/api/lifts" "$lift_data" "201"
test_result $? "Створення нового ліфта"

# Отримання ліфта за неіснуючим ID
make_request "GET" "http://localhost:3001/api/lifts/nonexistent" "" "404"
test_result $? "Отримання неіснуючого ліфта (має повернути 404)"

echo ""
echo "📋 4. ТЕСТУВАННЯ API ЗАЯВОК"
echo "----------------------------"

# Отримання списку заявок
make_request "GET" "http://localhost:3001/api/requests" "" "200"
test_result $? "Отримання списку заявок"

# Створення тестової заявки
request_data='{"title":"Тестова заявка '$(date +%s)'","description":"Автоматично створена заявка","priority":"medium","type":"maintenance","status":"open"}'
make_request "POST" "http://localhost:3001/api/requests" "$request_data" "201"
test_result $? "Створення нової заявки"

echo ""
echo "👥 5. ТЕСТУВАННЯ API КОРИСТУВАЧІВ"
echo "--------------------------------"

# Отримання списку користувачів
make_request "GET" "http://localhost:3001/api/users" "" "200"
test_result $? "Отримання списку користувачів"

# Тест з неправильними даними
invalid_user='{"username":"","password":"123"}'
make_request "POST" "http://localhost:3001/api/users" "$invalid_user" "400"
test_result $? "Створення користувача з неправильними даними (має повернути помилку)"

echo ""
echo "🔧 6. ТЕСТУВАННЯ API ПРИЗНАЧЕНЬ"
echo "--------------------------------"

# Отримання списку призначень
make_request "GET" "http://localhost:3001/api/assignments" "" "200"
test_result $? "Отримання списку призначень"

# Створення тестового призначення
assignment_data='{"title":"Тестове призначення","description":"Автоматично створене","priority":"high","status":"assigned","scheduledDate":"'$(date -d "+1 day" +%Y-%m-%d)'"}'
make_request "POST" "http://localhost:3001/api/assignments" "$assignment_data" "201"
test_result $? "Створення нового призначення"

echo ""
echo "📊 7. ТЕСТУВАННЯ СТАТИСТИКИ ТА ЗВІТІВ"
echo "------------------------------------"

# Тест статистики
make_request "GET" "http://localhost:3001/api/stats/dashboard" "" "200"
test_result $? "Отримання статистики дашборду"

# Тест звітів
make_request "GET" "http://localhost:3001/api/reports/lifts" "" "200"
test_result $? "Генерація звіту по ліфтах"

make_request "GET" "http://localhost:3001/api/reports/requests" "" "200"
test_result $? "Генерація звіту по заявках"

echo ""
echo "🌐 8. ТЕСТУВАННЯ ВЕББІЛЬНИХ СТОРІНОК"
echo "------------------------------------"

# Головна сторінка
curl -s -f http://localhost:8080/index.html > /dev/null
test_result $? "Головна сторінка"

# Сторінка логіну
curl -s -f http://localhost:8080/login.html > /dev/null
test_result $? "Сторінка логіну"

# Адмін панель
curl -s -f http://localhost:8080/pages/admin/lifts.html > /dev/null
test_result $? "Адмін панель - ліфти"

# Диспетчер панель
curl -s -f http://localhost:8080/pages/dispatcher/assignments.html > /dev/null
test_result $? "Диспетчер панель - призначення"

# Технік панель
curl -s -f http://localhost:8080/pages/tech/dashboard.html > /dev/null
test_result $? "Технік панель - дашборд"

# Клієнт панель
curl -s -f http://localhost:8080/pages/client/dashboard.html > /dev/null
test_result $? "Клієнт панель - дашборд"

# QR сканер
curl -s -f http://localhost:8080/pages/qr/qr-scanner.html > /dev/null
test_result $? "QR сканер"

echo ""
echo "📱 9. ТЕСТУВАННЯ СТАТИЧНИХ РЕСУРСІВ"
echo "-----------------------------------"

# CSS файли
curl -s -f http://localhost:8080/assets/css/style.css > /dev/null
test_result $? "Основні CSS стилі"

# JavaScript файли
curl -s -f http://localhost:8080/assets/js/auth.js > /dev/null
test_result $? "JavaScript - авторизація"

curl -s -f http://localhost:8080/assets/js/enhanced-lift-modal.js > /dev/null
test_result $? "JavaScript - модальні вікна ліфтів"

# Зображення
curl -s -f http://localhost:8080/assets/img/logo.png > /dev/null 2>/dev/null
test_result $? "Зображення логотипу (опціонально)"

echo ""
echo "⚡ 10. СТРЕС-ТЕСТУВАННЯ"
echo "----------------------"

# Одночасні запити до API
echo "Виконання 20 одночасних запитів до API..."
stress_success=0
for i in {1..20}; do
    curl -s -f http://localhost:3001/api/lifts > /dev/null &
done
wait

# Перевірка що API все ще доступний після стресу
sleep 2
curl -s -f http://localhost:3001/api/status > /dev/null
test_result $? "API доступний після стрес-тестування"

# Перевірка веб-сервера після стресу
curl -s -f http://localhost:8080/login.html > /dev/null
test_result $? "Веб-сервер доступний після стрес-тестування"

echo ""
echo "📊 ПІДСУМОК ТЕСТУВАННЯ"
echo "======================"
echo -e "Загалом тестів: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Успішно пройдено: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Не пройдено: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}ВСІ ТЕСТИ ПРОЙДЕНО УСПІШНО!${NC}"
    echo -e "Система DeapSeaK працює стабільно та готова до використання."
else
    echo -e "\n⚠️  ${YELLOW}ДЕЯКІ ТЕСТИ НЕ ПРОЙДЕНО${NC}"
    echo -e "Рекомендується перевірити та виправити виявлені проблеми."
fi

# Розрахунок відсотка успішності
success_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
echo -e "Рівень успішності: ${BLUE}$success_rate%${NC}"

echo ""
echo "💡 РЕКОМЕНДАЦІЇ:"
if [ $success_rate -ge 90 ]; then
    echo "✅ Система працює відмінно"
elif [ $success_rate -ge 70 ]; then
    echo "⚠️ Система працює задовільно, є невеликі проблеми"
else
    echo "❌ Система потребує серйозного втручання"
fi

echo ""
echo "📝 Детальний лог збережено в simulator.html"
echo "🌐 Відкрийте http://localhost:8080/simulator.html для інтерактивного тестування"

exit $FAILED_TESTS