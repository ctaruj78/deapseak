# 🚀 Production Deployment Guide

## Як правильно деплоїти DeapSeaK на продакшен

---

## 📋 Огляд процесу

```
GitHub (код)  →  Production Server  →  .env (секрети окремо)
     ↓               ↓                      ↓
  git pull      npm install          з панелі хостингу
```

**Головний принцип:** Код в Git, секрети - окремо на сервері!

---

## 🔐 Де зберігати секрети

### ❌ НІКОЛИ:
- В Git репозиторії
- В коді (hardcoded)
- В публічних місцях

### ✅ ПРАВИЛЬНО:

#### Варіант 1: Environment Variables (найкраще)
```bash
# На production сервері:
export SMTP_PASS="xsmtpsib-..."
export MONGODB_URI="mongodb://..."
export JWT_SECRET="super-secret-key"
```

#### Варіант 2: Hosting Panel (найпростіше)
Більшість хостингів мають розділ "Environment Variables":
- **Heroku:** Settings → Config Vars
- **Vercel:** Settings → Environment Variables
- **DigitalOcean App Platform:** Settings → Environment
- **Railway:** Variables tab
- **Render:** Environment → Environment Variables

#### Варіант 3: .env на сервері (ручний деплой)
```bash
# На сервері створити .env вручну
ssh user@your-server.com
cd /var/www/deapseak
nano .env
# Вставити секрети з локального .env
```

---

## 🌐 Deployment сценарії

### 🔷 Сценарій 1: Heroku (найпопулярніше)

**1. Підготовка коду:**
```bash
# Локально
git add .
git commit -m "Production ready"
git push origin v2_refactor
```

**2. Heroku setup:**
```bash
# Встановити Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Логін
heroku login

# Створити додаток
heroku create deapseak-production

# Додати MongoDB addon
heroku addons:create mongolab:sandbox

# Встановити environment variables
heroku config:set SMTP_HOST=smtp-relay.brevo.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=YOUR-BREVO-USER@smtp-brevo.com
heroku config:set SMTP_PASS=xsmtpsib-eff1ed4c64a9493015a7277231ff34f4...
heroku config:set SMTP_FROM="LiftMaster Pro <info@festlift.pt>"
heroku config:set ADMIN_EMAIL=info@festlift.pt
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set NODE_ENV=production

# Deploy
git push heroku v2_refactor:main

# Відкрити
heroku open
```

**3. Перевірка:**
```bash
heroku logs --tail
heroku ps
```

---

### 🔷 Сценарій 2: VPS (Ubuntu) з PM2

**1. На сервері:**
```bash
# SSH до сервера
ssh root@your-server-ip

# Встановити Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Встановити MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Встановити PM2 (process manager)
npm install -g pm2

# Клонувати код
cd /var/www
git clone https://github.com/ctaruj78/deapseak.git
cd deapseak
git checkout v2_refactor

# Встановити залежності
npm install --production
```

**2. Створити .env на сервері:**
```bash
nano .env
```

Вставити:
```env
MONGODB_URI=mongodb://localhost:27017/deapseak
DB_NAME=deapseak
JWT_SECRET=your-super-secret-production-key-here-generate-with-openssl
JWT_REFRESH_SECRET=another-secret-key-here

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=YOUR-BREVO-USER@smtp-brevo.com
SMTP_PASS=xsmtpsib-YOUR-BREVO-SMTP-KEY-HERE-REPLACE-WITH-REAL-ONE
SMTP_FROM="LiftMaster Pro" <info@festlift.pt>
ADMIN_EMAIL=info@festlift.pt

NODE_ENV=production
PORT=5000
```

**3. Запустити з PM2:**
```bash
pm2 start unified-server.js --name deapseak
pm2 save
pm2 startup  # Автозапуск при перезавантаженні
```

**4. Nginx reverse proxy:**
```bash
apt-get install -y nginx

nano /etc/nginx/sites-available/deapseak
```

Вміст:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/deapseak /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

