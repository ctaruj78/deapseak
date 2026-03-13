# DeapSeaK Mobile 📱

Мобільний додаток для техніків системи управління ліфтами **DeapSeaK**.

---

## Стек технологій

- **React Native** 0.74.5
- **Expo** SDK 54
- **@react-navigation/native** v6
- **Expo Camera** v15 (для QR-сканера)
- **AsyncStorage** (для збереження токену)
- **Axios** (для API-запитів)

---

## Структура проекту

```
mobile/
├── App.js                    # Головний компонент (навігація + auth)
├── app.json                  # Expo конфігурація
├── babel.config.js
├── package.json
├── assets/                   # Іконки та зображення
├── screens/
│   ├── LoginScreen.js        # Екран входу
│   ├── TasksScreen.js        # Список завдань техніка
│   ├── TaskDetailScreen.js   # Деталі завдання + зміна статусу
│   └── QRScannerScreen.js    # Сканер QR-кодів ліфтів
└── utils/
    ├── api.js                # Axios клієнт + всі API методи
    ├── AuthContext.js        # React контекст для авторизації
    └── helpers.js            # Допоміжні функції (дати, кольори статусів)
```

---

## Налаштування та запуск

### 1. Встановити залежності

```bash
cd mobile
npm install
```

### 2. Налаштувати IP сервера

Відкрийте файл `utils/api.js` та змініть `SERVER_URL`:

```js
// Знайдіть IP вашого комп'ютера у мережі:
// Linux/Mac: ip addr | grep inet
// Windows: ipconfig

export const SERVER_URL = 'http://192.168.X.X:5000';  // ← ваш IP
```

> ⚠️ **Важливо**: `localhost` або `127.0.0.1` НЕ працює на фізичному телефоні.
> Телефон і комп'ютер мають бути в **одній Wi-Fi мережі**.

### 3. Запустити сервер DeapSeaK

```bash
# У кореневій папці проекту:
cd /workspaces/deapseak
node unified-server.js
```

### 4. Запустити Expo

```bash
cd mobile
npx expo start
```

Відкриє QR-код у терміналі → відскануйте додатком **Expo Go** на телефоні.

---

## Функціональність

| Екран | Функції |
|-------|---------|
| **Вхід** | Авторизація по логіну/email + пароль |
| **Завдання** | Список tasks + requests, фільтрація, пошук, pull-to-refresh |
| **Деталі** | Повна інформація, зміна статусу, завершення з описом, коментарі |
| **QR Сканер** | Сканування QR ліфтів → деталі ліфта → пов'язані завдання |

---

## Ролі користувачів

Додаток доступний для ролей: **tech**, **technician**, **admin**.

---

## Збірка APK (Android)

```bash
# Встановіть EAS CLI
npm install -g eas-cli

# Налаштуйте проект
eas build:configure

# Зберіть APK
eas build -p android --profile preview
```
