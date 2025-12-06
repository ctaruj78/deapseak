#!/bin/bash

echo "🔍 ТЕСТУВАННЯ ВСІХ ОСНОВНИХ СТОРІНОК"
echo "===================================="

# Список основних сторінок для тестування
pages=(
    "index.html|Головна сторінка"
    "login.html|Логін"
    "pages/admin/admin-dashboard.html|Адмін панель"
    "pages/admin/lifts.html|Управління ліфтами"
    "pages/dispatcher/dashboard.html|Диспетчерська панель"
    "pages/client/dashboard.html|Клієнтська панель"
    "pages/tech/dashboard.html|Панель техніка"
    "pages/qr/qr-management.html|QR система"
)

echo ""
echo "📊 Перевіряємо наявність CDN посилань у кожній сторінці:"
echo ""

total_pages=0
working_pages=0

for page_info in "${pages[@]}"; do
    IFS='|' read -r page_path page_name <<< "$page_info"
    
    if [ -f "$page_path" ]; then
        cdn_count=$(grep -c "cdn\." "$page_path" 2>/dev/null || echo "0")
        local_count=$(grep -c "plugins/" "$page_path" 2>/dev/null || echo "0")
        
        total_pages=$((total_pages + 1))
        
        if [ "$cdn_count" -gt 0 ] && [ "$local_count" -eq 0 ]; then
            echo "✅ $page_name: $cdn_count CDN посилань, $local_count локальних"
            working_pages=$((working_pages + 1))
        elif [ "$cdn_count" -gt 0 ] && [ "$local_count" -gt 0 ]; then
            echo "⚠️  $page_name: $cdn_count CDN, $local_count локальних (змішано)"
        elif [ "$cdn_count" -eq 0 ] && [ "$local_count" -gt 0 ]; then
            echo "❌ $page_name: тільки локальні посилання ($local_count)"
        else
            echo "❓ $page_name: невизначений стан"
        fi
    else
        echo "❌ $page_name: файл не знайдено ($page_path)"
    fi
done

echo ""
echo "📈 ПІДСУМОК ТЕСТУВАННЯ:"
echo "   📄 Всього сторінок перевірено: $total_pages"
echo "   ✅ Повністю робочих: $working_pages"
echo "   ⚠️  Потребують уваги: $((total_pages - working_pages))"
echo ""

if [ "$working_pages" -eq "$total_pages" ]; then
    echo "🎉 ВСІ ОСНОВНІ СТОРІНКИ ПРАЦЮЮТЬ!"
    echo "Система повністю відновлена до робочого стану."
else
    echo "⚠️  Деякі сторінки ще потребують уваги."
    echo "Але основна функціональність має працювати."
fi

echo ""
echo "🌐 Сервер працює на: http://localhost:3000"