**5. SSL (Let's Encrypt):**
```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

### 🔷 Сценарій 3: Docker (універсальний)

**1. Створити Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "unified-server.js"]
```

**2. Створити docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/deapseak
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SMTP_FROM=${SMTP_FROM}
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:7
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

**3. Створити .env.production:**
```bash
# Цей файл НЕ комітимо в Git!
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=YOUR-BREVO-USER@smtp-brevo.com
SMTP_PASS=xsmtpsib-...
SMTP_FROM="LiftMaster Pro" <info@festlift.pt>
ADMIN_EMAIL=info@festlift.pt
JWT_SECRET=$(openssl rand -base64 32)
```

**4. Deploy:**
```bash
# Локально
docker-compose --env-file .env.production up -d

# Або на сервері через git
ssh user@server
cd /var/www/deapseak
git pull origin v2_refactor
docker-compose --env-file .env.production up -d --build
```

---

## 🔄 CI/CD Workflow (GitHub Actions)

**Створити `.github/workflows/deploy.yml`:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main, v2_refactor ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/deapseak
          git pull origin v2_refactor
          npm install --production
          pm2 restart deapseak
```

**Додати секрети в GitHub:**
1. Ідемо в GitHub repo → Settings → Secrets and variables → Actions
2. Додаємо:
   - `SERVER_HOST` - IP вашого сервера
   - `SERVER_USER` - SSH користувач
   - `SSH_PRIVATE_KEY` - SSH ключ

**На сервері .env вже є** - створили вручну раз назавжди!

---

## 📊 Production Checklist

### Перед деплоєм:
- [ ] `.env` в `.gitignore`
- [ ] `.env.example` оновлений (без секретів)
- [ ] `NODE_ENV=production` на сервері
- [ ] MongoDB backup налаштовано
- [ ] SSL сертифікат встановлено
- [ ] Firewall налаштовано (тільки 80, 443, 22)
- [ ] PM2 або supervisor для автореставрту
- [ ] Nginx як reverse proxy
- [ ] Логи ротуються (logrotate)

### Після деплою:
- [ ] Перевірити `/api/health`
- [ ] Логін працює
- [ ] Email відправляється
- [ ] WebSocket підключається
- [ ] MongoDB зʼєднання OK
- [ ] Моніторинг налаштовано

---

## 🔒 Security Best Practices

### 1. JWT Secrets
```bash
# Генерувати випадково:
openssl rand -base64 32
# НЕ використовувати прості паролі!
```

### 2. MongoDB
```bash
# Створити admin користувача:
mongo
use admin
db.createUser({
  user: "deapseak_admin",
  pwd: "super-complex-password-here",
  roles: ["readWrite", "dbAdmin"]
})

# В .env:
MONGODB_URI=mongodb://deapseak_admin:password@localhost:27017/deapseak?authSource=admin
```

### 3. SMTP Keys Rotation
```
Якщо ключ скомпрометований:
1. Brevo Dashboard → SMTP & API → Delete old key
2. Generate new key
3. Оновити на сервері: heroku config:set SMTP_PASS=new-key
4. Або в .env на VPS
```

### 4. Rate Limiting
```javascript
// unified-server.js вже має:
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 100 // 100 запитів
});
app.use('/api/', limiter);
```

---

## 📈 Monitoring

### Application monitoring:
```bash
# PM2 monitoring
pm2 monit

# Web dashboard
pm2 plus  # Реєстрація на https://pm2.io
```

### Log aggregation:
```bash
# Papertrail (безкоштовно до 50MB/місяць)
npm install -g papertrail
papertrail --host logs.papertrailapp.com --port 12345
```

### Uptime monitoring:
- **UptimeRobot** (https://uptimerobot.com) - безкоштовно 50 моніторів
- **Pingdom** (https://pingdom.com)
- **StatusCake** (https://www.statuscake.com)

---

## 🆘 Troubleshooting

### "Cannot connect to MongoDB"
```bash
# Перевірити статус
systemctl status mongod

# Подивитись логи
tail -f /var/log/mongodb/mongod.log

# Перезапустити
systemctl restart mongod
```

### "EADDRINUSE: Port 5000 already in use"
```bash
# Знайти процес
lsof -i :5000

# Вбити
kill -9 <PID>

# Або через PM2
pm2 restart deapseak
```

### "JWT token expired"
```bash
# Згенерувати новий секрет
openssl rand -base64 32

# Оновити на сервері
heroku config:set JWT_SECRET=<new-secret>
# Або в .env на VPS

# Перезапустити
pm2 restart deapseak
```

---

## 💡 Pro Tips

1. **Staging Environment:** Створіть тестовий сервер перед production
2. **Blue-Green Deployment:** Два сервери, переключення без downtime
3. **Database Backups:** Щоденні автоматичні бекапи MongoDB
4. **CDN:** CloudFlare для статичних файлів (assets/)
5. **Load Balancing:** Nginx + кілька PM2 інстансів

---

## 📞 Support

Якщо потрібна допомога:
- GitHub Issues: https://github.com/ctaruj78/deapseak/issues
- Email: info@festlift.pt

---

**Готові до деплою? Виберіть сценарій вище і слідуйте інструкціям!** 🚀
