#!/bin/bash
echo "🚨 EMERGENCY RESTORE - повертаємо до стабільної версії"

# Зупиняємо всі процеси
pkill -f "node.*server" 2>/dev/null

# Відновлюємо до stable tag
git checkout v1.0.0-stable

# Перевстановлюємо залежності
npm install

# Запускаємо MongoDB якщо потрібно
if ! docker ps | grep mongodb-deapseak; then
    docker run -d --name mongodb-deapseak -p 27017:27017 mongo:6.0
fi

echo "✅ Проект відновлено до стабільної версії"
echo "Запустіть: npm run dev"
