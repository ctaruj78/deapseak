#!/bin/bash

# Тест фільтрації ліфтів по ролях
# Перевіряє чи клієнти бачать тільки свої ліфти, техніки - тільки з завдань, admin - всі

echo "🧪 ТЕСТ ФІЛЬТРАЦІЇ ЛІФТІВ ПО РОЛЯХ"
echo "===================================="
echo ""

BASE_URL="http://localhost:5000"

# Функція для логіну та отримання токена
login() {
    local email=$1
    local password=$2
    
    echo "🔑 Логін: $email"
    
    response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    token=$(echo $response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$token" ]; then
        echo "❌ Помилка логіну: $email"
        echo "   Відповідь: $response"
        return 1
    fi
    
    echo "✅ Токен отримано"
    echo "$token"
}

# Функція для отримання ліфтів
get_lifts() {
    local token=$1
    local role=$2
    
    echo ""
    echo "📋 Запит ліфтів для ролі: $role"
    
    response=$(curl -s -X GET "$BASE_URL/api/lifts" \
        -H "Authorization: Bearer $token")
    
    count=$(echo $response | grep -o '"data":\[' | wc -l)
    lifts_count=$(echo $response | grep -o '"_id"' | wc -l)
    
    echo "   Відповідь: $response" | head -c 200
    echo "..."
    echo "   📊 Знайдено ліфтів: $lifts_count"
    
    echo "$response"
}

echo "1️⃣ ТЕСТ: Логін як ADMIN"
echo "------------------------"
admin_token=$(login "admin@deapseak.com" "admin123")
if [ -z "$admin_token" ]; then
    echo "❌ Не вдалося залогінитись як admin"
    exit 1
fi

admin_lifts=$(get_lifts "$admin_token" "admin")
admin_count=$(echo $admin_lifts | grep -o '"_id"' | wc -l)
echo "✅ Admin бачить: $admin_count ліфтів (має бачити всі)"

echo ""
echo "2️⃣ ТЕСТ: Логін як CLIENT"
echo "------------------------"
client_token=$(login "client@deapseak.com" "client123")
if [ -z "$client_token" ]; then
    echo "❌ Не вдалося залогінитись як client"
    exit 1
fi

client_lifts=$(get_lifts "$client_token" "client")
client_count=$(echo $client_lifts | grep -o '"_id"' | wc -l)
echo "✅ Client бачить: $client_count ліфтів (має бачити тільки свої)"

echo ""
echo "3️⃣ ТЕСТ: Логін як TECHNICIAN"
echo "----------------------------"
tech_token=$(login "tech@deapseak.com" "tech123")
if [ -z "$tech_token" ]; then
    echo "❌ Не вдалося залогінитись як technician"
    exit 1
fi

tech_lifts=$(get_lifts "$tech_token" "technician")
tech_count=$(echo $tech_lifts | grep -o '"_id"' | wc -l)
echo "✅ Technician бачить: $tech_count ліфтів (має бачити тільки з активних завдань)"

echo ""
echo "4️⃣ ТЕСТ: Логін як DISPATCHER"
echo "----------------------------"
dispatcher_token=$(login "dispatcher@deapseak.com" "dispatcher123")
if [ -z "$dispatcher_token" ]; then
    echo "❌ Не вдалося залогінитись як dispatcher"
    exit 1
fi

dispatcher_lifts=$(get_lifts "$dispatcher_token" "dispatcher")
dispatcher_count=$(echo $dispatcher_lifts | grep -o '"_id"' | wc -l)
echo "✅ Dispatcher бачить: $dispatcher_count ліфтів (має бачити всі)"

echo ""
echo "📊 РЕЗУЛЬТАТИ:"
echo "=============="
echo "👨‍💼 Admin:      $admin_count ліфтів"
echo "👤 Client:     $client_count ліфтів"
echo "🔧 Technician: $tech_count ліфтів"
echo "📞 Dispatcher: $dispatcher_count ліфтів"
echo ""

# Перевірка логіки
if [ $admin_count -eq $dispatcher_count ]; then
    echo "✅ Admin і Dispatcher бачать однакову кількість (правильно)"
else
    echo "⚠️ Admin ($admin_count) і Dispatcher ($dispatcher_count) бачать різну кількість!"
fi

if [ $client_count -lt $admin_count ]; then
    echo "✅ Client бачить менше ніж Admin (правильно - тільки свої)"
else
    echo "⚠️ Client бачить $client_count, Admin бачить $admin_count - щось не так!"
fi

if [ $tech_count -le $admin_count ]; then
    echo "✅ Technician бачить не більше ніж Admin (правильно)"
else
    echo "⚠️ Technician бачить більше ніж Admin - помилка!"
fi

echo ""
echo "🎉 ТЕСТ ЗАВЕРШЕНО!"
