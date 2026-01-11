#!/bin/bash

# 🇵🇹 Локалізація системи під Португалію
# Переклад інтерфейсу, демо-даних, документації

echo "🇵🇹 ЛОКАЛІЗАЦІЯ ПІД ПОРТУГАЛІЮ"
echo "=============================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

updated=0
skipped=0

# Backup
BACKUP_DIR="backup/pre-localization-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

backup_file() {
    local file=$1
    local dir=$(dirname "$file")
    mkdir -p "$BACKUP_DIR/$dir"
    cp "$file" "$BACKUP_DIR/$file" 2>/dev/null || true
}

echo -e "${BLUE}📋 Що буде змінено:${NC}"
echo "  ✅ Українська → Португальська (UI тексти)"
echo "  ✅ Демо-дані (Київ → Lisboa, etc.)"
echo "  ✅ Назви міст (Torres Vedras, Porto, Coimbra)"
echo "  ✅ lang='uk' → lang='pt'"
echo "  ✅ Copyright тексти"
echo ""

# Словник перекладів (українська → португальська)
declare -A translations=(
    # Основні UI елементи
    ["Панель керування"]="Painel de controlo"
    ["Керування"]="Gestão"
    ["Користувачі"]="Utilizadores"
    ["Ліфти"]="Elevadores"
    ["Запити"]="Pedidos"
    ["Аналітика"]="Análise"
    ["Налаштування"]="Configurações"
    ["Вихід"]="Sair"
    ["Профіль"]="Perfil"
    ["Підтримка"]="Suporte"
    
    # Статуси
    ["Активний"]="Ativo"
    ["Неактивний"]="Inativo"
    ["В роботі"]="Em progresso"
    ["Завершено"]="Concluído"
    ["Очікує"]="Pendente"
    
    # Дії
    ["Додати"]="Adicionar"
    ["Редагувати"]="Editar"
    ["Видалити"]="Eliminar"
    ["Зберегти"]="Guardar"
    ["Скасувати"]="Cancelar"
    ["Пошук"]="Pesquisar"
    ["Фільтр"]="Filtro"
    ["Експорт"]="Exportar"
    
    # Міста (демо-дані)
    ["Київ"]="Lisboa"
    ["Львів"]="Porto"
    ["Одеса"]="Coimbra"
    ["Харків"]="Braga"
    ["Дніпро"]="Faro"
    
    # Адреси
    ["вул."]="Rua"
    ["Вулиця"]="Rua"
    ["проспект"]="Avenida"
    ["Проспект"]="Avenida"
    
    # Футер
    ["Всі права захищені"]="Todos os direitos reservados"
    ["Система управління"]="Sistema de gestão"
    ["Панель адміністратора"]="Painel de administrador"
    ["Панель техніка"]="Painel de técnico"
)

# Функція заміни тексту в файлі
translate_file() {
    local file=$1
    
    if [ ! -f "$file" ]; then
        return
    fi
    
    echo -n "  $(basename $file)... "
    
    backup_file "$file"
    
    local temp_file="${file}.tmp"
    cp "$file" "$temp_file"
    
    local changed=0
    
    # 1. Змінюємо lang атрибут
    if grep -q 'lang="uk"' "$temp_file"; then
        sed -i 's/lang="uk"/lang="pt"/g' "$temp_file"
        changed=1
    fi
    
    # 2. Застосовуємо переклади
    for uk_text in "${!translations[@]}"; do
        pt_text="${translations[$uk_text]}"
        
        # Escape спеціальних символів для sed
        uk_escaped=$(echo "$uk_text" | sed 's/[\/&]/\\&/g')
        pt_escaped=$(echo "$pt_text" | sed 's/[\/&]/\\&/g')
        
        if grep -qF "$uk_text" "$temp_file"; then
            sed -i "s/$uk_escaped/$pt_escaped/g" "$temp_file"
            changed=1
        fi
    done
    
    # 3. Специфічні заміни для демо-даних
    # Київська 25 → Rua Augusta 25
    sed -i 's/Київська \([0-9]\+\)/Rua Augusta \1/g' "$temp_file"
    sed -i 's/Львівська \([0-9]\+\)/Avenida da Liberdade \1/g' "$temp_file"
    sed -i 's/Хрещатик \([0-9]\+\)/Praça do Comércio \1/g' "$temp_file"
    
    # 4. Email домени
    sed -i 's/@deapseak\.com/@festlift.pt/g' "$temp_file"
    sed -i 's/@liftmaster\.com/@festlift.pt/g' "$temp_file"
    
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        echo -e "${GREEN}✅ Перекладено${NC}"
        ((updated++))
    else
        rm "$temp_file"
        echo -e "${YELLOW}⏭️  Без змін${NC}"
        ((skipped++))
    fi
}

