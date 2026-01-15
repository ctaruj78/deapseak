# 🇵🇹 Звіт Локалізації під Португалію

**Дата:** 2026-01-11 11:56:24  
**Скрипт:** localize-portugal.sh

---

## 🌍 Зміни Локалізації

### 1. Мова інтерфейсу:
- `lang="uk"` → `lang="pt"`
- Українські тексти → Португальські

### 2. Міста (демо-дані):
| До | Після |
|----|-------|
| 🇺🇦 Київ | 🇵🇹 Lisboa |
| 🇺🇦 Львів | 🇵🇹 Porto |
| 🇺🇦 Одеса | 🇵🇹 Coimbra |
| 🇺🇦 Харків | 🇵🇹 Braga |
| 🇺🇦 Дніпро | 🇵🇹 Faro |

### 3. Адреси:
- "Київська 25" → "Rua Augusta 25"
- "Львівська 100" → "Avenida da Liberdade 100"
- "Хрещатик 1" → "Praça do Comércio 1"

### 4. Email домени:
- `@festlift.pt` → `@festlift.pt`
- `@liftmaster.com` → `@festlift.pt`

### 5. Країна:
- "Ukraine" / "Україна" → "Portugal"

---

## 📊 Статистика

- ✅ **Оновлено:** 142 файлів/записів
- ⏭️  **Пропущено:** 1 файлів (без змін)

---

## 📁 Backup

Створено backup:  
`backup/pre-localization-20260111_115604`

---

## 🎯 Переклади UI

| Українська | Португальська |
|------------|---------------|
| Активний | Ativo |
| Аналітика | Análise |
| В роботі | Em progresso |
| Видалити | Eliminar |
| Вихід | Sair |
| Всі права захищені | Todos os direitos reservados |
| Вулиця | Rua |
| Дніпро | Faro |
| Додати | Adicionar |
| Експорт | Exportar |
| Завершено | Concluído |
| Запити | Pedidos |
| Зберегти | Guardar |
| Керування | Gestão |
| Київ | Lisboa |
| Користувачі | Utilizadores |
| Львів | Porto |
| Ліфти | Elevadores |
| Налаштування | Configurações |
| Неактивний | Inativo |
| Одеса | Coimbra |
| Очікує | Pendente |
| Панель адміністратора | Painel de administrador |
| Панель керування | Painel de controlo |
| Панель техніка | Painel de técnico |
| Пошук | Pesquisar |
| Проспект | Avenida |
| Профіль | Perfil |
| Підтримка | Suporte |
| Редагувати | Editar |
| Система управління | Sistema de gestão |
| Скасувати | Cancelar |
| Фільтр | Filtro |
| Харків | Braga |
| вул. | Rua |
| проспект | Avenida |

---

## ✅ Наступні кроки

1. Перевірте зміни: `git diff`
2. Тестуйте систему: `./test-navigation.sh`
3. Перевірте базу: `mongosh deapseak --eval "db.lifts.distinct('address.city')"`
4. Закомітьте: `git add . && git commit -m '🇵🇹 Локалізація під Португалію'`

