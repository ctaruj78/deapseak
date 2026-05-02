"""Pass 27: pages/admin/admin-dashboard.html - translate remaining Ukrainian."""
from pathlib import Path

TRANSLATIONS = [
    ('<html lang="uk">', '<html lang="pt">'),
    ('<title>Адмін-панель - FestLift</title>',
     '<title>Painel admin - FestLift</title>'),
    # comment
    ('<!-- Global Settings - ПЕРШЕ що завантажується -->',
     '<!-- Global Settings - First to load -->'),
    ('<!-- Chart.js ЛОКАЛЬНИЙ -->', '<!-- Chart.js LOCAL -->'),
    # content header
    ('<h1 class="m-0">Адмін дашборд</h1>',
     '<h1 class="m-0">Dashboard de administrador</h1>'),
    ('<li class="breadcrumb-item active">Дашборд</li>',
     '<li class="breadcrumb-item active">Dashboard</li>'),
    # stat cards
    ('<p>Користувачів</p>', '<p>Utilizadores</p>'),
    ('<p>Ліфтів</p>', '<p>Elevadores</p>'),
    ('<p>Активних pedidos</p>', '<p>Pedidos activos</p>'),
    ('<p>Доходів (грн)</p>', '<p>Receitas (€)</p>'),
    # quick actions
    ('<p class="text-muted small mb-0">Створити novo conta</p>',
     '<p class="text-muted small mb-0">Criar nova conta</p>'),
    ('<p class="text-muted small mb-0">Додати або редагувати ліфти</p>',
     '<p class="text-muted small mb-0">Adicionar ou editar elevadores</p>'),
    ('<h6>Аналітика</h6>', '<h6>Análise</h6>'),
    ('<p class="text-muted small mb-0">Єдина sistema аналітики та звітів</p>',
     '<p class="text-muted small mb-0">Sistema unificado de análise e relatórios</p>'),
    ('<p class="text-muted small mb-0">Конфігурація системи</p>',
     '<p class="text-muted small mb-0">Configuração do sistema</p>'),
    # recent actions
    ('<h3 class="card-title">Останні ações</h3>',
     '<h3 class="card-title">Últimas acções</h3>'),
    ('<h6 class="mt-0 mb-1">Novo utilizador зареєстрований</h6>',
     '<h6 class="mt-0 mb-1">Novo utilizador registado</h6>'),
    ('<small class="text-muted">2 хвилини тому</small>',
     '<small class="text-muted">há 2 minutos</small>'),
    ('<h6 class="mt-0 mb-1">Pedido на ТО завершена</h6>',
     '<h6 class="mt-0 mb-1">Pedido de manutenção concluído</h6>'),
    ('<small class="text-muted">15 хвилин тому</small>',
     '<small class="text-muted">há 15 minutos</small>'),
    ('<h6 class="mt-0 mb-1">Ліфт додано до системи</h6>',
     '<h6 class="mt-0 mb-1">Elevador adicionado ao sistema</h6>'),
    ('<small class="text-muted">1 horasа тому</small>',
     '<small class="text-muted">há 1 hora</small>'),
    # system status
    ('<span class="info-box-text">Estado сервера</span>',
     '<span class="info-box-text">Estado do servidor</span>'),
    ('<span class="info-box-number">Онлайн</span>',
     '<span class="info-box-number">Online</span>'),
    ('<span class="info-box-text">База даних</span>',
     '<span class="info-box-text">Base de dados</span>'),
    # JS
    ("// 🔥 ПІДКЛЮЧЕНО ДО РЕАЛЬНОГО API", "// 🔥 CONNECTED TO REAL API"),
    ("// Шукаємо токен в різних місцях", "// Searching for token in various places"),
    ("// Спроба 1: A carregar через API", "// Attempt 1: Load via API"),
    ("// API повертає {success: true, data: {...}}", "// API returns {success: true, data: {...}}"),
    ("return; // Успішно завантажено", "return; // Loaded successfully"),
    ("// Спроба 2: Публічний endpoint (без токена)", "// Attempt 2: Public endpoint (without token)"),
    ("// Спроба 2: Пряме завантаження з бази через окремі endpoints",
     "// Attempt 2: Direct load from DB via separate endpoints"),
    ("// Inicialização після завантаження сторінки", "// Initialization after page load"),
    ("console.log('🚀 Admin Dashboard завантажено');",
     "console.log('🚀 Admin Dashboard loaded');"),
    ("// Показуємо ім'я користувача (якщо є стара сесія)",
     "// Show username (if old session exists)"),
    ("console.warn('Не вдалось розпарсити сесію');",
     "console.warn('Failed to parse session');"),
    ("// 🆕 A carregar dados з API", "// 🆕 Loading data from API"),
    ("// Функція виходу", "// Logout function"),
    ("console.log('✅ AuthManager завантажено')",
     "console.log('✅ AuthManager loaded')"),
    ("console.log('✅ WebSocket Client завантажено')",
     "console.log('✅ WebSocket Client loaded')"),
]

TARGET = Path("pages/admin/admin-dashboard.html")

def main():
    if not TARGET.exists():
        print(f"❌ File not found: {TARGET}"); return
    content = TARGET.read_text(encoding="utf-8")
    orig = content; n = 0
    for old, new in TRANSLATIONS:
        if old in content:
            content = content.replace(old, new, 1); n += 1
            print(f"✅ {old[:70]}")
        else:
            print(f"⚠️  NOT FOUND: {old[:70]}")
    if content != orig:
        TARGET.write_text(content, encoding="utf-8")
        print(f"\n🎉 Pass 27: {n}/{len(TRANSLATIONS)} replacements in {TARGET}")
    else:
        print(f"⚠️ No changes in {TARGET}")

if __name__ == "__main__":
    main()
