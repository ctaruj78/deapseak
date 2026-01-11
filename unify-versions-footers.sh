#!/bin/bash

# 🔧 Уніфікація версій та футерів у всіх HTML файлах
# Встановлює єдину версію, назву компанії та копірайт

echo "🔧 УНІФІКАЦІЯ ВЕРСІЙ ТА ФУТЕРІВ"
echo "================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Конфігурація для Португалії
COMPANY_NAME="FestLift"
COMPANY_NAME_FULL="FestLift - Gestão de Elevadores"
VERSION="2.1.0"
YEAR="2026"
WEBSITE="https://festlift.pt"
EMAIL="info@festlift.pt"
SUPPORT_EMAIL="suporte@festlift.pt"

echo -e "${BLUE}📋 Налаштування:${NC}"
echo "  Компанія: $COMPANY_NAME_FULL"
echo "  Версія: v$VERSION"
echo "  Рік: $YEAR"
echo "  Email: $EMAIL"
echo ""

# Лічильники
updated=0
skipped=0
errors=0

# Функція backup
create_backup() {
    local file=$1
    local backup_dir="backup/pre-unify-$(date +%Y%m%d_%H%M%S)"
    
    if [ ! -d "$backup_dir" ]; then
        mkdir -p "$backup_dir"
        echo -e "${BLUE}📁 Створено backup: $backup_dir${NC}"
    fi
    
    # Зберігаємо структуру папок
    local dir=$(dirname "$file")
    mkdir -p "$backup_dir/$dir"
    cp "$file" "$backup_dir/$file"
}

# Функція оновлення HTML файлу
update_html_file() {
    local file=$1
    
    if [ ! -f "$file" ]; then
        return
    fi
    
    echo -n "  $(basename $file)... "
    
    # Backup
    create_backup "$file"
    
    # Тимчасовий файл
    local temp_file="${file}.tmp"
    cp "$file" "$temp_file"
    
    local changed=0
    
    # 1. Оновлення назви компанії в title
    if grep -q "LiftMaster Pro\|DeapSeaK\|Lift Management" "$temp_file"; then
        sed -i "s/LiftMaster Pro/$COMPANY_NAME/g" "$temp_file"
        sed -i "s/DeapSeaK/$COMPANY_NAME/g" "$temp_file"
        sed -i "s/Lift Management System/$COMPANY_NAME_FULL/g" "$temp_file"
        changed=1
    fi
    
    # 2. Оновлення версії (різні формати)
    sed -i "s/v2\.0\.0/v$VERSION/g" "$temp_file"
    sed -i "s/v2\.0/v$VERSION/g" "$temp_file"
    sed -i "s/v1\.[0-9]/v$VERSION/g" "$temp_file"
    sed -i "s/Version [0-9]\.[0-9]\.[0-9]/Version $VERSION/g" "$temp_file"
    sed -i "s/<b>Version<\/b> [0-9]\.[0-9]\.[0-9]/<b>Version<\/b> $VERSION/g" "$temp_file"
    
    # 3. Оновлення копірайту в футері
    # Формат: Copyright © 2024-2025 <Company>
    sed -i "s/Copyright &copy; 20[0-9][0-9]/Copyright \&copy; $YEAR/g" "$temp_file"
    sed -i "s/&copy; 20[0-9][0-9] /\&copy; $YEAR /g" "$temp_file"
    
    # 4. Оновлення email адрес
    sed -i "s/support@liftmaster\.com/$SUPPORT_EMAIL/g" "$temp_file"
    sed -i "s/info@deapseak\.com/$EMAIL/g" "$temp_file"
    sed -i "s/admin@deapseak\.com/$EMAIL/g" "$temp_file"
    
    # 5. Оновлення посилань на компанію
    sed -i "s/liftmaster\.com/festlift.pt/g" "$temp_file"
    sed -i "s/deapseak\.com/festlift.pt/g" "$temp_file"
    
    # 6. Уніфікація footer структури (якщо є footer)
    if grep -q "<footer" "$temp_file"; then
        # Замінюємо старий footer на новий стандарт
        sed -i "/<footer/,/<\/footer>/c\        <footer class=\"main-footer\">\n            <strong>Copyright \&copy; $YEAR <a href=\"$WEBSITE\">$COMPANY_NAME<\/a>.<\/strong>\n            Sistema de gestão de elevadores v$VERSION.\n            <div class=\"float-right d-none d-sm-inline-block\">\n                <b>Versão<\/b> $VERSION\n            <\/div>\n        <\/footer>" "$temp_file" 2>/dev/null || true
    fi
    
    # Перевірка чи щось змінилось
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        echo -e "${GREEN}✅ Оновлено${NC}"
        ((updated++))
    else
        rm "$temp_file"
        echo -e "${YELLOW}⏭️  Без змін${NC}"
        ((skipped++))
    fi
}

# 1. ОБРОБКА HTML ФАЙЛІВ
echo -e "${BLUE}1️⃣  Оновлення HTML файлів...${NC}"

