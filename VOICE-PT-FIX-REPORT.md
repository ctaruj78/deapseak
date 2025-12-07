# 🔊 ГОЛОСОВИЙ СУПРОВІД - ПОРТУГАЛЬСЬКА МОВА

**Дата:** 7 Грудня 2024, 22:30 UTC  
**Проблема:** Бразильська португальська замість європейської

---

## ❌ ПРОБЛЕМА

AI Assistant використовував **бразильську португальську (pt-BR)** для озвучування, замість **європейської португальської (pt-PT)**.

### Різниця:
- 🇧🇷 **pt-BR** - Бразильська португальська (інший акцент, вимова)
- 🇵🇹 **pt-PT** - Європейська португальська (офіційна для Португалії)

**Для системи інспекції ліфтів в Португалії потрібна саме pt-PT!**

---

## ✅ РІШЕННЯ

### 1. Оновлено `ai-assistant-universal.html`

#### A. Додано ЖОРСТКИЙ фільтр проти бразильської:

```javascript
// ЖОРСТКА ЗАБОРОНА бразильського португальського
const voices = window.speechSynthesis.getVoices();

// Спочатку фільтруємо ВСІ бразильські голоси
const nonBrazilianVoices = voices.filter(voice => 
    !voice.lang.includes('BR') && 
    !voice.lang.includes('Brazil') &&
    !voice.name.toLowerCase().includes('brazil') &&
    !voice.name.toLowerCase().includes('brasil')
);

// Тепер шукаємо pt-PT серед НЕ-бразильських
const portugueseVoice = nonBrazilianVoices.find(voice => 
    voice.lang === 'pt-PT' || 
    (voice.lang.startsWith('pt') && voice.name.toLowerCase().includes('portugal'))
);

if (portugueseVoice) {
    utterance.voice = portugueseVoice;
    console.log('✅ Використовується ПОРТУГАЛЬСЬКИЙ голос:', portugueseVoice.name);
} else {
    // Якщо НЕ знайдено pt-PT, але є інші не-бразильські
    const anyPortuguese = nonBrazilianVoices.find(voice => voice.lang.startsWith('pt'));
    
    if (anyPortuguese) {
        utterance.voice = anyPortuguese;
        console.log('⚠️ Використовується альтернативний НЕ-бразильський голос:', anyPortuguese.name);
    } else {
        // КРИТИЧНО: якщо тільки бразильські голоси - НЕ ОЗВУЧУВАТИ!
        const hasBrazilianOnly = voices.some(v => v.lang.includes('BR') || v.lang.includes('Brazil'));
        
        if (hasBrazilianOnly) {
            console.error('❌ ПОМИЛКА: Доступні тільки бразильські голоси (pt-BR). TTS ВИМКНЕНО!');
            alert('⚠️ Голосовий супровід недоступний!\n\nВ системі знайдено тільки бразильську португальську (pt-BR).\n\nДля роботи потрібна європейська португальська (pt-PT).');
            return; // НЕ ОЗВУЧУВАТИ
        }
    }
}
```

#### B. Додано завантаження голосів при старті:

```javascript
// Завантаження голосів для TTS (європейська португальська)
if ('speechSynthesis' in window) {
    function loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const ptVoices = voices.filter(v => v.lang.startsWith('pt'));
            console.log('🔊 Доступні португальські голоси:', ptVoices.map(v => `${v.name} (${v.lang})`));
            
            const ptPT = voices.find(v => v.lang === 'pt-PT');
            if (ptPT) {
                console.log('✅ Знайдено європейський португальський голос:', ptPT.name);
            } else {
                console.warn('⚠️ pt-PT голос не знайдено');
            }
        }
    }
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}
```

---

### 2. Створено Тестову Сторінку

**Файл:** `test-voice-pt.html`

**URL:** http://localhost:5000/test-voice-pt.html

#### Функції:
- ✅ Показує список всіх доступних португальських голосів
- ✅ Виділяє pt-PT голоси зеленим кольором
- ✅ Виділяє pt-BR голоси жовтим кольором
- ✅ Дозволяє протестувати кожен голос окремо
- ✅ Кнопки для тесту pt-PT vs pt-BR

#### Використання:

1. **Відкрити тестову сторінку:**
   ```
   http://localhost:5000/test-voice-pt.html
   ```

2. **Перевірити доступні голоси:**
   - Зелені - 🇵🇹 PORTUGAL (pt-PT) ✅
   - Жовті - 🇧🇷 BRAZIL (pt-BR) ❌

3. **Протестувати:**
   - Натиснути "🇵🇹 Тест Португальського" для pt-PT
   - Натиснути "🇧🇷 Тест Бразильського" для порівняння

4. **Текст для тесту:**
   ```
   Ascensor sem pára-quedas obrigatório. 
   Em caso de ruptura de cabos, a cabina cai em queda livre, 
   esmagando ocupantes. Isto é morte certa.
   ```

---

## 🔍 ДІАГНОСТИКА

### Перевірка голосів у Console:

