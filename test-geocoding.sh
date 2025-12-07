#!/bin/bash

# ═══════════════════════════════════════════════════════════
# 🧪 ТЕСТ: Перевірка геокодування адрес
# ═══════════════════════════════════════════════════════════

echo "🧪 Тестування геокодування адрес"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Отримуємо токен (використовуємо admin)
echo "🔑 Отримання токену..."
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "❌ Помилка: не вдалося отримати токен"
    exit 1
fi

echo "✅ Токен отримано"
echo ""

# Тест 1: Створення ліфта з адресою Avenida da República
echo "📝 ТЕСТ 1: Створення ліфта з адресою 'Avenida da República 1, Lisboa'"
echo "-------------------------------------------------------------------"

RESPONSE=$(curl -s -X POST http://localhost:5000/api/lifts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "liftId": "TEST-GEOCODE-001",
    "clientName": "Test Client Geocoding",
    "clientEmail": "test@geocode.com",
    "clientPhone": "+351999999999",
    "address": {
      "street": "Avenida da República 1",
      "city": "Lisboa",
      "zipCode": "1050-185",
      "country": "Portugal"
    },
    "brand": "Test Brand",
    "model": "Test Model",
    "capacity": 8,
    "floors": 10,
    "status": "active"
  }')

# Перевіряємо відповідь
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" == "true" ]; then
    LIFT_ID=$(echo "$RESPONSE" | jq -r '.data._id')
    COORDS=$(echo "$RESPONSE" | jq -r '.data.location.coordinates')
    
    echo "✅ Ліфт створено успішно!"
    echo "   ID: $LIFT_ID"
    echo "   Координати: $COORDS"
    
    # Перевірка координат (Lisboa близько -9.14, 38.71)
    LON=$(echo "$COORDS" | jq -r '.[0]')
    LAT=$(echo "$COORDS" | jq -r '.[1]')
    
    if [ "$LON" != "null" ] && [ "$LAT" != "null" ]; then
        echo "   ✅ Координати отримано через геокодування"
        echo "   📍 Longitude: $LON"
        echo "   📍 Latitude: $LAT"
        
        # Видаляємо тестовий ліфт
        echo ""
        echo "🗑️  Видалення тестового ліфта..."
        DELETE_RESPONSE=$(curl -s -X DELETE http://localhost:5000/api/lifts/$LIFT_ID \
          -H "Authorization: Bearer $TOKEN")
        
        DELETE_SUCCESS=$(echo "$DELETE_RESPONSE" | jq -r '.success')
        if [ "$DELETE_SUCCESS" == "true" ]; then
            echo "   ✅ Тестовий ліфт видалено"
        else
            echo "   ⚠️  Не вдалося видалити тестовий ліфт (ID: $LIFT_ID)"
            echo "   Видаліть вручну: mongosh deapseak --eval 'db.lifts.deleteOne({_id: ObjectId(\"$LIFT_ID\")})'"
        fi
    else
        echo "   ⚠️  Геокодування не спрацювало (координати null)"
    fi
else
    echo "❌ Помилка створення ліфта"
    echo "$RESPONSE" | jq .
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🏁 Тест завершено"
echo ""

# Показуємо логи сервера (останні 10 рядків)
echo "📄 Останні логи сервера:"
echo "-------------------------------------------------------------------"
tail -10 logs/unified-server.log | grep -E "(Geocod|🌍|✅|⚠️)" || tail -10 logs/unified-server.log
