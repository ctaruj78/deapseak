#!/bin/bash

# DEAPSEAK - СИСТЕМА ПЕРЕВІРКИ
echo "🚀 DEAPSEAK - Перевірка системи"
echo "================================"

# Перевірка портів
echo "📡 Перевірка портів:"
echo -n "   API сервер (3001): "
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ OK"
else
    echo "❌ НЕДОСТУПНИЙ"
fi

echo -n "   Веб-сайт (8080): "
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ OK"
else
    echo "❌ НЕДОСТУПНИЙ"
fi

# Перевірка MongoDB
echo -n "   MongoDB (27017): "
if ps aux | grep -q "[m]ongod"; then
    echo "✅ Запущена"
else
    echo "❌ Не запущена"
fi

echo ""
echo "🔐 Тестування авторизації:"

# Тест логіну адміна
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@deapseak.com","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$ADMIN_TOKEN" ]; then
    echo "   ✅ Адмін логін OK"
else
    echo "   ❌ Адмін логін ПОМИЛКА"
fi

# Тест логіну диспетчера
DISP_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dispatcher@deapseak.com","password":"dispatcher123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$DISP_TOKEN" ]; then
    echo "   ✅ Диспетчер логін OK"
else
    echo "   ❌ Диспетчер логін ПОМИЛКА"
fi

echo ""
echo "📋 Тестування API endpoints:"

if [ ! -z "$ADMIN_TOKEN" ]; then
    # Тест запитів заявок
    REQUESTS=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3001/api/requests)
    if echo "$REQUESTS" | grep -q "title"; then
        echo "   ✅ /api/requests OK"
    else
        echo "   ❌ /api/requests ПОМИЛКА"
    fi

    # Тест запиту техніків
    TECHS=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3001/api/technicians)
    if echo "$TECHS" | grep -q "firstName"; then
        echo "   ✅ /api/technicians OK"
    else
        echo "   ❌ /api/technicians ПОМИЛКА"
    fi

    # Тест активностей
    ACTIVITIES=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3001/api/activities)
    if echo "$ACTIVITIES" | grep -q "message"; then
        echo "   ✅ /api/activities OK"
    else
        echo "   ❌ /api/activities ПОМИЛКА"
    fi
else
    echo "   ⚠️  Не можу тестувати API - немає токена"
fi

echo ""
echo "📊 Загальний стан:"

# Підрахунок OK/ERROR
if curl -s http://localhost:3001/api/health > /dev/null && \
   curl -s http://localhost:8080 > /dev/null && \
   [ ! -z "$ADMIN_TOKEN" ] && [ ! -z "$DISP_TOKEN" ]; then
    echo "   🎉 ВСІ СИСТЕМИ ПРАЦЮЮТЬ!"
    echo ""
    echo "🌐 URL для доступу:"
    echo "   Головна: http://localhost:8080"
    echo "   Логін: http://localhost:8080/login.html"
    echo "   Диспетчер: http://localhost:8080/pages/dispatcher/dashboard.html"
    echo "   API: http://localhost:3001"
else
    echo "   ⚠️  Є проблеми в системі"
    echo ""
    echo "🔧 Для виправлення запустіть:"
    echo "   ./start-servers.sh"
fi

echo ""
echo "🔑 Облікові дані:"
echo "   Адміністратор: admin@deapseak.com / admin123"
echo "   Диспетчер: dispatcher@deapseak.com / dispatcher123"