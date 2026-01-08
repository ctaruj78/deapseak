#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "🧪 ТЕСТ MUNICIPALITY API"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 1. Логін та отримання JWT токена
echo "1️⃣ Отримання JWT токена..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@deapseak.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Не вдалося отримати токен!"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Токен отримано: ${TOKEN:0:20}..."
echo ""

# 2. Створення тестового ліфта з адресою Lisboa
echo "2️⃣ Створення тестового ліфта з адресою Lisboa..."
LIFT_RESPONSE=$(curl -s -X POST http://localhost:5000/api/lifts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "TEST Elevador Lisboa",
    "address": "Rua Augusta 123, 1100-053 Lisboa",
    "municipalNumber": "TEST-'$(date +%s)'",
    "model": "Schindler 3300",
    "capacity": "630kg",
    "type": "Passageiros",
    "owner": "Cliente Teste"
  }')

echo "Response:"
echo "$LIFT_RESPONSE" | jq '.' 2>/dev/null || echo "$LIFT_RESPONSE"
echo ""

# 3. Перевірка чи є municipality в response
HAS_MUNICIPALITY=$(echo "$LIFT_RESPONSE" | grep -o '"municipality"')

if [ -n "$HAS_MUNICIPALITY" ]; then
    echo "✅ Municipality ЗНАЙДЕНО в response!"
    echo ""
    echo "📍 Деталі municipality:"
    echo "$LIFT_RESPONSE" | jq '.data.municipality' 2>/dev/null
else
    echo "❌ Municipality НЕ ЗНАЙДЕНО в response!"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 ПЕРЕВІРКА ЛОГІВ:"
echo "════════════════════════════════════════════════════════════════"
tail -30 logs/unified-server.log | grep -E "POST /api/lifts|município|municipality|Lisboa|1100"

echo ""
echo "════════════════════════════════════════════════════════════════"