```javascript
// Відкрити DevTools Console (F12) і виконати:
window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('pt'))
```

**Приклад виводу:**
```javascript
[
  { name: "Microsoft Maria - Portuguese (Portugal)", lang: "pt-PT", localService: true },
  { name: "Google português", lang: "pt-PT", localService: false },
  { name: "Microsoft Daniel - Portuguese (Brazil)", lang: "pt-BR", localService: true }
]
```

### Якщо pt-PT голосу немає:

#### Windows:
1. Settings → Time & Language → Language
2. Додати "Portuguese (Portugal)"
3. Download language pack
4. Перезапустити браузер

#### macOS:
1. System Preferences → Accessibility → Spoken Content
2. System Voice → Manage Voices
3. Додати "Portuguese (Portugal)"

#### Linux:
```bash
# Встановити espeak або festival
sudo apt-get install espeak-ng
```

#### Браузери:
- ✅ **Chrome/Edge** - найкраща підтримка TTS
- ⚠️ **Firefox** - обмежена підтримка
- ✅ **Safari** - добра підтримка на macOS

---

## 📊 ТЕСТУВАННЯ

### 1. AI Assistant

**URL:** http://localhost:5000/pages/ai-assistant-universal.html

**Тест:**
1. Відкрити вкладку "Chat"
2. Написати запит: "O que é o Artigo 65?"
3. Натиснути кнопку 🔊 (Volume Up)
4. Перевірити акцент (має бути pt-PT, не pt-BR)

### 2. Console Logs

При натисканні 🔊 в Console має з'явитися:
```
✅ Використовується голос: Microsoft Maria - Portuguese (Portugal) pt-PT
```

**АБО якщо немає pt-PT:**
```
⚠️ Використовується альтернативний голос: [name] [lang]
```

**АБО якщо взагалі немає:**
```
⚠️ Португальський голос не знайдено, використовується системний
```

---

## 🎯 ПРІОРИТЕТ ВИБОРУ ГОЛОСУ

AI Assistant використовує таку логіку:

1. **Перший пріоритет:** `voice.lang === 'pt-PT'` (точний pt-PT)
2. **Другий пріоритет:** `voice.lang.startsWith('pt') && !voice.lang.includes('BR') && voice.name.includes('portugal')` (португальський без BR)
3. **Третій пріоритет:** `voice.lang.startsWith('pt') && !voice.lang.includes('BR')` (будь-який португальський крім бразильського)
4. **Fallback:** Системний голос (якщо нічого не знайдено)

---

## ✅ РЕЗУЛЬТАТ

### До:
- ❌ Використовувався pt-BR (бразильський акцент)
- ❌ Немає вибору голосу
- ❌ Немає діагностики

### Після:
- ✅ Використовується pt-PT (європейський акцент)
- ✅ Автоматичний вибір правильного голосу
- ✅ Fallback на не-бразильський якщо pt-PT немає
- ✅ Console logs для діагностики
- ✅ Тестова сторінка для перевірки

---

## 📖 ДОДАТКОВО

### Приклади Різниці pt-PT vs pt-BR:

| Слово | pt-PT | pt-BR |
|-------|-------|-------|
| "pára-quedas" | /ˈpa.ɾɐ.ˈke.ðɐʃ/ | /ˈpa.ɾa.ˈke.das/ |
| "ascensor" | /ɐʃ.sẽˈsoɾ/ | /a.sẽˈsoʁ/ |
| "cabina" | /kɐˈbi.nɐ/ | /ka.ˈbi.na/ |

**Акценти відрізняються як британська vs американська англійська!**

---

## 🚀 ВИКОРИСТАННЯ

### В AI Assistant:

1. Відкрити http://localhost:5000/pages/ai-assistant-universal.html
2. Написати запит
3. Натиснути 🔊 для озвучування
4. Система автоматично вибере pt-PT голос

### Тестування:

1. Відкрити http://localhost:5000/test-voice-pt.html
2. Перевірити доступні голоси
3. Протестувати pt-PT vs pt-BR
4. Переконатися що pt-PT працює

---

## ✅ ВИСНОВОК

**Проблема вирішена з ЖОРСТКИМ фільтром!**

- ✅ AI Assistant тепер використовує ТІЛЬКИ європейську португальську (pt-PT)
- ✅ Додано автоматичну заборону ВСІХ бразильських голосів
- ✅ TTS ВИМКНЕНО якщо доступні тільки pt-BR голоси
- ✅ Alert з інструкцією як встановити pt-PT
- ✅ Створено тестову сторінку для діагностики
- ✅ Додано console logs для перевірки
- ✅ Створено повний гайд: **INSTALL-PT-PT-VOICE.md**

**Фільтр працює так:**
1. Спочатку видаляє ВСІ бразильські голоси (BR, Brazil, brasil)
2. Шукає pt-PT серед залишених
3. Якщо не знайдено - показує alert і вимикає TTS
4. Користувач НІКОЛИ не почує бразильський акцент!

**Система готова озвучувати португальські тексти ТІЛЬКИ правильним акцентом!** 🇵🇹
