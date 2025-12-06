# 🧪 Ручні Тести

Ця папка містить файли для ручного тестування функціоналу.

## 📄 HTML Тести

- `test-pdf-analysis.html` - Тестування аналізу PDF
- `test-pdf-upload.html` - Тестування завантаження PDF
- `test-settings.html` - Тестування налаштувань
- `test-performance-fixes.html` - Тестування оптимізацій

## 🔧 Shell Скрипти

- `test-all-system.sh` - Повне тестування системи
- `test-all-pages.sh` - Тестування всіх сторінок
- `test-all-roles.sh` - Тестування ролей користувачів
- `test-qr-system.sh` - Тестування QR системи
- `test-system-integration.sh` - Інтеграційні тести
- `system-test.sh` - Системні тести

## 📊 Тестові Дані

- `test-lifts-data.json` - Тестові дані ліфтів

## 🚀 Використання

```bash
# Запуск тестів
cd /workspaces/deapseak/tests/manual
bash test-all-system.sh

# Або відкрити HTML тести в браузері
```

## ℹ️ Примітка

Для автоматизованих тестів використовуйте Jest:
```bash
npm test
```
