#!/bin/bash

echo "🧪 Тест клієнтської панелі"
echo ""
echo "📋 Перевірка серверу..."
curl -s http://localhost:5000/api/health | grep -q "ok" && echo "✅ Сервер працює" || echo "❌ Сервер не відповідає"

echo ""
echo "📋 Перевірка авторизації client@festlift.pt..."
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client@festlift.pt","password":"client123"}' | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Авторизація успішна"
  echo "Token: ${TOKEN:0:30}..."
  
  echo ""
  echo "📋 Перевірка GET /api/lifts..."
  RESPONSE=$(curl -s http://localhost:5000/api/lifts \
    -H "Authorization: Bearer $TOKEN")
  
  COUNT=$(echo "$RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")
  echo "✅ Отримано $COUNT ліфтів"
  
  if [ "$COUNT" -gt 0 ]; then
    echo ""
    echo "📋 Приклад першого ліфта:"
    echo "$RESPONSE" | jq '.data[0] | {municipalNumber, address: .address.street, client: .client.email}' 2>/dev/null || echo "Помилка парсингу"
  fi
else
  echo "❌ Помилка авторизації"
fi

echo ""
echo "✅ Тест завершено"
