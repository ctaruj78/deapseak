#!/bin/bash

# 🔍 Скрипт перевірки demo акаунтів
# Перевіряє що всі demo акаунти мають домен @festlift.pt

echo "═══════════════════════════════════════════════════════════════════"
echo "   🔍 ПЕРЕВІРКА DEMO АКАУНТІВ"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Кольори
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Перевірка MongoDB
echo "1️⃣  Перевірка користувачів в MongoDB..."
echo ""

USERS=$(mongosh deapseak --quiet --eval "
db.users.find({}, {email: 1, role: 1, firstName: 1, lastName: 1})
    .sort({role: 1, email: 1})
    .toArray()
" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Помилка підключення до MongoDB${NC}"
    exit 1
fi

# Підрахунок користувачів
TOTAL=$(mongosh deapseak --quiet --eval "db.users.countDocuments()" 2>/dev/null)
FESTLIFT=$(mongosh deapseak --quiet --eval "db.users.countDocuments({email: /@festlift\.pt$/})" 2>/dev/null)
DEAPSEAK=$(mongosh deapseak --quiet --eval "db.users.countDocuments({email: /@deapseak\.com$/})" 2>/dev/null)

echo "📊 Статистика користувачів:"
echo "   Всього: $TOTAL"
echo "   @festlift.pt: $FESTLIFT"
echo "   @deapseak.com: $DEAPSEAK"
echo ""

if [ "$DEAPSEAK" -gt 0 ]; then
    echo -e "${RED}⚠️  ЗНАЙДЕНО ЗАСТАРІЛІ @deapseak.com АКАУНТИ!${NC}"
    echo ""
    mongosh deapseak --quiet --eval "
        db.users.find({email: /@deapseak\.com$/}, {email: 1, role: 1}).forEach(printjson)
    "
    echo ""
    echo "Видалити їх командою:"
    echo "  mongosh deapseak --eval \"db.users.deleteMany({email: /@deapseak\\.com$/})\""
    echo ""
else
    echo -e "${GREEN}✅ Всі користувачі мають домен @festlift.pt${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "2️⃣  Перевірка документації..."
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Пошук застарілих email в документації (виключаючи backup)
DOCS_WITH_DEAPSEAK=$(grep -r "@deapseak.com" \
    --include="*.md" \
    --exclude-dir=backup \
    --exclude-dir=archive \
    --exclude-dir=node_modules \
    . 2>/dev/null | wc -l)

if [ "$DOCS_WITH_DEAPSEAK" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Знайдено @deapseak.com в документації ($DOCS_WITH_DEAPSEAK входжень):${NC}"
    echo ""
    grep -r "@deapseak.com" \
        --include="*.md" \
        --exclude-dir=backup \
        --exclude-dir=archive \
        --exclude-dir=node_modules \
        --color=always \
        . 2>/dev/null | head -20
    echo ""
    if [ "$DOCS_WITH_DEAPSEAK" -gt 20 ]; then
        echo "... та ще $(($DOCS_WITH_DEAPSEAK - 20)) входжень"
    fi
else
    echo -e "${GREEN}✅ Документація не містить @deapseak.com${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "3️⃣  Список актуальних demo акаунтів:"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

mongosh deapseak --quiet --eval "
print('| Роль | Email | Ім\\'я |');
print('|------|-------|------|');
db.users.find({email: /@festlift\.pt$/})
    .sort({role: 1, email: 1})
    .forEach(u => {
        const role = u.role === 'admin' ? '👨‍💼 Admin' :
                    u.role === 'dispatcher' ? '📞 Dispatcher' :
                    u.role === 'tech' ? '🔧 Technician' :
                    u.role === 'client' ? '👤 Client' : u.role;
        const name = (u.firstName || '') + ' ' + (u.lastName || '');
        print('| ' + role + ' | ' + u.email + ' | ' + name.trim() + ' |');
    });
"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "4️⃣  Рекомендовані demo акаунти для документації:"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "| Роль | Email | Пароль |"
echo "|------|-------|--------|"
echo "| 👨‍💼 Адмін | info@festlift.pt | admin123 |"
echo "| 📞 Диспетчер | dispatcher@festlift.pt | dispatcher123 |"
echo "| 📞 Диспетчер 2 | info2@festlift.pt | dispatcher123 |"
echo "| 🔧 Технік 1 | tech1@festlift.pt | tech123 |"
echo "| 🔧 Технік 2 | tech2@festlift.pt | tech123 |"
echo "| 👤 Клієнт | client@festlift.pt | client123 |"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo ""

if [ "$DEAPSEAK" -gt 0 ] || [ "$DOCS_WITH_DEAPSEAK" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  ПОТРІБНІ ВИПРАВЛЕННЯ${NC}"
    exit 1
else
    echo -e "${GREEN}✅ ВСЕ ГАРАЗД - Тільки @festlift.pt акаунти!${NC}"
    exit 0
fi
