#!/bin/bash

# 🔧 Скрипт для видалення дублікатів скриптів з сторінок диспетчера

echo "🔧 Видалення дублікатів скриптів..."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

FIXED=0

# Список сторінок для виправлення
pages=(
    "/workspaces/deapseak/pages/dispatcher/dashboard.html"
    "/workspaces/deapseak/pages/dispatcher/monitoring.html"
    "/workspaces/deapseak/pages/dispatcher/assignments.html"
    "/workspaces/deapseak/pages/dispatcher/clients.html"
    "/workspaces/deapseak/pages/dispatcher/technicians.html"
    "/workspaces/deapseak/pages/dispatcher/reports.html"
    "/workspaces/deapseak/pages/dispatcher/notifications.html"
    "/workspaces/deapseak/pages/dispatcher/settings.html"
    "/workspaces/deapseak/pages/dispatcher/profile.html"
    "/workspaces/deapseak/pages/dispatcher/support.html"
)

for file in "${pages[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠️  Файл не знайдено: $(basename "$file")${NC}"
        continue
    fi
    
    filename=$(basename "$file")
    echo -e "\n${BLUE}📄 Обробка: $filename${NC}"
    
    # Backup
    cp "$file" "$file.backup"
    
    # Перевіряємо чи є дублікати jQuery
    jquery_count=$(grep -c "jquery.min.js" "$file")
    
    if [ $jquery_count -gt 1 ]; then
        echo -e "${YELLOW}  ⚠️  Знайдено $jquery_count дублікатів jQuery${NC}"
        
        # Видаляємо блок від останнього <!-- jQuery --> до </body>
        # але зберігаємо тільки ініціалізацію сайдбару
        
        # Знаходимо номер рядка останнього </script> перед </body>
        last_script_line=$(grep -n "</script>" "$file" | tail -1 | cut -d: -f1)
        body_line=$(grep -n "</body>" "$file" | head -1 | cut -d: -f1)
        
        # Шукаємо де починається дублікат (другий <!-- jQuery -->)
        duplicate_start=$(grep -n "<!-- jQuery -->" "$file" | tail -1 | cut -d: -f1)
        
        if [ -n "$duplicate_start" ] && [ $duplicate_start -gt 500 ]; then
            echo -e "${YELLOW}  🗑️  Видаляємо дублікат з рядка $duplicate_start${NC}"
            
            # Зберігаємо все до дубліката
            head -n $((duplicate_start - 1)) "$file" > "$file.tmp"
            
            # Додаємо тільки ініціалізацію сайдбару
            cat >> "$file.tmp" << 'EOF'

<!-- Ініціалізація динамічного сайдбару -->
<script>
    document.addEventListener("DOMContentLoaded", function() {
        if (typeof loadSidebarWithInit === "function") {
            loadSidebarWithInit("includes/sidebar.html");
        } else {
            console.error('❌ loadSidebarWithInit function not found!');
        }
    });
</script>
</body>
</html>
EOF
            
            mv "$file.tmp" "$file"
            echo -e "${GREEN}  ✅ Дублікат видалено${NC}"
            ((FIXED++))
        else
            echo -e "${GREEN}  ✅ Дубліката немає або вже видалено${NC}"
            mv "$file.backup" "$file"
        fi
    else
        echo -e "${GREEN}  ✅ Дубліката немає${NC}"
        mv "$file.backup" "$file"
    fi
done

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Видалення дублікатів завершено!${NC}"
echo -e "${GREEN}📊 Виправлено: $FIXED файлів${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
