#!/bin/bash

echo "🗑️  ВИДАЛЕННЯ ВСІХ INLINE AI WIDGETS"
echo "════════════════════════════════════════════════════════════"
echo ""

# Список файлів для очищення
FILES=(
    "pages/client/dashboard.html"
    "pages/client/history.html"
    "pages/client/invoices.html"
    "pages/client/my-lifts.html"
    "pages/client/notifications.html"
    "pages/client/profile.html"
    "pages/client/requests.html"
    "pages/client/settings.html"
    "pages/admin/lifts.html"
    "pages/admin/qr-management.html"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "📄 $file"
        
        # Backup
        cp "$file" "$file.backup-widget-removal-final"
        
        # Видалити <link> на ai-assistant.css
        sed -i '/<link rel="stylesheet" href="\/assets\/css\/ai-assistant.css">/d' "$file"
        
        # Видалити Font Awesome CDN (якщо використовується тільки для віджета)
        # sed -i '/<link rel="stylesheet" href="https:\/\/cdnjs.cloudflare.com\/ajax\/libs\/font-awesome/d' "$file"
        
        # Видалити весь блок ai-assistant-fab + modal + script
        # Використовуємо perl для multiline видалення
        perl -i -0pe 's/<link rel="stylesheet" href="\/assets\/css\/ai-assistant\.css">.*?<\/script>//gs' "$file"
        
        # Перевірка
        if grep -q "ai-assistant-fab" "$file"; then
            echo "   ⚠️  Залишились згадки ai-assistant-fab"
        else
            echo "   ✅ Widget видалено"
        fi
    else
        echo "📄 $file - ⚠️  Не знайдено"
    fi
    echo ""
done

echo "════════════════════════════════════════════════════════════"
echo "✅ Очищення завершено!"
echo ""
echo "Перевірка:"
./audit-ai-assistant-full.sh
