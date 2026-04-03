#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# setup-minipc.sh — Встановлення FestLift на міні ПК (Ubuntu)
# Запустити ОДИН РАЗ на чистому Ubuntu 22.04/24.04
#
# Використання:
#   chmod +x deploy/setup-minipc.sh
#   sudo bash deploy/setup-minipc.sh
# ═══════════════════════════════════════════════════════════════════

set -e  # Зупинитись при будь-якій помилці

echo "╔══════════════════════════════════════════╗"
echo "║  FestLift — Production Setup (Mini PC)   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─── 1. Оновлення системи ──────────────────────────────────────────
echo "📦 [1/7] Оновлення пакетів..."
apt update && apt upgrade -y

# ─── 2. Node.js v20 LTS ───────────────────────────────────────────
echo "🟢 [2/7] Встановлення Node.js v20 LTS..."
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "   Node: $(node --version) | npm: $(npm --version)"

# ─── 3. MongoDB ───────────────────────────────────────────────────
echo "🍃 [3/7] Встановлення MongoDB..."
if ! command -v mongod &>/dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt update && apt install -y mongodb-org
fi
systemctl enable --now mongod
echo "   MongoDB: $(mongod --version | head -1)"

# ─── 4. Caddy (HTTPS reverse proxy) ───────────────────────────────
echo "🔒 [4/7] Встановлення Caddy (HTTPS)..."
if ! command -v caddy &>/dev/null; then
    apt install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt update && apt install -y caddy
fi

# Копіюємо Caddyfile якщо існує
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/Caddyfile" ]; then
    cp "$SCRIPT_DIR/Caddyfile" /etc/caddy/Caddyfile
    echo "   ✅ Caddyfile скопійовано"
else
    echo "   ⚠️  Caddyfile не знайдено — налаштуйте /etc/caddy/Caddyfile вручну"
fi

# ─── 5. Користувач festlift + директорія ──────────────────────────
echo "👤 [5/7] Створення користувача та директорії..."
if ! id "festlift" &>/dev/null; then
    useradd --system --no-create-home --shell /bin/false festlift
fi
mkdir -p /opt/festlift
chown festlift:festlift /opt/festlift

# ─── 6. Клонування/копіювання коду ────────────────────────────────
echo "📂 [6/7] Копіювання коду..."
REPO_URL="https://github.com/ctaruj78/deapseak.git"

if [ -d "/opt/festlift/.git" ]; then
    echo "   Оновлення існуючого репозиторію..."
    cd /opt/festlift && git pull origin v2_refactor
else
    echo "   Клонування репозиторію..."
    git clone -b v2_refactor "$REPO_URL" /opt/festlift
fi

cd /opt/festlift
npm install --production
chown -R festlift:festlift /opt/festlift

# Перевірка .env
if [ ! -f "/opt/festlift/.env" ]; then
    echo ""
    echo "⚠️  ВАЖЛИВО: Створіть файл /opt/festlift/.env з реальними значеннями!"
    echo "   Зразок (відредагуйте та скопіюйте):"
    echo ""
    echo "   MONGODB_URI=mongodb://localhost:27017"
    echo "   DB_NAME=deapseak"
    echo "   JWT_SECRET=<дуже_довгий_рандомний_рядок_мінімум_64_символи>"
    echo "   JWT_REFRESH_SECRET=<інший_довгий_рандомний_рядок>"
    echo "   NODE_ENV=production"
    echo "   PORT=5000"
    echo "   SMTP_HOST=smtp-relay.brevo.com"
    echo "   SMTP_PORT=587"
    echo "   SMTP_USER=<ваш_brevo_smtp_user>"
    echo "   SMTP_PASS=<ваш_brevo_smtp_key>"
    echo "   SMTP_FROM=FestLift <info@festlift.pt>"
    echo "   GEMINI_API_KEY=<ваш_google_ai_key>"
    echo "   ALLOWED_ORIGINS=https://festlift.pt"
    echo ""
    echo "   Команда: nano /opt/festlift/.env"
fi

# ─── 7. systemd сервіс ────────────────────────────────────────────
echo "⚙️  [7/7] Налаштування systemd..."
if [ -f "$SCRIPT_DIR/festlift.service" ]; then
    cp "$SCRIPT_DIR/festlift.service" /etc/systemd/system/festlift.service
fi
systemctl daemon-reload
systemctl enable festlift

# Запускаємо тільки якщо .env існує
if [ -f "/opt/festlift/.env" ]; then
    systemctl restart festlift
    systemctl reload caddy
    echo ""
    echo "✅ FestLift запущено!"
    systemctl status festlift --no-pager | head -10
else
    echo ""
    echo "⏸️  Сервер НЕ запущено — спочатку налаштуйте /opt/festlift/.env"
    echo "   Після налаштування запустіть:"
    echo "   sudo systemctl start festlift && sudo systemctl reload caddy"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  Корисні команди:"
echo "  sudo systemctl status festlift   — стан сервера"
echo "  sudo journalctl -u festlift -f   — логи в реальному часі"
echo "  sudo systemctl restart festlift  — перезапуск"
echo "  sudo systemctl reload caddy      — перезавантаження HTTPS"
echo "═══════════════════════════════════════════"
