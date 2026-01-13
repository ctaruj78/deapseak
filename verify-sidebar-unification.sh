#!/bin/bash

echo "🧪 Швидка перевірка sidebar після уніфікації"
echo "=============================================="
echo ""

# Перевірка 1: Чи всі файли мають sidebar
echo "1️⃣ Перевірка наявності sidebar..."
MISSING=0
for page in dashboard my-lifts ai-predictions requests invoices history documentation notifications support profile settings; do
  if ! grep -q "main-sidebar" "/workspaces/deapseak/pages/client/${page}.html" 2>/dev/null; then
    echo "   ❌ ${page}.html - sidebar відсутній!"
    MISSING=$((MISSING + 1))
  fi
done

if [ $MISSING -eq 0 ]; then
  echo "   ✅ Всі 11 файлів мають sidebar"
else
  echo "   ❌ Знайдено $MISSING файлів без sidebar"
fi

# Перевірка 2: Чи немає посилань на інші панелі
echo ""
echo "2️⃣ Перевірка на cross-panel links..."
CROSS_LINKS=$(grep -r "pages/admin\|pages/dispatcher\|pages/tech" /workspaces/deapseak/pages/client/*.html 2>/dev/null | wc -l)

if [ "$CROSS_LINKS" -eq 0 ]; then
  echo "   ✅ Немає посилань на admin/dispatcher/tech панелі"
else
  echo "   ❌ Знайдено $CROSS_LINKS посилань на інші панелі:"
  grep -n "pages/admin\|pages/dispatcher\|pages/tech" /workspaces/deapseak/pages/client/*.html | head -10
fi

# Перевірка 3: Чи однаковий розмір sidebar
echo ""
echo "3️⃣ Перевірка однаковості sidebar..."
SIDEBARS=$(for f in /workspaces/deapseak/pages/client/*.html; do
  grep -oP '<aside class="main-sidebar[\s\S]*?</aside>' "$f" 2>/dev/null | wc -c
done | sort -u | wc -l)

if [ "$SIDEBARS" -eq 1 ]; then
  echo "   ✅ Sidebar однаковий на всіх сторінках"
else
  echo "   ⚠️ Знайдено $SIDEBARS різних варіантів sidebar"
fi

# Перевірка 4: Кількість пунктів меню
echo ""
echo "4️⃣ Підрахунок пунктів меню..."
FIRST_FILE="/workspaces/deapseak/pages/client/dashboard.html"
NAV_ITEMS=$(grep -o '<li class="nav-item">' "$FIRST_FILE" 2>/dev/null | wc -l)
echo "   📋 Кількість пунктів в dashboard.html: $NAV_ITEMS"

if [ "$NAV_ITEMS" -ge 11 ]; then
  echo "   ✅ Меню повне (11+ пунктів)"
else
  echo "   ⚠️ Меню неповне (очікується мінімум 11)"
fi

# Перевірка 5: Португальські назви
echo ""
echo "5️⃣ Перевірка португальської локалізації..."
PT_TERMS=0
for term in "Elevadores" "Pedidos" "Faturas" "Suporte" "Perfil"; do
  if grep -q "$term" "$FIRST_FILE" 2>/dev/null; then
    PT_TERMS=$((PT_TERMS + 1))
  fi
done

if [ $PT_TERMS -ge 4 ]; then
  echo "   ✅ Португальська локалізація присутня ($PT_TERMS/5 термінів)"
else
  echo "   ⚠️ Португальська локалізація неповна ($PT_TERMS/5 термінів)"
fi

# Перевірка 6: Backup
echo ""
echo "6️⃣ Перевірка backup..."
BACKUP_COUNT=$(find /workspaces/deapseak/backup -name "sidebar-backup-*" -type d 2>/dev/null | wc -l)
if [ $BACKUP_COUNT -gt 0 ]; then
  echo "   ✅ Знайдено $BACKUP_COUNT backup(s)"
  LATEST_BACKUP=$(ls -dt /workspaces/deapseak/backup/sidebar-backup-* 2>/dev/null | head -1)
  if [ -n "$LATEST_BACKUP" ]; then
    FILES_IN_BACKUP=$(ls "$LATEST_BACKUP" 2>/dev/null | wc -l)
    echo "   📦 Останній backup: $(basename "$LATEST_BACKUP")"
    echo "   📄 Файлів в backup: $FILES_IN_BACKUP"
  fi
else
  echo "   ⚠️ Backup не знайдено"
fi

# Підсумок
echo ""
echo "=============================================="
echo "📊 ПІДСУМОК:"
echo "=============================================="

TOTAL_CHECKS=6
PASSED_CHECKS=0

[ $MISSING -eq 0 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ "$CROSS_LINKS" -eq 0 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ "$SIDEBARS" -eq 1 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ "$NAV_ITEMS" -ge 11 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ $PT_TERMS -ge 4 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ $BACKUP_COUNT -gt 0 ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))

echo ""
echo "✅ Пройдено перевірок: $PASSED_CHECKS / $TOTAL_CHECKS"
echo ""

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
  echo "🎉 ВСІ ПЕРЕВІРКИ ПРОЙДЕНО! Sidebar уніфіковано успішно!"
  exit 0
elif [ $PASSED_CHECKS -ge 4 ]; then
  echo "⚠️ Більшість перевірок пройдено, але є незначні проблеми"
  exit 0
else
  echo "❌ Знайдено критичні проблеми - перевірте вручну!"
  exit 1
fi
