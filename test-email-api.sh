#!/bin/bash

# ════════════════════════════════════════════════════════
# 🧪 Тест Email API - FestLift
# ════════════════════════════════════════════════════════

echo "🧪 Тестування Email API..."
echo ""

# 1. Отримати токен адміна
echo "📝 Крок 1: Логін як адмін..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "info@festlift.pt",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // .token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Помилка логіну!"
    echo "$LOGIN_RESPONSE" | jq .
    exit 1
fi

echo "✅ Токен отримано: ${TOKEN:0:20}..."
echo ""

# 2. Відправити тестовий email
echo "📧 Крок 2: Відправка тестового email..."
EMAIL_RESPONSE=$(curl -s -X POST http://localhost:5000/api/send-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ctaruj78@gmail.com",
    "subject": "🧪 Test Email from FestLift",
    "html": "<div style=\"font-family: Arial, sans-serif; padding: 20px;\"><h1 style=\"color: #007bff;\">✅ Test Successful!</h1><p>Brevo API працює коректно.</p><p>Email надіслано через <strong>FestLift System</strong></p><hr><p style=\"color: #666; font-size: 12px;\">Цей email надіслано автоматично для тестування системи.</p></div>"
  }')

echo ""
echo "📦 Відповідь сервера:"
echo "$EMAIL_RESPONSE" | jq .
echo ""

# Перевірити результат
SUCCESS=$(echo $EMAIL_RESPONSE | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
    echo "════════════════════════════════════════════════════════"
    echo "✅ Email успішно відправлено!"
    echo "════════════════════════════════════════════════════════"
    echo ""
    echo "📬 Перевірте email: ctaruj78@gmail.com"
    echo "📋 Subject: 🧪 Test Email from FestLift"
    echo ""
else
    echo "════════════════════════════════════════════════════════"
    echo "❌ Помилка відправки email"
    echo "════════════════════════════════════════════════════════"
    ERROR=$(echo $EMAIL_RESPONSE | jq -r '.error // .message')
    echo "Error: $ERROR"
    echo ""
fi

# Показати server logs
echo "📋 Останні логи Email:"
echo "────────────────────────────────────────────────────────"
tail -20 logs/unified-server.log | grep -E "EMAIL|email|📧|✅.*sent"
echo "────────────────────────────────────────────────────────"
