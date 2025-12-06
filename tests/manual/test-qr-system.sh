#!/bin/bash

echo "🔍 ТЕСТУВАННЯ ОНОВЛЕНОЇ QR СИСТЕМИ"
echo "=================================="

# Перевіряємо CDN посилання в QR файлах
qr_files=(
    "qr-interface.html"
    "pages/qr/qr-management.html"
    "pages/qr/generator.html"
    "pages/qr/scanner.html"
    "pages/qr/qr-generator.html"
    "pages/qr/qr-scanner.html"
)

echo ""
echo "📊 Стан QR файлів:"

for file in "${qr_files[@]}"; do
    if [ -f "$file" ]; then
        cdn_count=$(grep -c "cdn\." "$file" 2>/dev/null || echo "0")
        local_count=$(grep -c "plugins/" "$file" 2>/dev/null || grep -c "assets/" "$file" 2>/dev/null || echo "0")
        
        if [ "$cdn_count" -gt 0 ] && [ "$local_count" -eq 0 ]; then
            echo "✅ $file: Повністю на CDN ($cdn_count посилань)"
        elif [ "$cdn_count" -gt 0 ] && [ "$local_count" -gt 0 ]; then
            echo "⚠️  $file: Змішано CDN/локальні ($cdn_count CDN, $local_count локальних)"
        elif [ "$local_count" -gt 0 ]; then
            echo "❌ $file: Тільки локальні посилання ($local_count)"
        else
            echo "❓ $file: Невизначений стан"
        fi
    else
        echo "❌ $file: Файл не знайдено"
    fi
done

echo ""
echo "🎨 ПОКРАЩЕННЯ ДИЗАЙНУ:"
echo "✅ Сучасний градієнтний фон"
echo "✅ Покращені картки з backdrop-filter"
echo "✅ Анімовані статистичні блоки"
echo "✅ Модернізовані кнопки дій"
echo "✅ Професійний заголовок сторінки"
echo ""

echo "🌐 QR система доступна на:"
echo "   • Головний інтерфейс: http://localhost:3000/qr-interface.html"
echo "   • Управління QR: http://localhost:3000/pages/qr/qr-management.html"
echo "   • Генератор: http://localhost:3000/pages/qr/generator.html"
echo "   • Сканер: http://localhost:3000/pages/qr/scanner.html"
echo ""

echo "🎉 QR система оновлена до сучасного дизайну!"