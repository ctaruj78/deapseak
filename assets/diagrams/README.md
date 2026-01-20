# 📐 Технічні схеми ліфтів

## Структура:

- `electrical/` - Електричні схеми (wiring diagrams)
- `brands/` - Схеми по брендах
  - `thyssen/` - ThyssenKrupp схеми
  - `otis/` - Otis схеми
  - `kone/` - Kone схеми
  - `schindler/` - Schindler схеми
  - `generic/` - Універсальні схеми
- `mechanical/` - Механічні креслення

## Формат файлів:

- **PDF** - основний формат для схем (A4 portrait)
- **PNG/SVG** - для швидкого перегляду
- **DWG** - AutoCAD файли (опційно)

## Як додавати нові схеми:

1. Конвертувати в PDF формат A4
2. Назва файлу: `brand-model-type.pdf` (наприклад: `thyssen-evolution200-wiring.pdf`)
3. Створити thumbnail: `brand-model-type-thumb.png` (300x200px)
4. Додати запис в `index.json`

## Приклад index.json:

```json
{
  "diagrams": [
    {
      "id": "thyssen-evolution200-wiring",
      "brand": "thyssen",
      "model": "Evolution 200",
      "type": "electrical",
      "title": "Evolution 200 Main Wiring Diagram",
      "description": "Complete electrical schematic for Evolution 200 controller",
      "path": "/assets/diagrams/brands/thyssen/evolution-200-wiring.pdf",
      "thumbnail": "/assets/diagrams/brands/thyssen/evolution-200-wiring-thumb.png",
      "tags": ["wiring", "controller", "3-phase"],
      "difficulty": "Advanced",
      "uploadedBy": "admin",
      "uploadedAt": "2026-01-20",
      "version": "1.0"
    }
  ]
}
```

## Категорії складності:

- **Beginner** - Базові схеми для навчання
- **Intermediate** - Стандартні робочі схеми
- **Advanced** - Складні системи, спеціальні конфігурації

## Теги (для пошуку):

- `wiring`, `controller`, `motor`, `brake`, `door`, `safety`, `emergency`
- `3-phase`, `inverter`, `encoder`, `limit-switch`, `sensor`
- `hydraulic`, `traction`, `mrl` (machine-room-less)

---

📝 **Останнє оновлення:** 20 січня 2026
