#!/bin/bash
# Скрипт для створення повноцінної версії dispatcher/lifts.html на основі admin/lifts.html

echo "🚀 Створення нової версії dispatcher/lifts.html..."

# 1. Backup старого файлу
if [ -f "pages/dispatcher/lifts.html" ]; then
    timestamp=$(date +%Y%m%d_%H%M%S)
    cp pages/dispatcher/lifts.html "pages/dispatcher/lifts-backup-${timestamp}.html"
    echo "✅ Backup створено: lifts-backup-${timestamp}.html"
fi

# 2. Копіюємо admin файл як основу
cp pages/admin/lifts.html pages/dispatcher/lifts-full.html

# 3. Замінюємо шляхи та посилання
sed -i 's|/pages/admin/|/pages/dispatcher/|g' pages/dispatcher/lifts-full.html
sed -i 's|admin-dashboard.html|dispatcher-dashboard.html|g' pages/dispatcher/lifts-full.html
sed -i 's|href="admin|href="dispatcher|g' pages/dispatcher/lifts-full.html

# 4. Замінюємо заголовки
sed -i 's|<h1.*>Управління ліфтами</h1>|<h1 data-i18n="lift_management">Управління ліфтами (Dispatcher)</h1>|g' pages/dispatcher/lifts-full.html
sed -i 's|<title.*>Адмін панель|<title data-i18n-title="lift_management">Панель диспетчера|g' pages/dispatcher/lifts-full.html

# 5. Додаємо коментар про роль
sed -i '/<body/a <!-- DISPATCHER VERSION - Full admin features with role-based access -->' pages/dispatcher/lifts-full.html

echo "✅ Файл створено: pages/dispatcher/lifts-full.html"
echo "📊 Розмір: $(wc -l < pages/dispatcher/lifts-full.html) рядків"
echo ""
echo "🔄 Тепер замініть старий файл:"
echo "   mv pages/dispatcher/lifts-full.html pages/dispatcher/lifts.html"
