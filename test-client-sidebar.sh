#!/bin/bash

# Тест уніфікації клієнтського sidebar
# Перевіряє що всі посилання коректні і не ведуть на інші панелі

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ТЕСТ УНІФІКАЦІЇ КЛІЄНТСЬКОГО SIDEBAR                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0
CLIENT_DIR="/workspaces/deapseak/pages/client"
TEMPLATE="/workspaces/deapseak/components/client-sidebar-template.html"

# Тест 1: Всі файли існують
echo "✓ Тест 1: Перевірка існування файлів"
FILE_COUNT=$(ls $CLIENT_DIR/*.html 2>/dev/null | wc -l)
if [ $FILE_COUNT -eq 11 ]; then
    echo "  ✅ Знайдено 11 клієнтських файлів"
    ((PASS++))
else
    echo "  ❌ Знайдено $FILE_COUNT файлів (має бути 11)"
    ((FAIL++))
fi
echo ""

# Тест 2: Шаблон існує
echo "✓ Тест 2: Наявність шаблону"
if [ -f "$TEMPLATE" ]; then
    echo "  ✅ Шаблон існує: client-sidebar-template.html"
    ((PASS++))
else
    echo "  ❌ Шаблон НЕ знайдено"
    ((FAIL++))
fi
echo ""

# Тест 3: Всі файли мають еталонний sidebar
echo "✓ Тест 3: Еталонний sidebar у всіх файлах"
FILES_WITH_TEMPLATE=$(grep -l "ЕТАЛОННИЙ SIDEBAR" $CLIENT_DIR/*.html 2>/dev/null | wc -l)
if [ $FILES_WITH_TEMPLATE -eq 11 ]; then
    echo "  ✅ Всі 11 файлів мають еталонний sidebar"
    ((PASS++))
else
    echo "  ❌ Тільки $FILES_WITH_TEMPLATE файлів мають еталонний sidebar"
    echo "  Файли без еталонного sidebar:"
    for file in $CLIENT_DIR/*.html; do
        if ! grep -q "ЕТАЛОННИЙ SIDEBAR" "$file"; then
            echo "     - $(basename $file)"
        fi
    done
    ((FAIL++))
fi
echo ""

# Тест 4: Немає чужих посилань
echo "✓ Тест 4: Відсутність посилань на інші панелі"
FILES_WITH_BAD_LINKS=$(grep -l "/pages/admin\|/pages/dispatcher\|/pages/tech" $CLIENT_DIR/*.html 2>/dev/null | wc -l)
if [ $FILES_WITH_BAD_LINKS -eq 0 ]; then
    echo "  ✅ Жодних посилань на admin/dispatcher/tech"
    ((PASS++))
else
    echo "  ❌ Знайдено чужі посилання в $FILES_WITH_BAD_LINKS файлах:"
    grep -l "/pages/admin\|/pages/dispatcher\|/pages/tech" $CLIENT_DIR/*.html 2>/dev/null | while read file; do
        echo "     - $(basename $file)"
        grep -n "/pages/admin\|/pages/dispatcher\|/pages/tech" "$file" | head -3 | sed 's/^/       /'
    done
    ((FAIL++))
fi
echo ""

# Тест 5: Всі посилання в шаблоні існують
echo "✓ Тест 5: Валідність посилань в шаблоні"
BROKEN_LINKS=0
grep -o 'href="/[^"]*"' $TEMPLATE | sed 's/href="//;s/"//' | while read link; do
    full_path="/workspaces/deapseak${link}"
    if [ ! -f "$full_path" ]; then
        echo "  ❌ Зламане посилання: $link"
        ((BROKEN_LINKS++))
    fi
done

if [ $BROKEN_LINKS -eq 0 ]; then
    echo "  ✅ Всі посилання в шаблоні валідні"
    ((PASS++))
else
    echo "  ❌ Знайдено $BROKEN_LINKS зламаних посилань"
    ((FAIL++))
fi
echo ""

# Тест 6: Перевірка обов'язкових пунктів меню
echo "✓ Тест 6: Обов'язкові пункти меню"
REQUIRED_PAGES=("dashboard" "my-lifts" "requests" "invoices" "profile" "settings")
MISSING=0

for page in "${REQUIRED_PAGES[@]}"; do
    if grep -q "href=\"/pages/client/${page}.html\"" $TEMPLATE; then
        echo "  ✅ $page.html присутній"
    else
        echo "  ❌ $page.html ВІДСУТНІЙ"
        ((MISSING++))
    fi
done

if [ $MISSING -eq 0 ]; then
    ((PASS++))
else
    ((FAIL++))
fi
echo ""

# Тест 7: Португальські назви
echo "✓ Тест 7: Португальські назви меню"
PT_TERMS=("Meus Elevadores" "Pedidos" "Faturas" "Perfil" "Definições")
PT_FOUND=0

for term in "${PT_TERMS[@]}"; do
    if grep -q "$term" $TEMPLATE; then
        ((PT_FOUND++))
    fi
done

if [ $PT_FOUND -eq 5 ]; then
    echo "  ✅ Всі португальські назви присутні"
    ((PASS++))
else
    echo "  ⚠️  Знайдено тільки $PT_FOUND/5 португальських назв"
    ((FAIL++))
fi
echo ""

# Тест 8: Badges для підрахунку
echo "✓ Тест 8: Real-time badges"
BADGES=("liftsCount" "requestsCount" "invoicesCount" "notificationsBadge")
BADGES_FOUND=0

for badge in "${BADGES[@]}"; do
    if grep -q "id=\"$badge\"" $TEMPLATE; then
        ((BADGES_FOUND++))
    fi
done

if [ $BADGES_FOUND -eq 4 ]; then
    echo "  ✅ Всі 4 real-time badges присутні"
    ((PASS++))
else
    echo "  ⚠️  Знайдено тільки $BADGES_FOUND/4 badges"
    ((FAIL++))
fi
echo ""

# Підсумок
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "РЕЗУЛЬТАТИ:"
echo "  ✅ PASSED: $PASS"
echo "  ❌ FAILED: $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAIL -eq 0 ]; then
    echo ""
    echo "🎉 ВСІ ТЕСТИ ПРОЙДЕНО!"
    echo ""
    echo "Клієнтська панель повністю уніфікована і готова до використання."
    echo "Перевірте: http://localhost:5000/pages/client/dashboard.html"
    echo ""
    exit 0
else
    echo ""
    echo "⚠️  ВИЯВЛЕНО ПРОБЛЕМИ!"
    echo ""
    echo "Потрібно виправити $FAIL тест(ів)."
    echo ""
    exit 1
fi
