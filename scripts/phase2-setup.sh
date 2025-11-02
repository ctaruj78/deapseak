#!/bin/bash

echo "🚀 PHASE 2: SECURITY & ARCHITECTURE"
echo "===================================="
echo ""

cd /workspaces/deapseak

# Перевіряємо .env
if [ ! -f .env ]; then
    echo "❌ .env файл не знайдено!"
    exit 1
else
    echo "✅ .env файл знайдено"
fi

# Перевіряємо необхідні пакети
echo ""
echo "📦 Перевіряю залежності..."

REQUIRED_PACKAGES="express-validator winston jsonwebtoken bcryptjs"
MISSING_PACKAGES=""

for package in $REQUIRED_PACKAGES; do
    if ! npm list $package &>/dev/null; then
        MISSING_PACKAGES="$MISSING_PACKAGES $package"
    fi
done

if [ -n "$MISSING_PACKAGES" ]; then
    echo "📦 Встановлюю відсутні пакети:$MISSING_PACKAGES"
    npm install $MISSING_PACKAGES
else
    echo "✅ Всі необхідні пакети встановлено"
fi

# Створюємо необхідні директорії
echo ""
echo "📁 Створюю директорії..."
mkdir -p logs uploads backups security-audit

# Перевіряємо створені файли
echo ""
echo "📝 Перевіряю створені файли..."

FILES=(
    "middleware/auth.js"
    "middleware/validation.js"
    "middleware/errorHandler.js"
    "utils/logger.js"
)

ALL_FILES_EXIST=true

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file - НЕ ЗНАЙДЕНО!"
        ALL_FILES_EXIST=false
    fi
done

echo ""
echo "=========================================="

if [ "$ALL_FILES_EXIST" = true ]; then
    echo "✅ PHASE 2 НАЛАШТУВАННЯ ЗАВЕРШЕНО!"
    echo ""
    echo "🔜 НАСТУПНІ КРОКИ:"
    echo "1. Відредагуйте .env файл (додайте реальні значення)"
    echo "2. Застосуйте authenticateJWT middleware до api-server.js"
    echo "3. Застосуйте валідацію до всіх endpoints"
    echo "4. Замініть console.log на logger у всіх файлах"
    exit 0
else
    echo "❌ ДЕЯКІ ФАЙЛИ НЕ СТВОРЕНО!"
    exit 1
fi
