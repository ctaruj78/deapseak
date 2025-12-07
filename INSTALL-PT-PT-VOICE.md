# 🔊 ВСТАНОВЛЕННЯ ПОРТУГАЛЬСЬКОГО ГОЛОСУ (pt-PT)

**Проблема:** В системі доступний тільки бразильський португальський (pt-BR)  
**Рішення:** Встановити європейську португальську (pt-PT)

---

## 🪟 WINDOWS 10/11

### Метод 1: Налаштування мови

1. **Відкрити Settings:**
   - `Win + I` → `Time & Language` → `Language`

2. **Додати мову:**
   - Натиснути `Add a language`
   - Знайти `Portuguese (Portugal)` або `Português (Portugal)`
   - **НЕ обирайте** `Portuguese (Brazil)`!

3. **Завантажити мовний пакет:**
   - Натиснути на `Portuguese (Portugal)`
   - Вибрати `Options`
   - Завантажити `Speech` pack

4. **Налаштувати голос:**
   - Settings → `Time & Language` → `Speech`
   - У списку має з'явитися голос типу:
     - `Microsoft Maria - Portuguese (Portugal)`
     - `Microsoft Inês - Portuguese (Portugal)`

5. **Перезапустити браузер**

### Метод 2: PowerShell (швидкий)

```powershell
# Запустити PowerShell як адміністратор
Add-WindowsCapability -Online -Name "Language.Speech~~~pt-PT~0.0.1.0"
```

---

## 🍎 macOS

### Метод 1: System Preferences

1. **Відкрити System Preferences:**
   - `Apple Menu` → `System Preferences`

2. **Accessibility:**
   - `Accessibility` → `Spoken Content`

3. **Додати голос:**
   - Натиснути `System Voice` → `Customize...`
   - Знайти `Portuguese (Portugal)` в списку
   - Завантажити голоси:
     - `Joana` (жіночий)
     - `Joaquim` (чоловічий)

4. **Встановити як default (опціонально):**
   - Вибрати голос у випадаючому списку

5. **Перезапустити Safari/Chrome**

### Метод 2: Terminal (швидкий)

```bash
# Список доступних голосів
say -v ?

# Завантажити португальський голос
# (потрібно зробити через System Preferences)
```

---

## 🐧 LINUX

### Ubuntu/Debian

```bash
# Встановити espeak-ng з португальською підтримкою
sudo apt-get update
sudo apt-get install espeak-ng espeak-ng-data

# Альтернатива: Festival
sudo apt-get install festival festvox-ellpc11k
```

### Arch Linux

```bash
sudo pacman -S espeak-ng
```

### Тест голосу:

```bash
# espeak
espeak-ng -v pt-pt "Olá, isto é um teste"

# festival
echo "Olá" | festival --tts --language portuguese
```

---

## 🌐 БРАУЗЕРИ

### Chrome/Edge (рекомендовано)

✅ **Найкраща підтримка TTS**

- Використовує системні голоси Windows/macOS
- Підтримує Web Speech API повністю
- Автоматично знаходить pt-PT якщо встановлено

**Перевірка:**
1. Відкрити DevTools (`F12`)
2. Console → виконати:
   ```javascript
   speechSynthesis.getVoices().filter(v => v.lang.startsWith('pt'))
   ```

### Firefox

⚠️ **Обмежена підтримка**

- Не завжди бачить системні голоси
- Може використовувати тільки вбудовані голоси
- На Linux працює краще

### Safari (тільки macOS)

✅ **Добра підтримка на Mac**

- Використовує macOS голоси
- Якісна вимова
- Потребує голоси встановлені в System Preferences

---

## 🧪 ПЕРЕВІРКА ПІСЛЯ ВСТАНОВЛЕННЯ

### 1. Тестова сторінка:

```
http://localhost:5000/test-voice-pt.html
```

**Має показати:**
- 🇵🇹 Зелені голоси = Portugal (pt-PT) ✅
- Можливість тестування кожного голосу

### 2. Console перевірка:

```javascript
// Відкрити DevTools (F12) → Console
const voices = speechSynthesis.getVoices();
const ptPT = voices.filter(v => v.lang === 'pt-PT');
console.log('Португальські голоси:', ptPT);
```

**Очікуваний результат:**
```javascript
[
  {
    name: "Microsoft Maria - Portuguese (Portugal)",
    lang: "pt-PT",
    localService: true,
    default: false
  }
]
```

### 3. AI Assistant тест:

1. Відкрити http://localhost:5000/pages/ai-assistant-universal.html
2. Написати: "O que é o Artigo 65?"
3. Натиснути 🔊 (Volume)
4. В Console має з'явитися:
   ```
   ✅ Використовується ПОРТУГАЛЬСЬКИЙ голос: Microsoft Maria - Portuguese (Portugal) pt-PT
   ```

---

## ❌ ПОМИЛКИ ТА ВИРІШЕННЯ

### "Доступні тільки бразильські голоси"

**Причина:** pt-PT не встановлено в системі

**Рішення:**
1. Встановити мову згідно інструкції вище
2. Перезапустити браузер
3. Очистити кеш (`Ctrl+Shift+Delete`)

### "Португальський голос не знайдено"

**Причина:** Браузер не бачить системні голоси

**Рішення:**
1. Використати Chrome/Edge замість Firefox
2. Перезапустити браузер
3. Перевірити що мова встановлена в системі

### "TTS взагалі не працює"

**Причина:** Браузер не підтримує Web Speech API

**Рішення:**
1. Оновити браузер до останньої версії
2. Використати Chrome/Edge
3. Перевірити дозволи мікрофону/звуку

---

## 📊 ПОПУЛЯРНІ pt-PT ГОЛОСИ

### Windows:
- **Microsoft Maria** - жіночий, високої якості
- **Microsoft Inês** - жіночий, альтернативний

### macOS:
- **Joana** - жіночий, природний
- **Joaquim** - чоловічий

### Linux:
- **espeak-ng pt-pt** - синтетичний, безкоштовний
- **festival** - альтернатива

### Online (Cloud):
- **Google TTS** - якщо браузер має інтернет
- **Microsoft Azure** - через Cloud Speech

---

## 🎯 РЕКОМЕНДАЦІЇ

### Для найкращої якості:

1. **OS:** Windows 11 або macOS Monterey+
2. **Браузер:** Chrome або Edge (остання версія)
3. **Голос:** Microsoft Maria (Windows) або Joana (macOS)
4. **Інтернет:** Може покращити якість через Cloud TTS

### Для offline роботи:

1. Встановити локальні голоси
2. Перевірити що `localService: true`
3. Браузер: Edge (має вбудовані голоси)

---

## ✅ ЧЕКЛИСТ

Після встановлення перевірте:

- [ ] pt-PT голос з'явився в системі
- [ ] Браузер бачить голос (Console test)
- [ ] test-voice-pt.html показує зелені голоси
- [ ] AI Assistant озвучує текст португальською
- [ ] В Console: "✅ Використовується ПОРТУГАЛЬСЬКИЙ голос"
- [ ] Акцент звучить як європейська португальська (не бразильська)

---

## 📖 ДОДАТКОВІ РЕСУРСИ

### Офіційна документація:
- [Web Speech API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Chrome Speech Synthesis](https://developer.chrome.com/docs/capabilities/web-apis/speech)

### Приклади голосів:
- [Forvo - Portuguese pronunciation](https://forvo.com/languages/pt/)
- [European vs Brazilian Portuguese](https://www.fluentin3months.com/european-vs-brazilian-portuguese/)

---

**Автор:** GitHub Copilot  
**Дата:** 7 Грудня 2024
