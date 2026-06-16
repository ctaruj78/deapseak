# FestLift — Правила для всіх агентів

> Цей файл ОБОВ'ЯЗКОВИЙ до прочитання перед будь-якою зміною.
> Правила застосовуються до всіх агентів: Claude, DeepSeek, Ollama.

## Стек
- Backend: Node.js + Express (`unified-server.js`)
- Database: MongoDB + Mongoose (`models/`)
- Auth: JWT (access 15хв + refresh 7 днів)
- AI в продакті: Google Gemini 2.5 Flash
- Frontend: Vanilla JS + HTML + CSS (БЕЗ фреймворків)
- Мова UI: **Португальська (PT-PT)** — завжди

## 4 ролі — перевіряти ВСІ після кожної зміни
- `pages/admin/` — адміністратор
- `pages/dispatcher/` — диспетчер
- `pages/technician/` — технік
- `pages/client/` — клієнт (Alexandra Couto та інші)

## Заборонено без явного дозволу
- Змінювати CSS / дизайн / кольори / layout
- Змінювати структуру sidebar
- Додавати нові функції поза задачею
- Міняти AI модель (`gemini-2.5-flash` — єдина)
- `alert()` в UI → тільки Toast notifications
- Хардкодити API ключі → тільки `process.env`
- Regex як єдиний парсер PDF

## Обов'язково
- Португальські символи: ã â á à ç é ê í ó ô ú ü
- Mongoose схеми з валідацією
- `lean()` для read-only запитів
- bcrypt мінімум 10 rounds
- Loading spinner для async операцій

## Головні файли
| Файл | Призначення |
|------|-------------|
| `unified-server.js` | Єдиний сервер |
| `services/pdf-parser-enhanced.js` | Парсинг PDF |
| `services/agentService.js` | AI агент чату |
| `models/` | MongoDB схеми |
| `assets/js/predictive-maintenance.js` | AI прогнози |

## Детальні правила
Дивись `COPILOT-RULES.md` для повного переліку.
