# 🔧 Виправлення помилки HTTP 502 у Codespaces

## Проблема
Бачиш помилку "HTTP ERROR 502" при відкритті frontend додатку в GitHub Codespaces.

## Причина
Порт 8080 (frontend) налаштований як **Private** замість **Public** у Codespaces.

## ✅ Рішення (2 хвилини)

### Крок 1: Відкрий вкладку PORTS
1. У VS Code знизу знайди панель з вкладками
2. Клікни на вкладку **"PORTS"** (поряд з Terminal, Problems, Output)

### Крок 2: Зроби порт 8080 публічним
1. Знайди в списку рядок з портом **8080**
2. У колонці **"Visibility"** має бути написано "Public"
3. Якщо написано **"Private"**:
   - Клікни **правою кнопкою** на рядку з портом 8080
   - Вибери **"Port Visibility"** → **"Public"**
   - Почекай 2-3 секунди

### Крок 3: Перевір порт 3002
Також переконайся, що порт **3002** (API) теж Public:
1. Знайди рядок з портом **3002**
2. Visibility = **"Public"**
3. Якщо ні - зроби його Public так само

### Крок 4: Відкрий додаток
Тепер можеш відкрити:

**Frontend (основна сторінка):**
```
https://redesigned-waddle-v6w5g7rvxqpxf6pwg-8080.app.github.dev/login.html
```

**Твої дані для входу:**
- Login: `ctaruj78@gmail.com` або `ctaruj78`
- Пароль: `Solomia1704fel!`

---

## 🔍 Альтернативний спосіб (через CLI)

Якщо вкладка PORTS недоступна, запусти команду:

```bash
gh codespace ports visibility 8080:public -c $CODESPACE_NAME
gh codespace ports visibility 3002:public -c $CODESPACE_NAME
```

---

## ✅ Перевірка статусу всіх серверів

Запусти:
```bash
/tmp/check-ports.sh
```

Має показати:
- ✅ Port 8080: HTTP 200
- ✅ Port 3002: Status ok
- ✅ Port 27017: MongoDB запущений

---

## 📱 Що буде працювати після виправлення

1. **Frontend** - красивий веб-додаток з AdminLTE дизайном
2. **API v2** - Node.js + Express + MongoDB
3. **Автентифікація** - вхід з твоїм admin акаунтом
4. **Дані** - 3 ліфти в Києві + 3 заявки
5. **Всі функції** - перегляд ліфтів, створення заявок, коментарі

---

## 🆘 Якщо не допомагає

1. **Перезавантаж сторінку** в браузері (Ctrl+F5)
2. **Почекай 10 секунд** після зміни Visibility
3. **Перевір логи:**
   ```bash
   tail -f /tmp/http-server.log
   ```
4. **Перезапусти HTTP сервер:**
   ```bash
   pkill -f "python3.*8080"
   cd /workspaces/deapseak && nohup python3 -m http.server 8080 > /tmp/http-server.log 2>&1 &
   ```

---

## 🎯 Швидка перевірка через консоль

```bash
# Перевірка localhost (має бути 200)
curl -s -o /dev/null -w "Localhost: %{http_code}\n" http://localhost:8080/login.html

# Перевірка Codespaces URL (після зміни на Public має бути 200)
curl -s -o /dev/null -w "Codespaces: %{http_code}\n" https://redesigned-waddle-v6w5g7rvxqpxf6pwg-8080.app.github.dev/login.html
```

Має показати:
```
Localhost: 200
Codespaces: 200
```

---

**Після виправлення ти побачиш нормальний веб-додаток з дизайном! 🚀**
