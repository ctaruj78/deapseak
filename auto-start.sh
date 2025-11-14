#!/bin/bash

# ============================================
# 🚀 DeapSeaK Auto Start Script
# ============================================
# Автоматичний запуск всієї системи з перевіркою залежностей
# Дата: 12 листопада 2025
# ============================================

set -e  # Зупинити при помилках

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Логування
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🔹 $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# ============================================
# КРОК 1: Перевірка системних вимог
# ============================================
log_step "Перевірка системних вимог"

# Перевірка Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js не встановлено!"
    log_info "Встановіть Node.js: https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v)
log_success "Node.js встановлено: $NODE_VERSION"

# Перевірка npm
if ! command -v npm &> /dev/null; then
    log_error "npm не встановлено!"
    exit 1
fi
NPM_VERSION=$(npm -v)
log_success "npm встановлено: v$NPM_VERSION"

# ============================================
# КРОК 2: Перевірка MongoDB
# ============================================
log_step "Перевірка MongoDB"

# Перевірка чи запущено MongoDB
if pgrep -x "mongod" > /dev/null; then
    log_success "MongoDB вже запущено"
else
    log_warning "MongoDB не запущено. Спроба запуску..."
    
    # Перевірка чи є локальний mongodb в проекті
    if [ -d "mongodb/bin" ]; then
        log_info "Використовую локальний MongoDB"
        mkdir -p mongodb/data mongodb/logs
        nohup ./mongodb/bin/mongod --dbpath ./mongodb/data --logpath ./mongodb/logs/mongod.log --port 27017 --bind_ip 127.0.0.1 > /dev/null 2>&1 &
        sleep 3
        
        if pgrep -x "mongod" > /dev/null; then
            log_success "Локальний MongoDB запущено"
        else
            log_error "Не вдалося запустити локальний MongoDB"
            log_info "Перевірте логи: mongodb/logs/mongod.log"
            exit 1
        fi
    else
        log_warning "Локальний MongoDB не знайдено"
        log_info "Спроба запуску системного MongoDB..."
        
        # Перевіряємо чи це контейнер (Codespaces, Docker)
        if [ -f "/.dockerenv" ] || grep -q "microsoft" /proc/version 2>/dev/null || [ "$CODESPACES" = "true" ]; then
            log_info "Виявлено контейнерне середовище"
            
            # Спроба запуску MongoDB 7.0 напряму
            if command -v mongod &> /dev/null; then
                MONGODB_VERSION=$(mongod --version | grep -oP "(?<=db version v)[0-9]+\.[0-9]+")
                log_info "Знайдено MongoDB версії $MONGODB_VERSION"
                
                # Запускаємо MongoDB 7.0 в фоновому режимі
                if ! pgrep -x "mongod" > /dev/null; then
                    log_info "Запуск MongoDB через mongod --fork..."
                    sudo mongod --fork \
                        --logpath /var/log/mongodb/mongod.log \
                        --dbpath /var/lib/mongodb \
                        --quiet 2>/dev/null || true
                    sleep 5
                    log_info "MongoDB має запуститись"
                fi
            fi
            
            # Якщо не вдалося, пробуємо service команду
            if ! pgrep -x "mongod" > /dev/null && command -v service &> /dev/null; then
                log_info "Спроба запуску через service..."
                sudo service mongodb start 2>/dev/null || sudo service mongod start 2>/dev/null || true
                sleep 5
                log_info "Очікування запуску MongoDB..."
            fi
        else
            # Звичайна система - використовуємо systemctl
            if command -v systemctl &> /dev/null; then
                log_info "Спроба запуску через systemctl..."
                sudo systemctl start mongod 2>/dev/null || sudo systemctl start mongodb 2>/dev/null || true
                sleep 3
            fi
        fi
        
        # Якщо MongoDB все ще не запущено, пропонуємо використати Docker
        if ! pgrep -x "mongod" > /dev/null; then
            log_warning "MongoDB не запущено через системний менеджер"
            log_info "Спроба запуску через Docker..."
            
            if command -v docker &> /dev/null; then
                # Перевіряємо чи вже є запущений контейнер MongoDB
                if docker ps --format '{{.Names}}' | grep -q "^deapseak-mongo$"; then
                    log_success "MongoDB контейнер вже запущено"
                elif docker ps -a --format '{{.Names}}' | grep -q "^deapseak-mongo$"; then
                    log_info "Запуск існуючого MongoDB контейнера..."
                    docker start deapseak-mongo > /dev/null 2>&1
                    sleep 3
                    log_success "MongoDB контейнер запущено"
                else
                    log_info "Створення нового MongoDB контейнера..."
                    docker run -d \
                        --name deapseak-mongo \
                        -p 27017:27017 \
                        -v "$(pwd)/mongodb/data:/data/db" \
                        mongo:7.0 > /dev/null 2>&1
                    sleep 5
                    log_success "MongoDB контейнер створено та запущено"
                fi
            else
                log_error "MongoDB не запущено та Docker недоступний!"
                log_info "Варіанти вирішення:"
                log_info "1. Встановіть MongoDB: https://www.mongodb.com/docs/manual/installation/"
                log_info "2. Встановіть Docker: https://docs.docker.com/get-docker/"
                log_info "3. Запустіть MongoDB вручну в іншому терміналі"
                exit 1
            fi
        fi
    fi
