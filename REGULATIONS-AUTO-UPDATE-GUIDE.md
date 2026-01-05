# 🔄 Автоматичне Оновлення Регламентів

## 🎯 Що це?

Система автоматично перевіряє офіційні португальські джерела на наявність **нових законів та регламентів** про ліфти і додає їх до бази даних DeapSeaK.

---

## ✨ Можливості

### 🤖 Google Gemini AI Integration
AI асистент тепер **брендований**:
- 🌟 Показує "Powered by Google Gemini 2.5 Flash"
- 🎨 Google кольоровий логотип (синій/червоний/жовтий/зелений)
- 🚀 Найновіша модель від Google

### 📚 Джерела моніторингу:

**🏛️ DGE - ГОЛОВНИЙ РЕГУЛЯТОР** ⭐
- **Назва:** Direção-Geral de Energia e Geologia
- **Роль:** Головний державний орган, відповідальний за ліфти в Португалії
- **URL:** https://www.dgeg.gov.pt
- **Що моніторить:**
  - 📋 Секція ліфтів: `/areas-setoriais/equipamentos-sob-pressao-e-elevadores/elevadores/`
  - 📜 Законодавство: `/legislacao/`
  - 🔍 Інспекції: `/elevadores/inspecoes/`
- **Важливість:** ⭐⭐⭐⭐⭐ Найавторитетніше джерело!

**📰 Інші офіційні джерела:**

1. **Diário da República** - офіційна газета законів Португалії
   - URL: https://dre.pt
   - Всі нові закони публікуються тут

2. **ASAE** - інспекції та економічна безпека
   - URL: https://www.asae.gov.pt
   - Інспекційна діяльність

3. **ACT** - трудова інспекція
   - URL: https://www.act.gov.pt
   - Безпека праці техніків

### 🔍 Що перевіряється:
- Нові decreto-lei (закони)
- Оновлення існуючих регламентів
- Зміни в стандартах безпеки
- Нові вимоги до інспекцій

---

## 🚀 Використання

### 1. Ручна перевірка (в AI Асистенті)

1. Відкрити **AI Асистент** (будь-яка роль)
2. Перейти на вкладку **"Норми PT"**
3. Натиснути кнопку **"🔄 Перевірити оновлення"**
4. Почекати результату (5-30 секунд)

**Результат:**
```
✅ Перевірка завершена!
Перевірено: 7 регламентів
Нових знайдено: 0
Оновлено: 0
```

Якщо знайдено нові закони - з'явиться попередження:
```
⚠️ Знайдено нові регламенти! Перезавантажте сторінку.
```

### 2. API Endpoint (для інтеграцій)

**Запустити перевірку:**
```bash
curl -X POST http://localhost:5000/api/regulations/check-updates \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Отримати останній звіт:**
```bash
curl http://localhost:5000/api/regulations/last-check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Відповідь:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-01-04T12:00:00.000Z",
    "total_checked": 7,
    "new_regulations": 0,
    "updated_regulations": 0,
    "details": []
  }
}
```

### 3. Автоматична перевірка (Cron)

**Налаштувати щоденну перевірку о 03:00:**

```bash
# Відкрити crontab
crontab -e

# Додати рядок:
0 3 * * * /workspaces/deapseak/cron-check-regulations.sh
```

**Або для системи з systemd:**

```bash
# Створити systemd timer
sudo nano /etc/systemd/system/regulations-update.service
```

Вміст:
```ini
[Unit]
Description=DeapSeaK Regulations Auto-Update
After=network.target

[Service]
Type=oneshot
User=yourusername
WorkingDirectory=/workspaces/deapseak
ExecStart=/usr/bin/node /workspaces/deapseak/services/regulations-updater.js

[Install]
WantedBy=multi-user.target
```

Timer:
```bash
sudo nano /etc/systemd/system/regulations-update.timer
```

```ini
[Unit]
Description=Run regulations update daily at 3 AM
Requires=regulations-update.service

[Timer]
OnCalendar=daily
OnCalendar=03:00
Persistent=true

[Install]
WantedBy=timers.target
```

Активувати:
```bash
sudo systemctl enable regulations-update.timer
sudo systemctl start regulations-update.timer
```

---

## 📊 Логи та Звіти

### Файли логів:

1. **regulations-updates.log** - детальні логи перевірок
   ```
   [2026-01-04T12:00:00.000Z] 🔍 Перевірка Diário da República...
   [2026-01-04T12:00:05.000Z] ✅ Завантажено 7 регламентів
   [2026-01-04T12:00:10.000Z] 📋 Перевірка відомих регламентів...
   ```

2. **regulations-check-report.json** - JSON звіт
   ```json
   {
     "timestamp": "2026-01-04T12:00:00.000Z",
     "total_checked": 7,
     "new_regulations": 0,
     "updated_regulations": 0,
     "details": []
   }
   ```

3. **admin-notifications.json** - сповіщення для адміна
   ```json
   [
     {
       "type": "new_regulation",
       "regulation": "123/2026",
       "title": "Novo regulamento sobre...",
       "timestamp": "2026-01-04T12:00:00.000Z"
     }
   ]
   ```

### Переглянути логи:

```bash
# Останні 50 рядків
tail -50 logs/regulations-updates.log

# Слідкувати в реальному часі
tail -f logs/regulations-updates.log

# Переглянути звіт
cat logs/regulations-check-report.json | jq '.'
```

---

## 🔧 Налаштування

### Змінні в коді:

**services/regulations-updater.js:**
```javascript
// Додати нове джерело
const OFFICIAL_SOURCES = {
    diario: 'https://dre.pt/...',
    asae: 'https://www.asae.gov.pt/...',
    your_source: 'https://example.pt/...'  // ← Додати тут
};

