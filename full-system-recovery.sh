#!/bin/bash

echo "🚨 ПОВНЕ ВІДНОВЛЕННЯ ДО РОБОЧОГО СТАНУ"
echo "======================================"

# Створюємо резервну копію поточного стану
echo "💾 Створюємо резервну копію..."
cp -r . ../deapseak-backup-$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

echo "🔄 Повертаємося до робочого коміту..."
git stash push -m "Тимчасове збереження поточних змін"

# Спробуємо повернутися до коміту з покращеним модальним вікном (він працював)
git reset --hard f4c8023

echo "✅ Повернулися до робочого стану"

# Перевіряємо статус
echo ""
echo "📊 Поточний стан:"
git log --oneline -3

echo ""
echo "🔧 Запускаємо тест системи..."
echo "Перевіряємо наявність CDN посилань..."

# Швидка перевірка
admin_dashboard_check=$(grep -c "cdn.jsdelivr.net" pages/admin/admin-dashboard.html 2>/dev/null || echo "0")
dispatcher_dashboard_check=$(grep -c "cdn.jsdelivr.net" pages/dispatcher/dashboard.html 2>/dev/null || echo "0")

echo "   📄 Admin dashboard CDN посилань: $admin_dashboard_check"
echo "   📄 Dispatcher dashboard CDN посилань: $dispatcher_dashboard_check"

if [ "$admin_dashboard_check" -gt 0 ] && [ "$dispatcher_dashboard_check" -gt 0 ]; then
    echo "   ✅ CDN посилання знайдено"
else
    echo "   ⚠️  CDN посилання не знайдено, можливо потрібно додаткове відновлення"
fi

echo ""
echo "🎉 Відновлення завершено!"
echo "Тепер система повинна працювати як до поломки."