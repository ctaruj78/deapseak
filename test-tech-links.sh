#!/bin/bash

# Тест всіх посилань в панелі техніка

echo "🔍 Перевірка всіх URL в панелі техніка..."
echo ""

BASE_URL="http://localhost:5000"

# Масив сторінок для перевірки
PAGES=(
    "/pages/tech/dashboard.html"
    "/pages/tech/tasks.html"
    "/pages/tech/schedule.html"
    "/pages/tech/manutencao.html"
    "/pages/tech/inspections.html"
    "/pages/tech/reports.html"
    "/pages/tech/qr-scanner.html"
    "/pages/tech/ar-helper.html"
    "/pages/tech/tools.html"
    "/pages/tech/knowledge-base.html"
    "/pages/tech/manuals.html"
    "/pages/tech/checklists.html"
    "/pages/tech/videos.html"
    "/pages/tech/support.html"
    "/pages/tech/profile.html"
    "/pages/tech/notifications.html"
)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 Перевірка доступності сторінок:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SUCCESS=0
FAILED=0

for page in "${PAGES[@]}"; do
    URL="${BASE_URL}${page}"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
    
    if [ "$STATUS" = "200" ]; then
        echo "✅ $page"
        ((SUCCESS++))
    elif [ "$STATUS" = "404" ]; then
        echo "❌ $page - ФАЙЛ НЕ ІСНУЄ (404)"
        ((FAILED++))
    else
        echo "⚠️  $page - STATUS: $STATUS"
        ((FAILED++))
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Результат:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Доступні: $SUCCESS"
echo "❌ Недоступні: $FAILED"
echo ""

# Перевірка API endpoints
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 Перевірка API endpoints:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

API_ENDPOINTS=(
    "/api/health"
    "/api/auth/login"
    "/api/lifts"
    "/api/requests"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    URL="${BASE_URL}${endpoint}"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
    
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "401" ]; then
        echo "✅ $endpoint (STATUS: $STATUS)"
    else
        echo "❌ $endpoint (STATUS: $STATUS)"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 Перевірка посилань в manutencao.html:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Перевірка кнопки QR-сканера в manutencao.html
MANUTENCAO_URL="${BASE_URL}/pages/tech/manutencao.html"
echo "📄 Сторінка: $MANUTENCAO_URL"

# Перевіряємо чи містить href="qr-scanner.html"
if curl -s "$MANUTENCAO_URL" | grep -q 'href="qr-scanner.html"'; then
    echo "⚠️  Знайдено ВІДНОСНЕ посилання: href=\"qr-scanner.html\""
    echo "    → Має бути: href=\"/pages/tech/qr-scanner.html\" або href=\"qr-scanner.html\""
    echo ""
    echo "    Відносний шлях ПРАЦЮЄ тому що:"
    echo "    - Поточний URL: /pages/tech/manutencao.html"
    echo "    - Відносний: qr-scanner.html"
    echo "    - Результат: /pages/tech/qr-scanner.html ✅"
fi

# Перевіряємо чи QR-сканер завантажується
QR_URL="${BASE_URL}/pages/tech/qr-scanner.html"
QR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$QR_URL")

if [ "$QR_STATUS" = "200" ]; then
    echo "✅ QR-сканер доступний: $QR_URL"
else
    echo "❌ QR-сканер НЕДОСТУПНИЙ: $QR_URL (STATUS: $QR_STATUS)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Тест завершено!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