fi

# Перевірка підключення до MongoDB
log_info "Перевірка підключення до MongoDB..."
MONGO_CONNECTED=false
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$MONGO_CONNECTED" = false ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    # Спроба з mongosh (новий клієнт)
    if command -v mongosh &> /dev/null; then
        if mongosh --eval "db.adminCommand('ping')" --quiet localhost:27017/test > /dev/null 2>&1; then
            log_success "MongoDB доступна та працює (через mongosh)"
            MONGO_CONNECTED=true
            break
        fi
    fi

    # Спроба з mongo (старий клієнт)
    if [ "$MONGO_CONNECTED" = false ] && command -v mongo &> /dev/null; then
        if mongo --eval "db.adminCommand('ping')" --quiet localhost:27017/test > /dev/null 2>&1; then
            log_success "MongoDB доступна та працює (через mongo)"
            MONGO_CONNECTED=true
            break
        fi
    fi

    # Спроба через Docker exec якщо MongoDB в контейнері
    if [ "$MONGO_CONNECTED" = false ] && command -v docker &> /dev/null; then
        if docker ps --format '{{.Names}}' | grep -q "deapseak-mongo"; then
            if docker exec deapseak-mongo mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
                log_success "MongoDB доступна та працює (через Docker)"
                MONGO_CONNECTED=true
                break
            fi
        fi
    fi

    # Проста перевірка порту
    if [ "$MONGO_CONNECTED" = false ]; then
        if command -v nc &> /dev/null; then
            if nc -z localhost 27017 2>/dev/null; then
                log_success "MongoDB відповідає на порту 27017"
                MONGO_CONNECTED=true
                break
            fi
        else
            # Альтернативна перевірка через bash
            if timeout 1 bash -c "echo > /dev/tcp/localhost/27017" 2>/dev/null; then
                log_success "MongoDB відповідає на порту 27017"
                MONGO_CONNECTED=true
                break
            fi
        fi
    fi
    
    # Якщо не підключилися, чекаємо перед наступною спробою
    if [ "$MONGO_CONNECTED" = false ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        log_info "Спроба $RETRY_COUNT/$MAX_RETRIES: Очікування MongoDB..."
        sleep 2
    fi
done

if [ "$MONGO_CONNECTED" = false ]; then
    log_error "Не вдалося підключитися до MongoDB після $MAX_RETRIES спроб"
    log_info "Перевірте чи MongoDB запущено: ps aux | grep mongod"
    log_info "Перевірте порт: netstat -tulpn | grep 27017"
    log_info "Логи MongoDB: tail -f /var/log/mongodb/mongod.log"
    exit 1
fi

# ============================================
# КРОК 3: Встановлення залежностей
# ============================================
log_step "Перевірка npm залежностей"

if [ ! -d "node_modules" ]; then
    log_warning "node_modules не знайдено. Встановлюю залежності..."
    npm install
    log_success "Залежності встановлено"
else
    log_info "Перевірка оновлень залежностей..."
    # Перевірка чи package.json новіший за node_modules
    if [ "package.json" -nt "node_modules" ]; then
        log_warning "package.json оновлено. Встановлюю залежності..."
        npm install
        log_success "Залежності оновлено"
    else
        log_success "Залежності актуальні"
    fi
fi

# ============================================
# КРОК 4: Перевірка .env файлу
# ============================================
log_step "Перевірка конфігурації"

if [ ! -f ".env" ]; then
    log_warning ".env файл не знайдено. Створюю з шаблону..."
    cat > .env << 'EOF'
# MongoDB
MONGODB_URI=mongodb://localhost:27017/deapseak
MONGODB_TEST_URI=mongodb://localhost:27017/deapseak_test

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Server
PORT=3001
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:5000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# WebSocket
WEBSOCKET_PORT=3002

# Uploads
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    log_success ".env файл створено"
    log_warning "ВАЖЛИВО: Налаштуйте .env файл перед production використанням!"
else
    log_success ".env файл існує"
fi

# ============================================
# КРОК 5: Створення необхідних директорій
# ============================================
log_step "Створення робочих директорій"

mkdir -p logs uploads mongodb/data mongodb/logs temp
log_success "Робочі директорії створено"

# ============================================
# КРОК 6: Зупинка старих процесів
# ============================================
log_step "Зупинка старих процесів"

# Функція для зупинки процесу на порту
kill_port() {
    local port=$1
    local process_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "$process_name на порту $port вже запущено. Зупиняю..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
        log_success "$process_name зупинено"
    fi
}

kill_port 3001 "API Server"
kill_port 3002 "WebSocket Server"
kill_port 5000 "Frontend Server"
kill_port 8080 "Web Server"

# ============================================
# КРОК 7: Запуск серверів
# ============================================
log_step "Запуск серверів"

# Функція для запуску сервера
start_server() {
    local name=$1
    local command=$2
    local port=$3
    local log_file=$4
    local check_url=$5
    
    log_info "Запуск $name..."
    
    # Запустити в фоні
    nohup $command > $log_file 2>&1 &
    local pid=$!
    echo $pid > "logs/${name// /_}.pid"
    
    # Почекати запуску
    sleep 3
    
    # Перевірити процес
    if ps -p $pid > /dev/null 2>&1; then
        log_success "$name запущено (PID: $pid)"
        
        # Додаткова перевірка через HTTP якщо є URL
        if [ ! -z "$check_url" ]; then
            sleep 2
            if curl -s "$check_url" > /dev/null 2>&1; then
                log_success "$name відповідає на запити"
            else
                log_warning "$name запущено, але поки не відповідає (це нормально)"
            fi
        fi
        
        return 0
    else
        log_error "Не вдалося запустити $name"
        log_info "Перегляньте логи: tail -f $log_file"
        return 1
    fi
}

# 1. API Server (Backend) - Включає WebSocket
if [ -f "backend/app.js" ]; then
    log_info "Запуск Backend Server (API + WebSocket інтегровано)..."
    start_server "Backend Server" "node backend/app.js" 3001 "logs/backend-server.log" "http://localhost:3001/api/health"
elif [ -f "backend/server.js" ]; then
    start_server "Backend Server" "node backend/server.js" 3001 "logs/backend-server.log" "http://localhost:3001/api/health"
elif [ -f "api-server.js" ]; then
    start_server "API Server" "node api-server.js" 3001 "logs/api-server.log" "http://localhost:3001/api/health"
    
    # Окремий WebSocket якщо є
    if [ -f "websocket-server.js" ]; then
        start_server "WebSocket Server" "node websocket-server.js" 3002 "logs/websocket-server.log"
    fi
else
    log_error "Backend файл не знайдено!"
    exit 1
fi

# 2. Frontend Server
if [ -f "frontend-server.js" ]; then
    start_server "Frontend Server" "node frontend-server.js" 5000 "logs/frontend-server.log" "http://localhost:5000"
elif [ -f "server.js" ]; then
    start_server "Frontend Server" "node server.js" 5000 "logs/frontend-server.log" "http://localhost:5000"
else
    log_warning "Frontend server не знайдено, використовую простий HTTP сервер"
    if command -v python3 &> /dev/null; then
        start_server "Web Server" "python3 -m http.server 5000" 5000 "logs/web-server.log" "http://localhost:5000"
    elif command -v python &> /dev/null; then
        start_server "Web Server" "python -m SimpleHTTPServer 5000" 5000 "logs/web-server.log" "http://localhost:5000"
    else
        log_error "Не вдалося запустити веб сервер!"
    fi
fi

# ============================================
# КРОК 8: Фінальна перевірка
# ============================================
log_step "Фінальна перевірка системи"

sleep 3

# Перевірка всіх сервісів
all_ok=true

# Backend/API Server
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "Backend Server працює (API + WebSocket)"
else
    log_error "Backend Server не відповідає"
    all_ok=false
fi

# WebSocket (може бути частиною Backend або окремо)
if netstat -ln 2>/dev/null | grep :3002 > /dev/null || ss -ln 2>/dev/null | grep :3002 > /dev/null; then
    log_success "WebSocket доступний (порт 3002)"
else
    log_warning "WebSocket недоступний на порту 3002"
fi

# Frontend
if curl -s http://localhost:5000 > /dev/null 2>&1; then
    log_success "Frontend працює"
else
    log_error "Frontend не відповідає"
    all_ok=false
fi

# MongoDB
if pgrep -x "mongod" > /dev/null; then
    log_success "MongoDB працює"
else
    log_error "MongoDB не працює"
    all_ok=false
fi

# ============================================
# ФІНАЛЬНЕ ПОВІДОМЛЕННЯ
# ============================================
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 DeapSeaK System Started!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Доступні сервіси:${NC}"
echo -e "   ${GREEN}🌐 Frontend:${NC}      http://localhost:5000"
echo -e "   ${GREEN}🔗 API:${NC}           http://localhost:3001/api"
echo -e "   ${GREEN}💬 WebSocket:${NC}     ws://localhost:3002"
echo -e "   ${GREEN}🗄️  MongoDB:${NC}      mongodb://localhost:27017"
echo ""
echo -e "${BLUE}📋 Сторінки системи:${NC}"
echo -e "   ${CYAN}Логін:${NC}            http://localhost:5000/login.html"
echo -e "   ${CYAN}Реєстрація:${NC}       http://localhost:5000/register.html"
echo -e "   ${CYAN}Адмін панель:${NC}     http://localhost:5000/pages/admin/"
echo -e "   ${CYAN}Диспетчер:${NC}        http://localhost:5000/pages/dispatcher/"
echo -e "   ${CYAN}Технік:${NC}           http://localhost:5000/pages/tech/"
echo ""
echo -e "${BLUE}🛠️  Корисні команди:${NC}"
echo -e "   ${YELLOW}Переглянути логи:${NC}     tail -f logs/*.log"
echo -e "   ${YELLOW}Зупинити систему:${NC}     ./stop-servers.sh або Ctrl+C тут"
echo -e "   ${YELLOW}Перезапустити:${NC}        ./auto-start.sh"
echo -e "   ${YELLOW}Статус MongoDB:${NC}       pgrep mongod"
echo ""
echo -e "${BLUE}📁 Файли логів:${NC}"
echo -e "   ${CYAN}API:${NC}              logs/api-server.log"
echo -e "   ${CYAN}WebSocket:${NC}        logs/websocket-server.log"
echo -e "   ${CYAN}Frontend:${NC}         logs/frontend-server.log"
echo -e "   ${CYAN}MongoDB:${NC}          mongodb/logs/mongod.log"
echo ""

if [ "$all_ok" = true ]; then
    echo -e "${GREEN}✅ Всі критичні сервіси працюють!${NC}"
    echo -e "${GREEN}🚀 Система готова до роботи!${NC}"
else
    echo -e "${YELLOW}⚠️  Деякі сервіси не запустилися${NC}"
    echo -e "${YELLOW}🔍 Перевірте логи для діагностики${NC}"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Зберегти PID основного скрипту
echo $$ > logs/auto-start.pid

# Очікування (якщо потрібно)
if [ "$1" = "--wait" ] || [ "$1" = "-w" ]; then
    log_info "Натисніть Ctrl+C для зупинки системи"
    trap 'echo ""; log_warning "Зупинка системи..."; ./stop-servers.sh; exit 0' INT
    
    # Безкінечний цикл з моніторингом
    while true; do
        sleep 10
        
        # Перевірка чи всі процеси ще живі
        if [ -f "logs/API_Server.pid" ]; then
            pid=$(cat logs/API_Server.pid)
            if ! ps -p $pid > /dev/null 2>&1; then
                log_error "API Server зупинився!"
                log_info "Перезапуск..."
                ./auto-start.sh
                break
            fi
        fi
    done
fi

exit 0
