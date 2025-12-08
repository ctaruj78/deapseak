#!/bin/bash

# 🔧 Скрипт додавання profile-loader.js до всіх профілів

echo "🔧 Додавання profile-loader.js до профілів..."

PROFILES=(
    "/workspaces/deapseak/pages/admin/profile.html"
    "/workspaces/deapseak/pages/client/profile.html"
    "/workspaces/deapseak/pages/dispatcher/profile.html"
    "/workspaces/deapseak/pages/tech/profile.html"
)

for profile in "${PROFILES[@]}"; do
    if [ -f "$profile" ]; then
        echo "📝 Обробка: $profile"
        
        # Перевіряємо чи вже доданий profile-loader
        if grep -q "profile-loader.js" "$profile"; then
            echo "   ⚠️ profile-loader.js вже доданий, пропускаємо"
            continue
        fi
        
        # Знаходимо де завантажується jQuery і додаємо profile-loader після AdminLTE
        if grep -q "adminlte.min.js" "$profile"; then
            # Створюємо резервну копію
            cp "$profile" "$profile.backup"
            
            # Додаємо profile-loader після adminlte.min.js
            sed -i '/adminlte\.min\.js/a\
\
<!-- 👤 Завантажувач профілю з API -->\
<script src="../../assets/js/profile-loader.js"><\/script>' "$profile"
            
            echo "   ✅ Додано profile-loader.js"
            rm "$profile.backup"
        else
            echo "   ⚠️ adminlte.min.js не знайдено"
        fi
    else
        echo "❌ Файл не знайдено: $profile"
    fi
done

echo ""
echo "✅ Готово! Перевірте профілі в браузері."
