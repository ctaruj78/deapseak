#!/bin/bash

# Тест відправки email через Brevo SMTP
# Використання: ./test-email.sh recipient@example.com

RECIPIENT=${1:-"admin@festlift.pt"}
API_URL="http://localhost:5000/api/send-email"

echo "📧 Тестування відправки email через Brevo SMTP"
echo "================================================"
echo "📬 Отримувач: $RECIPIENT"
echo "🔗 API: $API_URL"
echo ""

# Отримати токен (замість цього використайте реальний токен адміна)
echo "⚠️  УВАГА: Вам потрібен токен адміністратора!"
echo "1. Увійдіть в систему як адмін (admin@deapseak.com / admin123)"
echo "2. Відкрийте DevTools → Application → Local Storage"
echo "3. Скопіюйте значення 'token'"
echo ""
read -p "Введіть токен адміна: " ADMIN_TOKEN

echo ""
echo "📤 Надсилання тестового email..."

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"to\": \"$RECIPIENT\",
    \"subject\": \"🧪 Test Email від LiftMaster Pro\",
    \"html\": \"<html><body><h1>Це тестовий email</h1><p>Якщо ви отримали цей email, значить Brevo SMTP працює!</p><p>✅ Email сервіс налаштовано правильно.</p><hr><small>Надіслано: $(date)</small></body></html>\"
  }" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo "================================================"
echo "✅ Перевірте inbox отримувача: $RECIPIENT"
echo "📊 Статистика Brevo: https://app.brevo.com/statistics/email"
