#!/bin/bash

# 🔧 Додавання sidebar-init.js та config.js до всіх сторінок диспетчера

echo "🔧 Додавання sidebar-init.js..."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FIXED=0

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
        continue
    fi
    
    filename=$(basename "$file")
    echo -e "${BLUE}📄 $filename${NC}"
    
    # Перевірка чи вже є sidebar-init.js
    if grep -q "sidebar-init.js" "$file"; then
        echo -e "${GREEN}  ✅ Вже є sidebar-init.js${NC}"
        continue
    fi
    
    # Backup
    cp "$file" "$file.backup"
    
    # Додаємо після AdminLTE
    if grep -q "adminlte.min.js" "$file"; then
        sed -i '/adminlte.min.js/a <!-- Sidebar Init -->\n<script src="..\/..\/assets\/js\/sidebar-init.js"><\/script>' "$file"
        echo -e "${GREEN}  ✅ Додано sidebar-init.js${NC}"
        ((FIXED++))
    else
        echo -e "${YELLOW}  ⚠️  AdminLTE не знайдено${NC}"
    fi
    
    # Перевірка config.js
    if ! grep -q "config.js" "$file"; then
        sed -i '/sidebar-init.js/a <!-- API Configuration -->\n<script src="..\/..\/assets\/js\/config.js?v=20241116"><\/script>' "$file"
        echo -e "${GREEN}  ✅ Додано config.js${NC}"
    fi
    
    rm -f "$file.backup"
done

echo -e "\n${GREEN}✨ Виправлено: $FIXED файлів${NC}"
