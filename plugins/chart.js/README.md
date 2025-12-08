# Chart.js - Локальна версія

**Версія:** 4.4.0 (UMD Build)  
**Дата встановлення:** 8 грудня 2025  
**Джерело:** https://www.chartjs.org/

## Файли

- `chart.umd.js` - Повна версія для розробки (201 KB)
- `chart.umd.min.js` - Мініфікована версія для продакшн (201 KB)

## Чому локальна версія?

✅ **Стабільність** - не залежить від доступності CDN  
✅ **Безпека** - не може бути змінено ззовні  
✅ **Швидкість** - завантажується з локального сервера  
✅ **Офлайн** - працює без інтернету  
✅ **Версія зафіксована** - ніяких breaking changes  

## Використання в HTML

```html
<!-- Для файлів у /pages/admin/, /pages/client/, /pages/dispatcher/ -->
<script src="../../plugins/chart.js/chart.umd.min.js"></script>

<!-- Для файлів у /pages/ -->
<script src="../plugins/chart.js/chart.umd.min.js"></script>

<!-- Для файлів у /assets/modules/ -->
<script src="../../plugins/chart.js/chart.umd.min.js"></script>
```

## Оновлення версії

Якщо потрібно оновити Chart.js:

```bash
cd /workspaces/deapseak/plugins/chart.js

# Завантажити нову версію (наприклад 4.5.0)
curl -L -o chart.umd.js "https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.js"
curl -L -o chart.umd.min.js "https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js"

# Оновити версію у цьому README.md
```

## Документація

- Офіційна документація: https://www.chartjs.org/docs/latest/
- GitHub: https://github.com/chartjs/Chart.js
- Release Notes: https://github.com/chartjs/Chart.js/releases

## Ліцензія

Chart.js розповсюджується під ліцензією MIT.