# 1. HTML ФАЙЛИ
echo -e "${BLUE}1️⃣  Переклад HTML файлів...${NC}"

for dir in pages/admin pages/tech pages/client pages/dispatcher pages/auth; do
    if [ -d "$dir" ]; then
        for file in "$dir"/*.html; do
            [ -f "$file" ] && translate_file "$file"
        done
    fi
done

# Root HTML
for file in *.html; do
    [ -f "$file" ] && translate_file "$file"
done

echo ""

# 2. ОНОВЛЕННЯ ДЕМО-ДАНИХ В БАЗІ
echo -e "${BLUE}2️⃣  Оновлення демо-даних в MongoDB...${NC}"

# Створюємо скрипт оновлення для MongoDB
cat > /tmp/update_mongo_pt.js << 'EOF'
// Оновлення міст в адресах ліфтів
db.lifts.updateMany(
    { "address.city": "Kiev" },
    { $set: { "address.city": "Lisboa" } }
);

db.lifts.updateMany(
    { "address.city": "Kyiv" },
    { $set: { "address.city": "Lisboa" } }
);

db.lifts.updateMany(
    { "address.city": "Lviv" },
    { $set: { "address.city": "Porto" } }
);

db.lifts.updateMany(
    { "address.city": "Odesa" },
    { $set: { "address.city": "Coimbra" } }
);

db.lifts.updateMany(
    { "address.city": "Kharkiv" },
    { $set: { "address.city": "Braga" } }
);

// Оновлення країни
db.lifts.updateMany(
    { "address.country": { $in: ["Ukraine", "Україна"] } },
    { $set: { "address.country": "Portugal" } }
);

// Виводимо результат
print("✅ Оновлено міста в базі даних");
EOF

if pgrep mongod > /dev/null; then
    mongosh deapseak /tmp/update_mongo_pt.js --quiet
    echo -e "  ${GREEN}✅ База даних оновлена${NC}"
    ((updated++))
else
    echo -e "  ${YELLOW}⚠️  MongoDB не запущено, пропущено${NC}"
fi

rm /tmp/update_mongo_pt.js
echo ""

# 3. ОНОВЛЕННЯ ДОКУМЕНТАЦІЇ
echo -e "${BLUE}3️⃣  Оновлення документації...${NC}"

# README.md
if [ -f "README.md" ]; then
    backup_file "README.md"
    
    # Заміни в README
    sed -i 's/Система управління ліфтами/Sistema de gestão de elevadores/g' README.md
    sed -i 's/🏢 DeapSeaK/🏢 FestLift/g' README.md
    sed -i 's/Lift Management System/Sistema de Gestão de Elevadores/g' README.md
    
    echo -e "  README.md ${GREEN}✅${NC}"
    ((updated++))
fi

# Test files з прикладами
for doc in QR-*.md *-GUIDE.md *-REPORT.md; do
    if [ -f "$doc" ]; then
        backup_file "$doc"
        
        sed -i 's/Київ/Lisboa/g' "$doc"
        sed -i 's/Львів/Porto/g' "$doc"
        sed -i 's/Одеса/Coimbra/g' "$doc"
        sed -i 's/Київська/Rua Augusta/g' "$doc"
        
        echo -e "  $doc ${GREEN}✅${NC}"
        ((updated++))
    fi
done

echo ""

# 4. JAVASCRIPT STRINGS
echo -e "${BLUE}4️⃣  Оновлення JS тестових даних...${NC}"

# Test files
for js_file in test-*.html test-*.js; do
    if [ -f "$js_file" ]; then
        backup_file "$js_file"
        
        sed -i 's/Київ/Lisboa/g' "$js_file"
        sed -i 's/Львів/Porto/g' "$js_file"
        sed -i 's/Київська/Rua Augusta/g' "$js_file"
        
        echo -e "  $js_file ${GREEN}✅${NC}"
        ((updated++))
    fi
done

echo ""

# 5. СТВОРЕННЯ ЗВІТУ
echo -e "${BLUE}5️⃣  Створення звіту...${NC}"

cat > LOCALIZATION-PORTUGAL-REPORT.md << EOF
# 🇵🇹 Звіт Локалізації під Португалію

**Дата:** $(date '+%Y-%m-%d %H:%M:%S')  
**Скрипт:** localize-portugal.sh

---

## 🌍 Зміни Локалізації

### 1. Мова інтерфейсу:
- \`lang="uk"\` → \`lang="pt"\`
- Українські тексти → Португальські

### 2. Міста (демо-дані):
| До | Після |
|----|-------|
| 🇺🇦 Київ | 🇵🇹 Lisboa |
| 🇺🇦 Львів | 🇵🇹 Porto |
| 🇺🇦 Одеса | 🇵🇹 Coimbra |
| 🇺🇦 Харків | 🇵🇹 Braga |
| 🇺🇦 Дніпро | 🇵🇹 Faro |

### 3. Адреси:
- "Київська 25" → "Rua Augusta 25"
- "Львівська 100" → "Avenida da Liberdade 100"
- "Хрещатик 1" → "Praça do Comércio 1"

### 4. Email домени:
- \`@deapseak.com\` → \`@festlift.pt\`
- \`@liftmaster.com\` → \`@festlift.pt\`

### 5. Країна:
- "Ukraine" / "Україна" → "Portugal"

---

## 📊 Статистика

- ✅ **Оновлено:** $updated файлів/записів
- ⏭️  **Пропущено:** $skipped файлів (без змін)

---

## 📁 Backup

Створено backup:  
\`$BACKUP_DIR\`

---

## 🎯 Переклади UI

$(printf "| Українська | Португальська |\n")
$(printf "|------------|---------------|\n")
$(for uk in "${!translations[@]}"; do
    echo "| $uk | ${translations[$uk]} |"
done | sort)

---

## ✅ Наступні кроки

1. Перевірте зміни: \`git diff\`
2. Тестуйте систему: \`./test-navigation.sh\`
3. Перевірте базу: \`mongosh deapseak --eval "db.lifts.distinct('address.city')"\`
4. Закомітьте: \`git add . && git commit -m '🇵🇹 Локалізація під Португалію'\`

EOF

echo -e "  ${GREEN}✅ Звіт: LOCALIZATION-PORTUGAL-REPORT.md${NC}"
echo ""

# ПІДСУМОК
echo "=============================="
echo -e "📊 ${BLUE}ПІДСУМОК:${NC}"
echo -e "   ${GREEN}✅ Оновлено: $updated${NC}"
echo -e "   ${YELLOW}⏭️  Пропущено: $skipped${NC}"
echo ""

echo -e "${GREEN}🎉 ЛОКАЛІЗАЦІЯ ЗАВЕРШЕНА!${NC}"
echo ""
echo -e "${BLUE}🇵🇹 Система готова для Португалії:${NC}"
echo "  ✅ Мова: Португальська (pt)"
echo "  ✅ Міста: Lisboa, Porto, Coimbra"
echo "  ✅ Домен: festlift.pt"
echo "  ✅ Адреси: Rua, Avenida, Praça"
echo ""
echo -e "${YELLOW}💡 Перевірте зміни:${NC}"
echo "  git diff pages/admin/dashboard.html"
echo "  mongosh deapseak --eval \"db.lifts.find({}, {address: 1}).limit(3).pretty()\""
