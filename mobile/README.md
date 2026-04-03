# DeapSeaK Mobile 📱

Мобільний додаток для техніків системи управління ліфтами **FestLift/DeapSeaK**.

---

## Стек технологій

- **React Native 0.74 + Expo SDK 54**
- `@react-navigation/native` — навігація між екранами
- `expo-camera` — сканування QR-кодів
- `@react-native-async-storage` — збереження токену та URL сервера
- `axios` — HTTP запити

---

## Екрани

| Екран | Опис |
|-------|------|
| `LoginScreen` | Вхід в систему |
| `TasksScreen` | Список завдань техніка |
| `TaskDetailScreen` | Деталі + зміна статусу завдання |
| `QRScannerScreen` | Сканер QR-кодів ліфтів |
| `SettingsScreen` | **НОВИЙ** — налаштування URL сервера |

---

## Запуск для розробки

```bash
cd mobile
npm install
npx expo start
```

Скануйте QR-код в **Expo Go** (Android/iOS app).

### Налаштування сервера при розробці

У додатку → ⚙️ Settings → введіть URL:

```
http://192.168.1.XXX:5000   ← IP вашого комп'ютера в мережі
```

---

## Production deployment

### Варіант A — APK для Android (рекомендовано)

```bash
# Встановити EAS CLI
npm install -g eas-cli
cd mobile

# Логін в Expo
eas login

# Первинне налаштування
eas build:configure

# Збудувати APK (безкоштовно, ~10-15 хвилин)
eas build -p android --profile preview
```

APK завантажиться на expo.dev → надіслати технікам через WhatsApp/email.

#### Після встановлення APK:
Технік відкриває ⚙️ → вводить `https://festlift.pt` → Перевірити → Зберегти.
Більше ніколи не треба змінювати! Налаштування зберігаються.

---

### Варіант B — PWA (без установки додатку)

Технік відкриває `https://festlift.pt/pages/tech/dashboard.html` у Chrome:
`⋮ → Додати на головний екран`

---

## Структура файлів

```
mobile/
├── App.js                    # Root + навігація + loadServerUrl()
├── screens/
│   ├── LoginScreen.js        # + кнопка ⚙️ для відкриття Settings
│   ├── TasksScreen.js
│   ├── TaskDetailScreen.js
│   ├── QRScannerScreen.js
│   └── SettingsScreen.js     # ← NEW: URL сервера + ping test
└── utils/
    ├── api.js                # axios + динамічний SERVER_URL
    ├── AuthContext.js
    └── helpers.js
```