// Додати новий регламент для моніторингу
const KNOWN_REGULATIONS = [
    { number: '513/70', year: 1970, title: '...' },
    { number: 'YOUR/NUMBER', year: 2026, title: '...' }  // ← Додати тут
];
```

### Частота перевірок:

**Cron формати:**
```bash
0 3 * * *       # Щодня о 03:00
0 */6 * * *     # Кожні 6 годин
0 0 * * 1       # Кожен понеділок о 00:00
0 0 1 * *       # 1-го числа кожного місяця
```

---

## 🚨 Що робити коли знайдено новий закон?

### Автоматичні дії системи:

1. ✅ **Додає в базу даних** - `/data/portuguese-regulations.json`
2. 📧 **Створює сповіщення** - `/logs/admin-notifications.json`
3. 📝 **Записує в лог** - деталі про новий закон
4. 📊 **Генерує звіт** - JSON з усіма змінами

### Ручні дії адміна:

1. **Перевірити новий закон:**
   ```bash
   cat data/portuguese-regulations.json | jq '.regulations[-1]'
   ```

2. **Переглянути офіційний текст:**
   - Відкрити посилання з поля `official_source`
   - Diário da República: https://dre.pt

3. **Додати деталі (якщо потрібно):**
   - Відкрити `data/portuguese-regulations.json`
   - Знайти новий регламент
   - Додати `inspection_points`, `common_violations`, тощо

4. **Повідомити команду:**
   - Email розсилка
   - Сповіщення в системі
   - Training для техніків

---

## 🧪 Тестування

### Ручний запуск:

```bash
node services/regulations-updater.js
```

**Очікуваний результат:**
```
═══════════════════════════════════════════════════════════
🚀 ПОЧАТОК ПЕРЕВІРКИ ОНОВЛЕНЬ РЕГЛАМЕНТІВ
═══════════════════════════════════════════════════════════
✅ Завантажено 7 регламентів
🔍 Перевірка Diário da República...
   Пошук: "elevadores"
   Пошук: "ascensores"
   Пошук: "manutenção elevadores"
   Пошук: "inspeção elevadores"
   Пошук: "segurança elevadores"

📋 Перевірка відомих регламентів...
   ✅ 513/70 - Regulamento de Segurança dos Ascensores Eléctricos
   ✅ 320/2002 - Decreto-Lei sobre segurança de elevadores
   ✅ 163/2006 - Transposição da Diretiva 95/16/CE
   ✅ 209/2000 - Equipamento eléctrico em atmosferas explosivas
   ✅ 214/95 - Regulamento sobre elevadores
   ✅ 139/93 - Regulamento de Segurança contra Incêndio
   ✅ 46/2006 - Regulamento de segurança em edifícios

💾 База даних збережена
📊 Звіт створено: regulations-check-report.json

═══════════════════════════════════════════════════════════
✅ ПЕРЕВІРКА ЗАВЕРШЕНА
📊 Результати: 0 нових, 0 оновлених
═══════════════════════════════════════════════════════════

✅ Успішно завершено!
Нових регламентів: 0
Оновлених: 0
```

### Тест з новим законом (mock):

Додати в `mockSearchDiario()` тестові дані:
```javascript
async mockSearchDiario(term) {
    if (term === 'elevadores') {
        return [{
            number: '999/2026',
            title: 'Test Regulation',
            type: 'new'
        }];
    }
    return [];
}
```

---

## 🔐 Безпека

### Доступ до API:

- ✅ **Тільки адміни** можуть запускати перевірку
- ✅ JWT автентифікація обов'язкова
- ✅ Логи всіх перевірок

### Захист даних:

- ✅ Backup перед оновленням БД
- ✅ Валідація нових даних
- ✅ Rollback при помилках

---

## 📖 Приклади використання

### 1. Перевірка перед важливою інспекцією:

```javascript
// В AI асистенті
1. Натиснути "Перевірити оновлення"
2. Почекати звіт
3. Якщо є нові - читати деталі
4. Оновити чеклист інспекції
```

### 2. Щотижнева рутина адміна:

```bash
# Понеділок ранок
./cron-check-regulations.sh

# Переглянути результат
cat logs/regulations-check-report.json | jq '.'

# Якщо є нові - повідомити команду
```

### 3. API інтеграція для інших систем:

```python
import requests

# Запустити перевірку
response = requests.post(
    'http://localhost:5000/api/regulations/check-updates',
    headers={'Authorization': f'Bearer {admin_token}'}
)

report = response.json()['data']

if report['new_regulations'] > 0:
    send_slack_notification(
        f"🚨 Знайдено {report['new_regulations']} нових регламентів!"
    )
```

---

## 🎯 Roadmap

### Поточна версія (v1.0):
- ✅ Базова перевірка Diário da República
- ✅ Mock функції для тестування
- ✅ API endpoints
- ✅ Логи та звіти
- ✅ Cron job скрипт

### Майбутні оновлення (v2.0):
- [ ] Реальний web scraping Diário da República
- [ ] API інтеграція з ASAE
- [ ] Email сповіщення адмінам
- [ ] Автоматичний парсинг тексту законів
- [ ] AI аналіз змін в законах
- [ ] Порівняння старої/нової версії регламентів
- [ ] Multilingual support (PT/UA/EN)

---

## 📞 Підтримка

**Питання?** Зверніться до:
- Документація: `/docs/regulations-update.md`
- Логи: `/logs/regulations-updates.log`
- GitHub Issues: створити тікет з тегом `regulations`

---

**🎉 Готово! Ваша база законів завжди актуальна!**
