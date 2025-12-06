#!/bin/bash

# ============================================
# 🛑 DeapSeaK Stop Script
# ============================================
# Зупинка всіх серверів системи
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🛑 Зупинка DeapSeaK системи${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Функція для зупинки процесу на порту
stop_port() {
    local port=$1
    local name=$2
    
    local pids=$(lsof -t -i:$port 2>/dev/null)
    
    if [ -z "$pids" ]; then
        log_info "$name: порт $port вільний"
        return 0
    fi
    
    log_info "Зупинка $name (PID: $pids)..."
    
    # Спочатку спробуємо м'яко зупинити
    kill $pids 2>/dev/null
    sleep 2
    
    # Перевіримо чи зупинився
    local remaining=$(lsof -t -i:$port 2>/dev/null)
    
    if [ -z "$remaining" ]; then
        log_success "$name зупинено"
        return 0
    fi
    
    # Якщо не зупинився, примусово
    log_warning "Примусова зупинка $name..."
    kill -9 $remaining 2>/dev/null
    sleep 1
    
    # Фінальна перевірка
    if lsof -t -i:$port >/dev/null 2>&1; then
        log_warning "Не вдалося зупинити $name"
        return 1
    else
        log_success "$name примусово зупинено"
        return 0
    fi
}

# Зупинка по PID файлах
if [ -d "logs" ]; then
    for pid_file in logs/*.pid; do
        if [ -f "$pid_file" ]; then
            pid=$(cat "$pid_file")
            name=$(basename "$pid_file" .pid | sed 's/_/ /g')
            if ps -p $pid > /dev/null 2>&1; then
                log_info "Зупинка $name (PID: $pid)..."
                kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
            fi
            rm -f "$pid_file"
        fi
    done
fi

# Зупинити сервери по портах
stop_port "3001" "API Server"
stop_port "3002" "WebSocket Server"
stop_port "5000" "Frontend Server"
stop_port "8080" "Web Server"

# Зупинити процеси за іменами (додаткова безпека)
log_info "Пошук процесів за іменами..."

# Node.js процеси
pkill -f "api-server.js" 2>/dev/null && log_success "api-server.js зупинено" || true
pkill -f "websocket-server.js" 2>/dev/null && log_success "websocket-server.js зупинено" || true
pkill -f "frontend-server.js" 2>/dev/null && log_success "frontend-server.js зупинено" || true
pkill -f "backend/server.js" 2>/dev/null && log_success "backend/server.js зупинено" || true

# Python HTTP сервер
pkill -f "http.server" 2>/dev/null && log_success "python http.server зупинено" || true
pkill -f "SimpleHTTPServer" 2>/dev/null && log_success "python SimpleHTTPServer зупинено" || true

# Очистити файли
rm -f nohup.out 2>/dev/null

echo ""
log_info "Перевірка портів:"

all_clear=true
for port in 3001 3002 5000 8080; do
    if lsof -i :$port >/dev/null 2>&1; then
        log_warning "Порт $port ще зайнятий"
        all_clear=false
    else
        log_success "Порт $port вільний"
    fi
done

echo ""
if [ "$all_clear" = true ]; then
    log_success "Всі сервери успішно зупинено!"
else
    log_warning "Деякі порти все ще зайняті"
    log_info "Спробуйте: sudo lsof -i :PORT для діагностики"
fi

echo ""
log_info "Для повторного запуску: ./auto-start.sh"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
