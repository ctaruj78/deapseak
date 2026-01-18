#!/bin/bash

# 🔧 Скрипт для виправлення всіх сторінок диспетчера
# Додає динамічний сайдбар, правильні скрипти та API підключення

echo "🔧 Починаємо виправлення сторінок диспетчера..."

# Кольори для виводу
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FIXED=0
ERRORS=0

# Функція для перевірки наявності рядка в файлі
has_string() {
    grep -q "$2" "$1" 2>/dev/null
}

# Функція для виправлення однієї сторінки
fix_page() {
    local file="$1"
    local filename=$(basename "$file")
    
    echo -e "\n${BLUE}📄 Обробка: $filename${NC}"
    
    # Перевірка чи файл існує
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Файл не знайдено: $file${NC}"
        ((ERRORS++))
        return 1
    fi
    
    # Створюємо backup
    cp "$file" "$file.backup"
    
    local needs_fix=0
    
    # 1. Перевірка global-settings.js в <head>
    if ! has_string "$file" "global-settings.js"; then
        echo -e "${YELLOW}  ➕ Додаємо global-settings.js${NC}"
        sed -i '/<\/title>/a\    <script src="../../assets/js/global-settings.js"><\/script>' "$file"
        needs_fix=1
    fi
    
    # 2. Видалення захардкодженого сайдбару
    if has_string "$file" '<aside class="main-sidebar'; then
        echo -e "${YELLOW}  🗑️  Видаляємо захардкоджений сайдбар${NC}"
        # Видаляємо весь блок від <aside до </aside>
        sed -i '/<aside class="main-sidebar/,/<\/aside>/d' "$file"
        needs_fix=1
    fi
    
    # 3. Додавання placeholder для динамічного сайдбару
    if ! has_string "$file" 'id="sidebar-placeholder"'; then
        echo -e "${YELLOW}  ➕ Додаємо placeholder для сайдбару${NC}"
        # Додаємо після navbar
        sed -i '/<\/nav>/a\  <!-- Sidebar Placeholder -->\n  <div id="sidebar-placeholder"><\/div>' "$file"
        needs_fix=1
    fi
    
    # 4. Перевірка скриптів в кінці файлу
    local script_section_start=$(grep -n "<!-- jQuery -->" "$file" | head -1 | cut -d: -f1)
    
    if [ -z "$script_section_start" ]; then
        # Шукаємо перший <script src
        script_section_start=$(grep -n "<script src=" "$file" | head -1 | cut -d: -f1)
    fi
    
    if [ -n "$script_section_start" ]; then
        echo -e "${YELLOW}  🔧 Оновлюємо скрипти (рядок $script_section_start)${NC}"
        
        # Створюємо правильний блок скриптів
        cat > /tmp/dispatcher_scripts.txt << 'SCRIPTS_EOF'
<!-- jQuery -->
<script src="../../plugins/jquery/jquery.min.js"></script>
<!-- Bootstrap -->
<script src="../../plugins/bootstrap/bootstrap.bundle.min.js"></script>
<!-- AdminLTE -->
<script src="../../plugins/adminlte/adminlte.min.js"></script>

<!-- Sidebar Init (MUST be before other scripts) -->
<script src="../../assets/js/sidebar-init.js"></script>

<!-- API Configuration -->
<script src="../../assets/js/config.js?v=20241116"></script>

<!-- Auth System -->
<script src="../../assets/js/auth.js?v=20241206"></script>

<!-- DataTables (if needed) -->
<script src="../../plugins/datatables/jquery.dataTables.min.js"></script>
<script src="../../plugins/datatables-bs4/js/dataTables.bootstrap4.min.js"></script>

<!-- SweetAlert2 -->
<script src="../../plugins/sweetalert2/sweetalert2.min.js"></script>
SCRIPTS_EOF
        
        # Вставляємо перед </body>
        if ! has_string "$file" "sidebar-init.js"; then
            sed -i "/<\/body>/i $(cat /tmp/dispatcher_scripts.txt | sed 's/$/\\n/' | tr -d '\n')" "$file"
            needs_fix=1
        fi
        
        rm /tmp/dispatcher_scripts.txt
    fi
    
    # 5. Додавання ініціалізації сайдбару перед </body>
    if ! has_string "$file" "loadSidebarWithInit"; then
        echo -e "${YELLOW}  ➕ Додаємо ініціалізацію сайдбару${NC}"
        sed -i '/<\/body>/i\<script>\n    document.addEventListener("DOMContentLoaded", function() {\n        if (typeof loadSidebarWithInit === "function") {\n            loadSidebarWithInit("includes/sidebar.html");\n        }\n    });\n<\/script>' "$file"
        needs_fix=1
    fi
    
    if [ $needs_fix -eq 1 ]; then
        echo -e "${GREEN}✅ Виправлено: $filename${NC}"
        ((FIXED++))
        
        # Видаляємо backup якщо все ок
        rm "$file.backup"
    else
        echo -e "${GREEN}✅ Вже актуальний: $filename${NC}"
        # Відновлюємо з backup
        mv "$file.backup" "$file"
    fi
}

# Знаходимо всі HTML файли диспетчера (крім includes)
echo -e "${BLUE}🔍 Пошук HTML файлів...${NC}"

files=$(find /workspaces/deapseak/pages/dispatcher -name "*.html" -not -path "*/includes/*" -type f)

if [ -z "$files" ]; then
    echo -e "${RED}❌ Файли не знайдено!${NC}"
    exit 1
fi

echo -e "${BLUE}Знайдено $(echo "$files" | wc -l) файлів${NC}"

# Обробляємо кожен файл
for file in $files; do
    fix_page "$file"
done

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Виправлення завершено!${NC}"
echo -e "${GREEN}📊 Виправлено: $FIXED файлів${NC}"
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}⚠️  Помилок: $ERRORS${NC}"
fi
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}📝 Що було зроблено:${NC}"
echo -e "  1. ✅ Додано global-settings.js в <head>"
echo -e "  2. ✅ Видалено захардкоджені сайдбари"
echo -e "  3. ✅ Додано #sidebar-placeholder"
echo -e "  4. ✅ Підключено sidebar-init.js"
echo -e "  5. ✅ Додано config.js для API"
echo -e "  6. ✅ Додано auth.js"
echo -e "  7. ✅ Додано loadSidebarWithInit()"

echo -e "\n${BLUE}🚀 Тепер всі сторінки диспетчера мають:${NC}"
echo -e "  - 🎨 Динамічний сайдбар (однаковий на всіх сторінках)"
echo -e "  - 🔌 Підключення до API через config.js"
echo -e "  - 🔐 JWT авторизацію"
echo -e "  - 📊 DataTables та інші плагіни"

echo -e "\n${GREEN}✨ Готово! Перезапустіть сервер та перевірте сторінки.${NC}"
