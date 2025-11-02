#!/bin/bash

cd /workspaces/deapseak

echo "🎉 ПОВНА ІНІЦІАЛІЗАЦІЯ СИСТЕМИ DEAPSEAK"
echo "========================================"
echo ""

# Крок 1: .env
if [ ! -f .env ]; then
    echo "📝 Створення .env файлу..."
    cat > .env << 'ENV'
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=deapseak
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345678
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-too-87654321
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FILE_ERROR=logs/error.log
LOG_FILE_COMBINED=logs/combined.log
ENV
    echo "✅ .env створено"
fi

# Крок 2: Директорії
mkdir -p logs uploads backups
echo "✅ Директорії створено"
echo ""

# Крок 3: Ініціалізація БД
echo "🗄️  Ініціалізація бази даних..."
npm run db:init
echo ""

# Крок 4: Seed БД
echo "🌱 Заповнення тестовими даними..."
npm run db:seed
echo ""

echo "✅ ВСЕ ГОТОВО!"
echo ""
echo "Запустити сервер? (npm start)"
