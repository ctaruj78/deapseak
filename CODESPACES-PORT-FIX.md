# 🔧 Виправлення CORS в GitHub Codespaces

## ❌ Проблема
```
Access to fetch at 'https://...-3001.app.github.dev/api/settings' 
has been blocked by CORS policy
```

## ✅ Рішення

### Крок 1: Зробити порт 3001 публічним

1. **Відкрийте панель PORTS** в VS Code:
   - Натисніть `Ctrl+J` або `Cmd+J` (Mac)
   - Виберіть вкладку "PORTS"

2. **Знайдіть порт 3001**:
   - Шукайте рядок з "3001" (Backend API)

3. **Змініть видимість на Public**:
   - **Правий клік** на рядку з портом 3001
   - Виберіть **"Port Visibility"**
   - Виберіть **"Public"**

4. **Перевірте статус**:
   - Порт 3001 має показувати "Public" в колонці Visibility
   - URL має бути доступний зовні

### Крок 2: Перезавантажте сторінку

Після зміни видимості порту:

```
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)
```

---

## 📸 Візуальна інструкція

```
VS Code Bottom Panel → PORTS Tab
════════════════════════════════════════
Port  | Label          | Visibility | ...
------|----------------|------------|-----
3001  | Backend API    | Public ✅  | ...
3002  | WebSocket      | Private    | ...
5000  | Frontend       | Public ✅  | ...
```

**Правий клік на 3001 → Port Visibility → Public**

---

## 🔍 Перевірка

Після налаштування, виконайте в терміналі:

```bash
# Перевірка доступності API
curl -s https://$(echo $CODESPACE_NAME | cut -d'-' -f1-5)-3001.app.github.dev/health

# Має показати:
# {"status":"ok","timestamp":"...","uptime":...}
```

Або відкрийте в браузері:
```
https://ВАШ-CODESPACE-URL-3001.app.github.dev/health
```

---

## 🚨 Альтернативне рішення (якщо не працює)

Використайте GitHub CLI:

```bash
gh codespace ports visibility 3001:public -c "$CODESPACE_NAME"
```

---

## ✅ Результат

Після виправлення:
- ✅ API запити працюють
- ✅ Налаштування зберігаються
- ✅ Немає CORS помилок
- ✅ Console показує успішні запити

---

**📝 Примітка:** Видимість порту потрібно налаштовувати лише раз. При наступному запуску Codespace налаштування збережуться.
