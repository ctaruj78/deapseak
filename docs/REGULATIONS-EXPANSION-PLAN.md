# 📚 План розширення бази регламентів

## ⚠️ Поточний стан
- **7 законів** у базі
- **34 статті** загалом (замість сотень)
- Чат працює але знає тільки ЧАСТИНУ законів

## 🎯 Цільовий стан
- **Всі статті** з кожного закону
- **Повний текст** кожної статті
- **Приклади порушень** для кожної статті
- **Португальські терміни** з кожної статті

---

## 📖 Decreto 513/70 - Regulamento de Segurança dos Ascensores

### Поточний стан: 10/62 статей ❌

### Відсутні критичні статті (потрібно додати):

**ЧАСТИНА 1 - Caixa do Elevador (Шахта)**
- [ ] Art. 1-13: Загальні вимоги до шахти
- [x] Art. 14: Caixa fechada ✅ (вже є)
- [ ] Art. 15-20: Розміри, вентиляція, освітлення

**ЧАСТИНА 2 - Portas (Двері)**
- [x] Art. 23: Portas de piso ✅ (вже є)
- [ ] Art. 24-27: Типи дверей, розміри, матеріали

**ЧАСТИНА 3 - Motor e Travagem (Мотор і гальма)**
- [x] Art. 28: Motor e freio ✅ (вже є через чат)
- [ ] Art. 29-31: Потужність, швидкість, гальмівна система

**ЧАСТИНА 4 - Cabos e Polias (Троси і шківи)**
- [x] Art. 32: Cabos ✅ (вже є через чат)
- [ ] Art. 33: Guias e sapatas
- [ ] Art. 34: Amortecedores
- [ ] Art. 35: Contrapeso
- [ ] Art. 36: Rolamentos

**ЧАСТИНА 5 - Dispositivos de Segurança (Пристрої безпеки)**
- [x] Art. 37: Para-quedas ✅ (вже є через чат)
- [ ] Art. 38: Limitador de velocidade
- [ ] Art. 39: Válvula de ruptura (hidráulicos)
- [x] Art. 40: Sensores ✅ (вже є через чат)
- [x] Art. 41: Sobrecarga ✅ (вже є через чат)

**ЧАСТИНА 6 - Cabina (Кабіна)**
- [x] Art. 42: Nivelamento ✅ (вже є через чат)
- [ ] Art. 43: Dimensões da cabina
- [x] Art. 44: Botões e painéis ✅ (вже є через чат)
- [x] Art. 45: Ventilação ✅ (вже є)
- [x] Art. 46: Iluminação ✅ (вже є через чат)
- [ ] Art. 47: Espelho obrigatório
- [x] Art. 48: Telefone/alarme ✅ (вже є через чат)

**ЧАСТИНА 7 - Casa de Máquinas**
- [ ] Art. 49-50: Localização e acesso
- [x] Art. 51: Casa de máquinas ✅ (вже є через чат)
- [x] Art. 52: Ruído ✅ (вже є через чат)

**ЧАСТИНА 8 - Instalação Elétrica**
- [ ] Art. 53-55: Quadro elétrico
- [ ] Art. 56-58: Proteções
- [ ] Art. 59-60: Terra e fusíveis

**ЧАСТИНА 9 - Documentação**
- [ ] Art. 61: Placa de identificação
- [x] Art. 62: Certificados ✅ (вже є через чат)

---

## 📖 Decreto 320/2002 - Inspeções Periódicas

### Поточний стан: 2/15 статей ❌

### Відсутні статті:
- [ ] Art. 1-5: Tipos de inspeções
- [x] Art. 6-7: Periodicidade ✅ (частково є)
- [ ] Art. 8-10: Entidades certificadas
- [ ] Art. 11-13: Relatórios obrigatórios
- [ ] Art. 14-15: Sanções e multas

---

## 📖 EN 81-70 - Acessibilidade

### Поточний стан: 12/20 статей ✅ (найповніше)

### Відсутні статті:
- [ ] Dimensões mínimas para cadeira de rodas
- [ ] Sinalização em Braille detalhada
- [ ] Comandos acessíveis (altura, alcance)
- [ ] Avisos sonoros e visuais
- [ ] Piso antiderrapante

---

## 🔧 Як розширювати базу

### Метод 1: Ручне додавання (найточніше)
```json
{
  "point": "art_29",
  "article": "Artigo 29.º",
  "requirement": "Velocidade máxima do elevador",
  "description": "Velocidade não pode exceder limites estabelecidos conforme tipo",
  "client_explanation": "Elevador tem velocidade máxima permitida por lei dependendo do tipo (residencial, comercial, hospitalar)",
  "common_violations": [
    "Elevador muito rápido (>1,6 m/s em residencial)",
    "Limitador de velocidade não calibrado",
    "Encoder defeituoso permite velocidade excessiva"
  ],
  "legal_text": "Texto completo do artigo em português...",
  "keywords": ["velocidade", "rápido", "lento", "m/s", "limitador"]
}
```

### Метод 2: Імпорт з PDF (напів-автоматично)
- Завантажити офіційний PDF закону
- Розпарсити через AI
- Перевірити вручну
- Додати до JSON

### Метод 3: Поступово через AI чат
- При кожному запиті додавати нові терміни
- Логувати незнайдені запити
- Розширювати базу на основі реальних питань

---

## 📊 Пріоритети розширення

### 🔴 ВИСОКИЙ (зараз!)
1. **Decreto 513/70 Art. 1-62** - основний закон, всі статті критичні
2. **Decreto 320/2002 Art. 1-15** - інспекції, дуже часто використовується
3. **Португальські терміни** - розширити словник на 100+ технічних слів

### 🟠 СЕРЕДНІЙ (наступний тиждень)
4. **EN 81-20/50** - сучасні норми для нових ліфтів
5. **Decreto 163/2006** - доступність (важливо для громадських будівель)

### 🟡 НИЗЬКИЙ (потім)
6. **Decreto 1135/2000** - застарілий, рідко використовується
7. **Decreto 9/2007** - шум (специфічні випадки)

---

## ✅ Результат після розширення

**Зараз:**
- 34 статті
- 7 законів
- Чат знає ~30% законодавства

**Після розширення:**
- ~150+ статей
- 7 законів (всі повністю)
- Чат знає 100% законодавства
- Кожен технічний термін має відповідь з законом

**Приклад запиту після розширення:**
```
Користувач: "Яка мінімальна висота машинного відділення?"
AI: "📖 Artigo 49.º - Decreto 513/70
Altura mínima: 2,00m
Explicação: Casa de máquinas deve ter altura suficiente 
para trabalho em pé e manutenção segura...
Violações: ❌ Altura <2m..."
```

---

## 🚀 Наступні кроки

1. ✅ Інтеграція працює - чат читає з JSON
2. ⏳ Розширити Decreto 513/70 до 62 статей
3. ⏳ Розширити Decreto 320/2002 до 15 статей
4. ⏳ Додати португальський словник (100+ термінів)
5. ⏳ Протестувати з реальними PDF звітами

**Час на виконання:** 2-3 дні інтенсивної роботи
**Результат:** AI експерт який знає ВСЕ португальське законодавство про ліфти