# Admin pages
for file in pages/admin/*.html; do
    [ -f "$file" ] && update_html_file "$file"
done

# Tech pages
for file in pages/tech/*.html; do
    [ -f "$file" ] && update_html_file "$file"
done

# Client pages
for file in pages/client/*.html; do
    [ -f "$file" ] && update_html_file "$file"
done

# Dispatcher pages
for file in pages/dispatcher/*.html; do
    [ -f "$file" ] && update_html_file "$file"
done

# Auth pages
for file in pages/auth/*.html; do
    [ -f "$file" ] && update_html_file "$file"
done

# Root pages
for file in *.html; do
    [ -f "$file" ] && update_html_file "$file"
done

echo ""

# 2. ОНОВЛЕННЯ PACKAGE.JSON
echo -e "${BLUE}2️⃣  Оновлення package.json...${NC}"
if [ -f "package.json" ]; then
    create_backup "package.json"
    
    # Оновлення версії та назви
    jq ".version = \"$VERSION\" | .name = \"festlift\" | .description = \"$COMPANY_NAME_FULL\"" package.json > package.json.tmp
    mv package.json.tmp package.json
    
    echo -e "  ${GREEN}✅ package.json оновлено${NC}"
    ((updated++))
else
    echo -e "  ${YELLOW}⚠️  package.json не знайдено${NC}"
fi
echo ""

# 3. ОНОВЛЕННЯ README
echo -e "${BLUE}3️⃣  Оновлення README.md...${NC}"
if [ -f "README.md" ]; then
    create_backup "README.md"
    
    sed -i "s/LiftMaster Pro/$COMPANY_NAME/g" README.md
    sed -i "s/DeapSeaK v2/$COMPANY_NAME v$VERSION/g" README.md
    sed -i "1s/.*/# 🏢 $COMPANY_NAME_FULL/" README.md
    
    echo -e "  ${GREEN}✅ README.md оновлено${NC}"
    ((updated++))
else
    echo -e "  ${YELLOW}⚠️  README.md не знайдено${NC}"
fi
echo ""

# 4. СТВОРЕННЯ ЗВІТУ
echo -e "${BLUE}4️⃣  Створення звіту...${NC}"

cat > UNIFICATION-REPORT.md << EOF
# 🔧 Звіт Уніфікації Версій та Футерів

**Дата:** $(date '+%Y-%m-%d %H:%M:%S')  
**Скрипт:** unify-versions-footers.sh

---

## ⚙️ Налаштування

| Параметр | Значення |
|----------|----------|
| 🏢 Компанія | $COMPANY_NAME_FULL |
| 🔢 Версія | v$VERSION |
| 📅 Рік | $YEAR |
| 🌐 Сайт | $WEBSITE |
| 📧 Email | $EMAIL |
| 🆘 Підтримка | $SUPPORT_EMAIL |

---

## 📊 Результати

- ✅ **Оновлено:** $updated файлів
- ⏭️  **Пропущено:** $skipped файлів (без змін)
- ❌ **Помилки:** $errors файлів

---

## 🔄 Зміни

### 1. Назва компанії:
- ❌ \`LiftMaster Pro\` → ✅ \`$COMPANY_NAME\`
- ❌ \`DeapSeaK\` → ✅ \`$COMPANY_NAME\`

### 2. Версія:
- ❌ \`v2.0\`, \`v2.0.0\`, \`v1.x\` → ✅ \`v$VERSION\`

### 3. Копірайт:
- ❌ \`Copyright © 2024\` → ✅ \`Copyright © $YEAR\`

### 4. Email адреси:
- ❌ \`support@liftmaster.com\` → ✅ \`$SUPPORT_EMAIL\`
- ❌ \`info@deapseak.com\` → ✅ \`$EMAIL\`

### 5. Домени:
- ❌ \`liftmaster.com\` → ✅ \`festlift.pt\`
- ❌ \`deapseak.com\` → ✅ \`festlift.pt\`

---

## 📁 Backup

Створено backup перед змінами:  
\`backup/pre-unify-$(date +%Y%m%d_%H%M%S)/\`

Для відновлення:
\`\`\`bash
# Відновити конкретний файл
cp backup/pre-unify-*/pages/admin/dashboard.html pages/admin/dashboard.html

# Відновити все
rm -rf pages/
cp -r backup/pre-unify-*/pages .
\`\`\`

---

## ✅ Готово!

Система уніфікована для production в Португалії! 🇵🇹
EOF

echo -e "  ${GREEN}✅ Звіт: UNIFICATION-REPORT.md${NC}"
echo ""

# ПІДСУМОК
echo "================================"
echo -e "📊 ${BLUE}ПІДСУМОК:${NC}"
echo -e "   ${GREEN}✅ Оновлено: $updated файлів${NC}"
echo -e "   ${YELLOW}⏭️  Пропущено: $skipped файлів${NC}"
echo -e "   ${RED}❌ Помилки: $errors файлів${NC}"
echo ""

if [ $errors -eq 0 ]; then
    echo -e "${GREEN}🎉 УНІФІКАЦІЯ ЗАВЕРШЕНА УСПІШНО!${NC}"
    echo ""
    echo -e "${BLUE}📋 Що змінено:${NC}"
    echo "  ✅ Назва: $COMPANY_NAME_FULL"
    echo "  ✅ Версія: v$VERSION"
    echo "  ✅ Рік: $YEAR"
    echo "  ✅ Email: $EMAIL"
    echo "  ✅ Домен: festlift.pt"
    echo ""
    echo -e "${YELLOW}💡 Рекомендації:${NC}"
    echo "  1. Перевірте зміни: git diff"
    echo "  2. Протестуйте: ./test-navigation.sh"
    echo "  3. Закомітьте: git add . && git commit -m '🔧 Уніфікація версій'"
    exit 0
else
    echo -e "${RED}❌ ВИНИКЛИ ПОМИЛКИ!${NC}"
    echo "Перевірте файли вручну"
    exit 1
fi
