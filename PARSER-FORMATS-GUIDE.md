# 📋 Посібник з форматів португальських інспекційних звітів

## Підтримувані формати

### 1. Bureau Veritas Rinave
**Ідентифікація:**
- Містить "BUREAU VERITAS RINAVE"
- Номер звіту: `NB2023-8010-01-01` або `DT2024-16084-01-01`

**Структура порушень:**
```
NOTA DE CLAUSULAS
Tipo Deficiência detectada
C2 Artº.46.º 2 – O dispositivo contra entalamentos instalado na cabina, encontra-se inoperacional.

RESULTADO DA INSPECÇÃO
```

**Формат клаузи:**
- `C1/C2/C3 Art[ºo.]НОМЕР.º ПІДНОМЕР – опис`
- Приклади: `C2 Artº.46.º 2 –`, `C1 Art.52 –`

---

### 2. CML Lisboa (Câmara Municipal de Lisboa)
**Ідентифікація:**
- Містить "Câmara Municipal de Lisboa" або "www.cm-lisboa.pt"
- Процес: `CML/3599/6599`

**Структура порушень:**
```
NOTA DE CLÁUSULAS
C 2 - CLÁUSULAS(S) CUJO CUMPRIMENTO...
ArtigoDescrição
ART. 20.º
(DL 320/02)
Falta de apresentação dos documentos...

Lisboa, 30 de Junho de 2025
```

**Формат клаузи:**
- Класифікація в заголовку: `C 1`, `C 2`, `C 3`
- Артикул в таблиці: `ART. НОМЕР.º (ЗАКОН) опис`
- Приклад: `ART. 20.º (DL 320/02) Falta de apresentação...`

---

### 3. APCER
**Ідентифікація:**
- Містить "APCER"
- Сертифікація ISO

**Формат клаузи:**
- Подібний до Bureau Veritas
- `C1/C2/C3 Artigo НОМЕР – опис`

---

### 4. Інші муніципалітети
**Можливі варіації:**
- Porto, Sintra, Cascais, etc.
- Формат може бути подібний до CML або Bureau Veritas

---

## Загальні патерни для пошуку

### Розділ з клаузами
- `NOTA DE CLÁUSULAS`
- `RELAÇÃO DE CLÁUSULAS`
- `CLÁUSULAS DETECTADAS`
- `DEFICIÊNCIAS DETECTADAS`

### Класифікація
- **C1** - Críticas (критичні, імобілізація)
- **C2** - Médias (середні, 30-180 днів)
- **C3** - Leves (легкі, до наступної інспекції)

### Законодавство
- Decreto 513/70
- DL 295/98 (EN81-1/2)
- DL 320/02
- Decreto Regulamentar 13/80

---

## Regex патерни

### Format 1: Bureau Veritas
```regex
([C][123])\s+Art[ºo°]?\.?\s*([\d\s\.º°]+?)\s+[-–—]\s*(.+)
```

### Format 2: Bullet points
```regex
[•▪○-]\s*([^\n]{10,300}?)(?:Art\.?º?|Artigo)\s*(\d+[a-z]?\.?\d*)\s*\(([C][123])\)
```

### Format 3: CML Lisboa
```regex
ART[\.º\s]*(\d+[a-zº°\.]*)\s*(?:\(([^)]+)\))?\s*([^\n]{20,500})
```

---

## Фільтрація помилкових спрацювань

### Фрази-пояснення (НЕ клаузи):
- "correspondem a situações"
- "cuja resolução deve"
- "não apresentam um risco"
- "obrigam à imobilização"
- "dão lugar a uma"
- "elevador aprovado/reprovado"
- "foram detetadas cláusulas tipo"
- "remoção destas não conformidades"
- "prazo máximo de X anos"
- "Despacho n.º"

### Маркери кінця розділу:
- `RESULTADO DA INSPECÇÃO`
- `OBRIGAÇÕES DO PROPRIETÁRIO`
- `Lisboa, DD de MMMMM de YYYY`
- `O DIRETOR TÉCNICO`
- `www.cm-lisboa.pt`

---

## Статус звіту

### Aprovado (схвалено)
- Без порушень або тільки C3
- "Elevador Aprovado"

### Aprovado com C2*
- C2* клаузи (2 роки на виправлення)
- "Aprovado com cláusulas C2*"

### Reprovado (відхилено)
- C2 клаузи (30-180 днів)
- "Reprovada C2-Regularizar no prazo de 30 dias"

### Reprovado com Imobilização
- C1 клаузи (негайне виправлення)
- Ліфт заборонено використовувати

---

## Приклади витягнутих даних

### Bureau Veritas - Mario Viegas
```json
{
  "reportNumber": "DT2024-16084-01-01",
  "date": "2025/02/26",
  "company": "BUREAU VERITAS RINAVE",
  "location": "RUA MARIO VIEGAS, 122",
  "violations": [
    {
      "classification": "C2",
      "article": "46.2",
      "description": "O dispositivo contra entalamentos instalado na cabina, encontra-se inoperacional.",
      "severity": "medium"
    }
  ],
  "status": "REPROVADA",
  "deadline": "30 dias"
}
```

### CML Lisboa - Soeiros
```json
{
  "reportNumber": "CML/3599/6599",
  "date": "30 de Junho de 2025",
  "company": "Câmara Municipal de Lisboa",
  "location": "Rua dos Soeiros, 307-307B",
  "violations": [
    {
      "classification": "C2",
      "article": "20",
      "legalReference": "DL 320/02",
      "description": "Falta de apresentação dos documentos referentes à modificação importante...",
      "severity": "medium"
    }
  ],
  "status": "Reinspeção",
  "deadline": "180 dias"
}
```

---

## Примітки для розробників

1. **Завжди шукайте порушення між маркерами** - не у всьому документі
2. **Фільтруйте текст пояснень** - використовуйте `isExplanationText()`
3. **Нормалізуйте артикули** - `46.º 2` → `46.2`
4. **Підтримуйте різні форми тире** - `-`, `–`, `—`
5. **Враховуйте португальські символи** - `º`, `ª`, `ç`, `ã`, `õ`
6. **Перевіряйте статус** - APROVADO/REPROVADO визначає чи мають бути порушення

---

Останнє оновлення: 21 січня 2026
