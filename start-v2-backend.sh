#!/bin/bash

# DeapSeaK v2 - Start New Backend
# This starts the new modular backend on port 3002
# Old api-server.js continues on port 3001

echo "╔════════════════════════════════════════════════╗"
echo "║       Starting DeapSeaK v2 Backend             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Please edit it with your settings:"
    echo "   - MONGODB_URI"
    echo "   - JWT_SECRET"
    echo ""
    echo "Press Enter to continue or Ctrl+C to exit and edit .env first..."
    read
fi

# Check if MongoDB is running
echo "🔍 Checking MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB not running"
    echo "🚀 Attempting to start MongoDB..."
    
    # Try different methods
    if command -v systemctl &> /dev/null; then
        sudo systemctl start mongodb || sudo systemctl start mongod
    elif command -v brew &> /dev/null; then
        brew services start mongodb-community
    else
        echo "❌ Could not start MongoDB automatically"
        echo "Please start MongoDB manually and run this script again"
        exit 1
    fi
    
    sleep 2
    
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB started"
    else
        echo "❌ MongoDB failed to start"
        exit 1
    fi
else
    echo "✅ MongoDB is running"
fi

echo ""
echo "🚀 Starting backend server..."
echo ""

# Start backend
node backend/app.js
