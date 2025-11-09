#!/bin/bash
# DeapSeaK v2 - Stop Script
# Зупиняє всі сервіси системи

echo "╔════════════════════════════════════════════════╗"
echo "║        DeapSeaK v2 - Зупинка системи           ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Зупинити Backend
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill $BACKEND_PID 2>/dev/null; then
        echo "✅ Backend зупинено (PID: $BACKEND_PID)"
    fi
    rm -f logs/backend.pid
else
    lsof -ti:3002 | xargs kill 2>/dev/null && echo "✅ Backend зупинено (port 3002)" || echo "ℹ️  Backend вже зупинений"
fi

# Зупинити Frontend
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill $FRONTEND_PID 2>/dev/null; then
        echo "✅ Frontend зупинено (PID: $FRONTEND_PID)"
    fi
    rm -f logs/frontend.pid
else
    lsof -ti:5000 | xargs kill 2>/dev/null && echo "✅ Frontend зупинено (port 5000)" || echo "ℹ️  Frontend вже зупинений"
fi

# MongoDB не зупиняємо автоматично (може використовуватись)
echo ""
echo "ℹ️  MongoDB залишено запущеним"
echo "   Якщо потрібно зупинити: docker stop deapseak-mongodb"
echo ""
echo "✅ Система зупинена!"
