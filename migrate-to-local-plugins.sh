#!/bin/bash

# 🚀 Автоматична міграція CDN → Локальні плагіни
# Скрипт замінює всі CDN посилання на локальні файли

echo "🔄 Початок міграції CDN → LOCAL плагіни..."
echo ""

# Лічильники
TOTAL_FILES=0
MIGRATED_FILES=0

# Функція для заміни CDN на локальні шляхи
migrate_file() {
    local file=$1
    local depth=$2  # Глибина вкладеності (../../ або ../ або ./)
    
    # Пропускаємо test-local-plugins.html (вже локальний)
    if [[ "$file" == *"test-local-plugins.html"* ]]; then
        return
    fi
    
    # Перевірка чи файл містить CDN
    if ! grep -q "cdn.jsdelivr.net\|cdnjs.cloudflare.com\|code.jquery.com" "$file"; then
        return
    fi
    
    echo "📝 Міграція: $file"
    TOTAL_FILES=$((TOTAL_FILES + 1))
    
    # Створюємо резервну копію
    cp "$file" "$file.backup"
    
    # jQuery
    sed -i 's|https://code.jquery.com/jquery-3.6.0.min.js|'"$depth"'plugins/jquery/jquery.min.js|g' "$file"
    sed -i 's|https://code.jquery.com/jquery-[0-9.]*.min.js|'"$depth"'plugins/jquery/jquery.min.js|g' "$file"
    
    # Bootstrap CSS
    sed -i 's|https://cdn.jsdelivr.net/npm/bootstrap@4.6.[0-9]*/dist/css/bootstrap.min.css|'"$depth"'plugins/bootstrap/bootstrap.min.css|g' "$file"
    sed -i 's|https://maxcdn.bootstrapcdn.com/bootstrap/4.[0-9.]*/css/bootstrap.min.css|'"$depth"'plugins/bootstrap/bootstrap.min.css|g' "$file"
    
    # Bootstrap JS
    sed -i 's|https://cdn.jsdelivr.net/npm/bootstrap@4.6.[0-9]*/dist/js/bootstrap.bundle.min.js|'"$depth"'plugins/bootstrap/bootstrap.bundle.min.js|g' "$file"
    sed -i 's|https://maxcdn.bootstrapcdn.com/bootstrap/4.[0-9.]*/js/bootstrap.bundle.min.js|'"$depth"'plugins/bootstrap/bootstrap.bundle.min.js|g' "$file"
    
    # AdminLTE CSS
    sed -i 's|https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css|'"$depth"'plugins/adminlte/adminlte.min.css|g' "$file"
    sed -i 's|https://cdn.jsdelivr.net/npm/admin-lte@[0-9.]*/dist/css/adminlte.min.css|'"$depth"'plugins/adminlte/adminlte.min.css|g' "$file"
    
    # AdminLTE JS
    sed -i 's|https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js|'"$depth"'plugins/adminlte/adminlte.min.js|g' "$file"
    sed -i 's|https://cdn.jsdelivr.net/npm/admin-lte@[0-9.]*/dist/js/adminlte.min.js|'"$depth"'plugins/adminlte/adminlte.min.js|g' "$file"
    
    # Font Awesome
    sed -i 's|https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.[0-9.]*/css/all.min.css|'"$depth"'plugins/fontawesome/css/all.min.css|g' "$file"
    sed -i 's|https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free/css/all.min.css|'"$depth"'plugins/fontawesome/css/all.min.css|g' "$file"
    sed -i 's|https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@[0-9.]*/css/all.min.css|'"$depth"'plugins/fontawesome/css/all.min.css|g' "$file"
    
    # Socket.io
    sed -i 's|https://cdn.socket.io/4.[0-9.]*/socket.io.min.js|'"$depth"'plugins/socket.io/socket.io.min.js|g' "$file"
    
    # Перевірка чи файл змінився
    if ! diff "$file" "$file.backup" > /dev/null 2>&1; then
        MIGRATED_FILES=$((MIGRATED_FILES + 1))
        echo "   ✅ Мігровано успішно"
        rm "$file.backup"
    else
        echo "   ⚠️ Без змін (можливо інші CDN)"
        rm "$file.backup"
    fi
}

# Міграція файлів по директоріях

echo "📂 Міграція pages/admin/ (глибина: ../../)"
for file in /workspaces/deapseak/pages/admin/*.html; do
    [ -f "$file" ] && migrate_file "$file" "../../"
done

echo ""
echo "📂 Міграція pages/client/ (глибина: ../../)"
for file in /workspaces/deapseak/pages/client/*.html; do
    [ -f "$file" ] && migrate_file "$file" "../../"
done

echo ""
echo "📂 Міграція pages/dispatcher/ (глибина: ../../)"
for file in /workspaces/deapseak/pages/dispatcher/*.html; do
    [ -f "$file" ] && migrate_file "$file" "../../"
done

echo ""
echo "📂 Міграція pages/tech/ (глибина: ../../)"
for file in /workspaces/deapseak/pages/tech/*.html; do
    [ -f "$file" ] && migrate_file "$file" "../../"
done

echo ""
echo "📂 Міграція pages/ai-assistant/ (глибина: ../../)"
for file in /workspaces/deapseak/pages/ai-assistant/*.html; do
    [ -f "$file" ] && migrate_file "$file" "../../"
done

echo ""
echo "📂 Міграція pages/ (root, глибина: ../)"
for file in /workspaces/deapseak/pages/*.html; do
    [ -f "$file" ] && migrate_file "$file" "../"
done

echo ""
echo "📂 Міграція assets/modules/ (глибина: ../../)"
for file in /workspaces/deapseak/assets/modules/*.html; do
    [ -f "$file" ] && migrate_file "$file" "../../"
done

echo ""
echo "📂 Міграція корневих файлів (глибина: ./)"
for file in /workspaces/deapseak/*.html; do
    [ -f "$file" ] && migrate_file "$file" "./"
done

echo ""
echo "═══════════════════════════════════════"
echo "✅ МІГРАЦІЯ ЗАВЕРШЕНА!"
echo "═══════════════════════════════════════"
echo "📊 Статистика:"
echo "   Знайдено файлів з CDN: $TOTAL_FILES"
echo "   Успішно мігровано: $MIGRATED_FILES"
echo ""
echo "🔍 Перевірка залишкових CDN:"
grep -r "cdn.jsdelivr.net\|cdnjs.cloudflare.com\|code.jquery.com" /workspaces/deapseak/pages --include="*.html" | grep -v "toastr\|sweetalert\|chart.js" | wc -l | xargs -I {} echo "   Залишилось CDN посилань: {}"
echo ""
echo "💡 Наступні кроки:"
echo "   1. Перевір сайт в браузері"
echo "   2. Якщо все OK → git commit"
echo "   3. Якщо проблеми → git checkout ."
echo ""
