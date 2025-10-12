# 🌐 ІНСТРУКЦІЯ ДЛЯ НАЛАШТУВАННЯ ПОРТІВ У GITHUB CODESPACES

## 🚨 ПРОБЛЕМА: HTTP ERROR 401

**Причина:** Порт 8080 має приватну видимість у GitHub Codespaces

## ✅ РІШЕННЯ: Зробити порти публічними

### Спосіб 1: Через VS Code інтерфейс

1. **Відкрити панель портів:**
   - У нижній частині VS Code знайти вкладку **"PORTS"**
   - Якщо немає - натиснути `Ctrl+Shift+P` → `View: Toggle Panel`

2. **Налаштувати порт 8080:**
   - Знайти рядок з портом **8080**
   - Правою кнопкою → **"Port Visibility"** → **"Public"**
   - Або клікнути на іконку замка 🔒 та змінити на публічний 🌐

3. **Налаштувати порт 3001:**
   - Знайти рядок з портом **3001**
   - Правою кнопкою → **"Port Visibility"** → **"Public"**

### Спосіб 2: Через термінал

```bash
# Робимо порти публічними
gh codespace ports visibility 8080:public
gh codespace ports visibility 3001:public
```

### Спосіб 3: Автоматично через devcontainer.json

Створити/оновити `.devcontainer/devcontainer.json`:
```json
{
  "forwardPorts": [8080, 3001],
  "portsAttributes": {
    "8080": {
      "visibility": "public",
      "label": "Web Server"
    },
    "3001": {
      "visibility": "public", 
      "label": "API Server"
    }
  }
}
```

---

## 🧪 ПІСЛЯ НАЛАШТУВАННЯ ПОРТІВ

### 1. Перевірити доступність:
```
✅ https://redesigned-waddle-v6w5g7rvxqpxf6pwg-8080.app.github.dev/
✅ https://redesigned-waddle-v6w5g7rvxqpxf6pwg-3001.app.github.dev/api/health
```

### 2. Тестувати логін:
```
https://ваш-codespace-8080.app.github.dev/test-codespaces-urls.html
https://ваш-codespace-8080.app.github.dev/fixed-login.html
```

---

## 🔧 ЗАПУСК СЕРВЕРІВ

```bash
# У терміналі 1: API сервер
cd /workspaces/deapseak
node api-server.js

# У терміналі 2: Веб сервер  
cd /workspaces/deapseak
python3 -m http.server 8080
```

---

## 📊 ПЕРЕВІРКА СТАТУСУ ПОРТІВ

### У VS Code:
- Панель **PORTS** → перевірити що порти **Public** 🌐

### Через команду:
```bash
gh codespace ports list
```

### Очікуваний вигляд:
```
Port  Name        Visibility  URL
8080  Web Server  Public      https://...-8080.app.github.dev
3001  API Server  Public      https://...-3001.app.github.dev
```

---

## 🎯 РЕЗУЛЬТАТ

Після зміни видимості на **Public**:
- ✅ HTTP ERROR 401 зникне
- ✅ Сторінки будуть доступні
- ✅ Логін працюватиме

**Найпростіший спосіб: клікнути на замок 🔒 у панелі PORTS та змінити на 🌐 Public**