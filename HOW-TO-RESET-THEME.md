# 🎨 Як Скинути Темну Тему

## ❓ Проблема: Сторінка стала чорною

Це **НЕ баг** - це збережене налаштування теми користувача!

---

## ✅ Рішення 1: Через Browser DevTools

### Крок 1: Відкрий DevTools
- **Chrome/Edge**: `F12` або `Ctrl+Shift+I`
- **Firefox**: `F12` або `Ctrl+Shift+K`
- **Safari**: `Cmd+Option+I`

### Крок 2: Console
Перейди на вкладку **Console**

### Крок 3: Виконай команду
```javascript
localStorage.clear()
location.reload()
```

Або тільки тему:
```javascript
localStorage.removeItem('user_settings')
location.reload()
```

---

## ✅ Рішення 2: Через Налаштування (якщо є UI)

1. Відкрий **Налаштування** в dashboard
2. Знайди **Тема**
3. Вибери **Світла**
4. Натисни **Зберегти**

---

## ✅ Рішення 3: Інкогніто режим

Відкрий сайт в **приватному/інкогніто** режимі:
- **Chrome**: `Ctrl+Shift+N`
- **Firefox**: `Ctrl+Shift+P`
- **Safari**: `Cmd+Shift+N`

В інкогніто немає збережених налаштувань, тому тема буде світлою.

---

## 🔧 Для розробників

### Як працює тема:

1. **Збереження**: `localStorage.setItem('user_settings', JSON.stringify({theme: 'dark'}))`
2. **Застосування**: `global-settings.js` автоматично застосовує при завантаженні
3. **CSS**: `theme-dark.css` містить стилі темної теми
4. **Body class**: `<body class="theme-dark">`

### Перевірити що збережено:

```javascript
// В Console
console.log(localStorage.getItem('user_settings'))
```

### Встановити світлу тему:

```javascript
localStorage.setItem('user_settings', JSON.stringify({
    theme: 'light',
    language: 'uk'
}))
location.reload()
```

### Встановити темну тему:

```javascript
localStorage.setItem('user_settings', JSON.stringify({
    theme: 'dark',
    language: 'uk'
}))
location.reload()
```

---

## 📝 Технічні деталі

**Файли задіяні:**
- `/assets/js/global-settings.js` - автоматично застосовує тему
- `/assets/css/theme-dark.css` - стилі темної теми
- `localStorage.user_settings` - зберігає вибір користувача

**Як це працює:**
1. При завантаженні будь-якої сторінки `global-settings.js` завантажується першим
2. Він читає `localStorage.user_settings`
3. Якщо `theme: 'dark'` - додає клас `theme-dark` до `<body>`
4. CSS `theme-dark.css` застосовує темні кольори

---

## ✅ Все працює правильно!

Якщо бачиш темну тему - це означає що:
1. ✅ localStorage працює
2. ✅ global-settings.js працює
3. ✅ theme-dark.css підключений
4. ✅ Користувач раніше вибрав темну тему

Це **фіча**, не баг! 🎉
