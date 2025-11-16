#!/bin/bash

# DeapSeaK v2 API - Практичні приклади використання
# Цей скрипт демонструє всі основні операції з API

echo "╔════════════════════════════════════════════════╗"
echo "║   DeapSeaK v2 API - Практичний Tutorial       ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

BASE_URL="http://localhost:3001"

# 1. ВХІД В СИСТЕМУ
echo "📝 1. Вхід в систему (ваш admin акаунт)..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "ctaruj78@gmail.com",
    "password": "Solomia1704fel!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
USER_NAME=$(echo $LOGIN_RESPONSE | jq -r '.data.user.username')
USER_ROLE=$(echo $LOGIN_RESPONSE | jq -r '.data.user.role')

echo "   ✅ Увійшли як: $USER_NAME ($USER_ROLE)"
echo "   🔑 JWT Token: ${TOKEN:0:30}..."
echo ""

# 2. ПЕРЕГЛЯД ПРОФІЛЮ
echo "👤 2. Ваш профіль..."
curl -s $BASE_URL/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" | jq '{
    username: .data.user.username,
    email: .data.user.email,
    role: .data.user.role,
    fullName: .data.user.fullName
  }'
echo ""

# 3. СПИСОК УСІХ ЛІФТІВ
echo "🏢 3. Всі ліфти в системі..."
curl -s "$BASE_URL/api/lifts?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.lifts[] | {
    id: ._id,
    number: .municipalNumber,
    address: .address.street,
    city: .address.city,
    status: .status,
    technician: .technician.firstName
  }'
echo ""

# Зберігаємо ID першого ліфта для подальших операцій
LIFT_ID=$(curl -s "$BASE_URL/api/lifts?limit=1" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data.lifts[0]._id')
LIFT_NUMBER=$(curl -s "$BASE_URL/api/lifts?limit=1" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data.lifts[0].municipalNumber')

# 4. ДЕТАЛЬНА ІНФОРМАЦІЯ ПРО ЛІФТ
echo "🔍 4. Детальна інформація про ліфт $LIFT_NUMBER..."
curl -s "$BASE_URL/api/lifts/$LIFT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    municipalNumber: .data.lift.municipalNumber,
    manufacturer: .data.lift.manufacturer,
    model: .data.lift.model,
    capacity: .data.lift.capacity,
    floors: .data.lift.floors,
    status: .data.lift.status,
    lastInspection: .data.lift.lastInspectionDate,
    nextInspection: .data.lift.nextInspectionDate,
    location: .data.lift.location.coordinates
  }'
echo ""

# 5. ПОШУК ЛІФТІВ ПОБЛИЗУ (геолокація)
echo "📍 5. Ліфти поблизу (30.5234, 50.4501 - центр Києва)..."
curl -s "$BASE_URL/api/lifts/nearby?longitude=30.5234&latitude=50.4501&maxDistance=5000" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    count: .data.count,
    lifts: .data.lifts | map({
      number: .municipalNumber,
      address: .address.street,
      distance: "в радіусі 5км"
    })
  }'
echo ""

# 6. СТАТИСТИКА ПО ЛІФТАХ
echo "📊 6. Статистика по всіх ліфтах..."
curl -s "$BASE_URL/api/lifts/stats" \
  -H "Authorization: Bearer $TOKEN" | jq '.data'
echo ""

# 7. СПИСОК ЗАЯВОК
echo "📋 7. Всі заявки на обслуговування..."
curl -s "$BASE_URL/api/requests?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.requests[] | {
    id: ._id,
    title: .title,
    status: .status,
    priority: .priority,
    lift: .lift.municipalNumber,
    client: .client.firstName,
    createdAt: .createdAt
  }'
echo ""

# 8. СТВОРЕННЯ НОВОЇ ЗАЯВКИ
echo "➕ 8. Створюємо нову заявку на ліфт $LIFT_NUMBER..."
NEW_REQUEST=$(curl -s -X POST $BASE_URL/api/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lift\": \"$LIFT_ID\",
    \"title\": \"Тестова заявка від API\",
    \"description\": \"Перевірка створення заявки через API. Потрібна діагностика системи.\",
    \"priority\": \"medium\"
  }")

REQUEST_ID=$(echo $NEW_REQUEST | jq -r '.data.request._id')
echo "   ✅ Заявка створена! ID: $REQUEST_ID"
echo ""

# 9. ДОДАВАННЯ КОМЕНТАРЯ ДО ЗАЯВКИ
echo "💬 9. Додаємо коментар до заявки..."
curl -s -X POST "$BASE_URL/api/requests/$REQUEST_ID/comment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Це тестовий коментар. Заявка прийнята в роботу."
  }' | jq '{
    success: .success,
    message: .message,
    commentsCount: .data.request.comments | length
  }'
echo ""

# 10. СПИСОК УСІХ КОРИСТУВАЧІВ (тільки admin)
echo "👥 10. Всі користувачі в системі (admin only)..."
curl -s "$BASE_URL/api/auth/users?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.users[] | {
    username: .username,
    email: .email,
    role: .role,
    fullName: .fullName,
    phone: .phone
  }'
echo ""

# 11. ФІЛЬТРАЦІЯ ЛІФТІВ ПО СТАТУСУ
echo "🔎 11. Ліфти зі статусом 'operational'..."
curl -s "$BASE_URL/api/lifts?status=operational&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    total: .data.pagination.total,
    lifts: .data.lifts | map({
      number: .municipalNumber,
      address: .address.street,
      status: .status
    })
  }'
echo ""

# 12. ПОШУК ЛІФТІВ ПО АДРЕСІ
echo "🔍 12. Пошук ліфтів по адресі (Київ)..."
curl -s "$BASE_URL/api/lifts?search=Київ&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    found: .data.pagination.total,
    lifts: .data.lifts | map(.address.street)
  }'
echo ""

# 13. СТАТИСТИКА ПО ЗАЯВКАХ
echo "📈 13. Статистика по заявках..."
curl -s "$BASE_URL/api/requests/stats" \
  -H "Authorization: Bearer $TOKEN" | jq '.data'
echo ""

echo "╔════════════════════════════════════════════════╗"
echo "║   ✅ Tutorial завершено!                       ║"
echo "║                                                ║"
echo "║   Тепер ви можете:                             ║"
echo "║   • Входити в систему                          ║"
echo "║   • Переглядати ліфти та заявки                ║"
echo "║   • Створювати нові заявки                     ║"
echo "║   • Додавати коментарі                         ║"
echo "║   • Шукати по геолокації                       ║"
echo "║   • Переглядати статистику                     ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "💡 Збережіть ваш JWT токен для подальшої роботи:"
echo "   $TOKEN"
echo ""
echo "📚 Детальна документація: ./MONGODB-SETUP-COMPLETE.md"
