"""Pass 23: system-settings.html - повний переклад UI та JS коментарів."""
from pathlib import Path

TRANSLATIONS = [
    # ── HTML: lang & title ────────────────────────────────────────────────────
    ('<html lang="uk">', '<html lang="pt">'),
    ('<title>⚙️ Налаштування системи</title>', '<title>⚙️ Configurações do sistema</title>'),

    # ── Content Header ────────────────────────────────────────────────────────
    ('<h1 class="m-0">⚙️ Налаштування системи</h1>', '<h1 class="m-0">⚙️ Configurações do sistema</h1>'),
    ('<li class="breadcrumb-item"><a href="pages/admin/lifts.html">Головна</a></li>',
     '<li class="breadcrumb-item"><a href="pages/admin/lifts.html">Início</a></li>'),
    ('<li class="breadcrumb-item active">Налаштування</li>',
     '<li class="breadcrumb-item active">Configurações</li>'),

    # ── AR Helper Section ─────────────────────────────────────────────────────
    ('<h3 class="card-title">🥽 AR Helper (Доповнена реальність)</h3>',
     '<h3 class="card-title">🥽 AR Helper (Realidade aumentada)</h3>'),
    ('<span id="ar-status-badge" class="badge badge-secondary">Завантаження...</span>',
     '<span id="ar-status-badge" class="badge badge-secondary">A carregar...</span>'),
    ('<h5>Активувати AR Helper</h5>', '<h5>Activar AR Helper</h5>'),
    ('AR Helper додає функції доповненої реальності для:',
     'O AR Helper adiciona funções de realidade aumentada para:'),
    ('<li>🔍 Інтерактивного сканування QR кодів</li>',
     '<li>🔍 Digitalização interactiva de códigos QR</li>'),
    ('<li>📋 Допомоги під час інспекцій ліфтів</li>',
     '<li>📋 Ajuda durante inspecções de elevadores</li>'),
    ('<li>🎯 Візуалізації інформації про ліфти</li>',
     '<li>🎯 Visualização de informações sobre elevadores</li>'),
    ('<li>📱 Роботи з камерою та відео</li>',
     '<li>📱 Trabalho com câmara e vídeo</li>'),
    ('<h6><i class="fas fa-info-circle"></i> Примітка:</h6>',
     '<h6><i class="fas fa-info-circle"></i> Nota:</h6>'),
    ('AR Helper потребує доступу до камери пристрою. При першому використанні браузер запитає дозвіл на використання камери.',
     'O AR Helper requer acesso à câmara do dispositivo. Na primeira utilização, o browser pedirá permissão para usar a câmara.'),
    ('<h6>Стан AR Helper</h6>', '<h6>Estado do AR Helper</h6>'),
    ('<span class="status-badge bg-secondary">Перевіряємо...</span>',
     '<span class="status-badge bg-secondary">A verificar...</span>'),
    ('<i class="fas fa-play"></i> Тест AR', '<i class="fas fa-play"></i> Testar AR'),

    # ── Voice Control Section ─────────────────────────────────────────────────
    ('<h3 class="card-title">🔊 Голосове управління</h3>',
     '<h3 class="card-title">🔊 Controlo por voz</h3>'),
    ('<h6>Увімкнути голосове управління</h6>',
     '<h6>Activar controlo por voz</h6>'),
    ('<small class="text-muted">Керування системою голосом</small>',
     '<small class="text-muted">Controlo do sistema por voz</small>'),

    # ── Smart System Section ──────────────────────────────────────────────────
    ('<h3 class="card-title">🧠 Smart Система</h3>',
     '<h3 class="card-title">🧠 Sistema inteligente</h3>'),
    ('<span id="smart-status-badge" class="badge badge-secondary">Завантаження...</span>',
     '<span id="smart-status-badge" class="badge badge-secondary">A carregar...</span>'),
    ('<h6>Активувати Smart систему</h6>',
     '<h6>Activar sistema inteligente</h6>'),
    ('<small class="text-muted">Розумні алгоритми та автоматизація</small>',
     '<small class="text-muted">Algoritmos inteligentes e automação</small>'),
    ('<h6>Можливості Smart системи:</h6>',
     '<h6>Funcionalidades do sistema inteligente:</h6>'),
    ('<li>🤖 Автоматичне планування обслуговування</li>',
     '<li>🤖 Planeamento automático de manutenção</li>'),
    ('<li>📈 Прогнозна аналітика</li>',
     '<li>📈 Análise preditiva</li>'),
    ('<li>⚡ Оптимізація роботи ліфтів</li>',
     '<li>⚡ Optimização do funcionamento dos elevadores</li>'),
    ('<li>🔔 Розумні сповіщення</li>',
     '<li>🔔 Notificações inteligentes</li>'),
    ('<li>📊 Адаптивна аналітика поведінки</li>',
     '<li>📊 Análise adaptativa de comportamento</li>'),
    ('<strong>Примітка:</strong> Smart система використовує машинне навчання для покращення роботи всіх підсистем.',
     '<strong>Nota:</strong> O sistema inteligente utiliza aprendizagem automática para melhorar o funcionamento de todos os subsistemas.'),

    # ── Analytics Section ─────────────────────────────────────────────────────
    ('<h3 class="card-title">📊 Аналітика</h3>',
     '<h3 class="card-title">📊 Análise</h3>'),
    ('<h6>Збирати статистику використання</h6>',
     '<h6>Recolher estatísticas de utilização</h6>'),
    ('<small class="text-muted">Для покращення сервісу</small>',
     '<small class="text-muted">Para melhorar o serviço</small>'),

    # ── Notifications Section ─────────────────────────────────────────────────
    ('<h3 class="card-title">🔔 Сповіщення</h3>',
     '<h3 class="card-title">🔔 Notificações</h3>'),
    ('<h6>Push сповіщення</h6>', '<h6>Notificações push</h6>'),
    ('<small class="text-muted">Сповіщення у браузері</small>',
     '<small class="text-muted">Notificações no browser</small>'),
    ('<h6>Звукові сповіщення</h6>', '<h6>Notificações sonoras</h6>'),
    ('<small class="text-muted">Звуки при подіях</small>',
     '<small class="text-muted">Sons em eventos</small>'),
    ('<h6>Email сповіщення</h6>', '<h6>Notificações por email</h6>'),
    ('<small class="text-muted">Надсилати на пошту</small>',
     '<small class="text-muted">Enviar para o email</small>'),

    # ── Lifts Management Section ──────────────────────────────────────────────
    ('<h3 class="card-title">🏢 Налаштування управління ліфтами</h3>',
     '<h3 class="card-title">🏢 Configurações de gestão de elevadores</h3>'),
    ('<label for="auto-refresh-interval">🔄 Автооновлення списку ліфтів (секунди)</label>',
     '<label for="auto-refresh-interval">🔄 Actualização automática da lista de elevadores (segundos)</label>'),
    ('<span class="input-group-text">сек</span>',
     '<span class="input-group-text">seg</span>'),
    ('<small class="text-muted">Інтервал оновлення даних ліфтів (5-300 секунд)</small>',
     '<small class="text-muted">Intervalo de actualização dos dados dos elevadores (5-300 segundos)</small>'),
    ('<label for="lifts-per-page">📄 Ліфтів на сторінку</label>',
     '<label for="lifts-per-page">📄 Elevadores por página</label>'),
    ('<option value="10">10 ліфтів</option>',
     '<option value="10">10 elevadores</option>'),
    ('<option value="25" selected>25 ліфтів</option>',
     '<option value="25" selected>25 elevadores</option>'),
    ('<option value="50">50 ліфтів</option>',
     '<option value="50">50 elevadores</option>'),
    ('<option value="100">100 ліфтів</option>',
     '<option value="100">100 elevadores</option>'),
    ('<small class="text-muted">Кількість ліфтів для відображення на одній сторінці</small>',
     '<small class="text-muted">Número de elevadores a mostrar por página</small>'),
    ('<h6>📊 Показувати статистику в реальному часі</h6>',
     '<h6>📊 Mostrar estatísticas em tempo real</h6>'),
    ('<small class="text-muted">Відображення live метрик ліфтів</small>',
     '<small class="text-muted">Exibição de métricas ao vivo dos elevadores</small>'),
    ('<h6>🔍 Автопошук при вводі</h6>',
     '<h6>🔍 Pesquisa automática durante escrita</h6>'),
    ('<small class="text-muted">Пошук ліфтів під час набору тексту</small>',
     '<small class="text-muted">Pesquisa de elevadores durante a escrita</small>'),
    ('<h6>⚠️ Автоповідомлення про проблеми</h6>',
     '<h6>⚠️ Alertas automáticos sobre problemas</h6>'),
    ('<small class="text-muted">Автоматичні повідомлення про поломки</small>',
     '<small class="text-muted">Notificações automáticas sobre avarias</small>'),
    ('<h6>💾 Автозбереження змін</h6>',
     '<h6>💾 Gravação automática de alterações</h6>'),
    ('<small class="text-muted">Зберігати зміни автоматично</small>',
     '<small class="text-muted">Guardar alterações automaticamente</small>'),

    # ── Save Settings Buttons ─────────────────────────────────────────────────
    ('<i class="fas fa-save"></i> Зберегти всі налаштування',
     '<i class="fas fa-save"></i> Guardar todas as configurações'),
    ('<i class="fas fa-undo"></i> Скинути до замовчувань',
     '<i class="fas fa-undo"></i> Repor predefinições'),
    ('<i class="fas fa-download"></i> Експорт налаштувань',
     '<i class="fas fa-download"></i> Exportar configurações'),

    # ── JavaScript Comments & Strings ─────────────────────────────────────────
    ("// Система управління налаштуваннями",
     "// Sistema de gestão de configurações"),
    ("console.log('⚙️ Ініціалізація налаштувань...');",
     "console.log('⚙️ A inicializar configurações...');"),
    ("// Налаштування ліфтів",
     "// Configurações de elevadores"),
    ("console.log('✅ Налаштування збережено:', this.settings);",
     "console.log('✅ Configurações guardadas:', this.settings);"),
    ("// Завантажуємо стан перемикачів",
     "// Carregar estado dos interruptores"),
    ("// Завантажуємо числові поля",
     "// Carregar campos numéricos"),
    ("// Перемикачі налаштувань ліфтів",
     "// Interruptores de configurações de elevadores"),
    ("console.log('🥽 Увімкнення AR Helper...');",
     "console.log('🥽 A activar AR Helper...');"),
    ("console.log('🥽 Вимкнення AR Helper...');",
     "console.log('🥽 A desactivar AR Helper...');"),
    ("this.showNotification('✅ AR Helper увімкнено!', 'success');",
     "this.showNotification('✅ AR Helper activado!', 'success');"),
    ("this.showNotification('⚠️ AR Helper буде активний після перезавантаження сторінки', 'warning');",
     "this.showNotification('⚠️ O AR Helper estará activo após recarregar a página', 'warning');"),
    ("this.showNotification('AR Helper вимкнено', 'info');",
     "this.showNotification('AR Helper desactivado', 'info');"),
    ("this.showNotification('AR Helper буде вимкнений після перезавантаження сторінки', 'info');",
     "this.showNotification('O AR Helper será desactivado após recarregar a página', 'info');"),
    ("this.showNotification('🧪 Запуск тесту AR Helper...', 'info');",
     "this.showNotification('🧪 A iniciar teste do AR Helper...', 'info');"),
    ("// Перевіряємо чи AR доступний",
     "// Verificar se AR está disponível"),
    ("// Тестуємо AR функції",
     "// Testar funções AR"),
    ("this.showNotification('✅ AR Helper ініціалізований та готовий до роботи!', 'success');",
     "this.showNotification('✅ AR Helper inicializado e pronto a usar!', 'success');"),
    ("// Опціонально запускаємо короткий тест",
     "// Opcionalmente iniciar teste curto"),
    ("this.showNotification('📱 Перевірка камери та AR функцій...', 'info');",
     "this.showNotification('📱 A verificar câmara e funções AR...', 'info');"),
    ("this.showNotification('🎉 AR Helper працює коректно!', 'success');",
     "this.showNotification('🎉 AR Helper a funcionar correctamente!', 'success');"),
    ("this.showNotification('⚠️ AR Helper завантажується...', 'warning');",
     "this.showNotification('⚠️ AR Helper a carregar...', 'warning');"),
    ("this.showNotification('❌ Помилка тестування AR: ' + error.message, 'warning');",
     "this.showNotification('❌ Erro ao testar AR: ' + error.message, 'warning');"),
    ("this.showNotification('🔄 AR Helper ініціалізується. Спробуйте через кілька секунд.', 'info');",
     "this.showNotification('🔄 AR Helper a inicializar. Tente novamente dentro de alguns segundos.', 'info');"),
    ("this.showNotification('❌ AR Helper вимкнено. Увімкніть його спочатку.', 'warning');",
     "this.showNotification('❌ AR Helper desactivado. Active-o primeiro.', 'warning');"),
    ("// Створюємо toast notification",
     "// Criar notificação toast"),
    ("this.showNotification('✅ Всі налаштування збережено!', 'success');",
     "this.showNotification('✅ Todas as configurações guardadas!', 'success');"),
    ("if (confirm('Скинути всі налаштування до замовчувань?')) {",
     "if (confirm('Repor todas as configurações para as predefinições?')) {"),
    ("// Перевіряємо підтримку камери",
     "// Verificar suporte de câmara"),
    ("'Підтримується'", "'Suportado'"),
    ("'Обмежена підтримка'", "'Suporte limitado'"),
    ("'Не підтримується'", "'Não suportado'"),
    ('<span class="status-badge bg-success">✅ Увімкнено</span>',
     '<span class="status-badge bg-success">✅ Activado</span>'),
    ('<span class="status-badge bg-secondary">⏸️ Вимкнено</span>',
     '<span class="status-badge bg-secondary">⏸️ Desactivado</span>'),
    ("'✅ Активна'", "'✅ Activo'"),
    ("this.showNotification('🧠 Smart система активована!', 'success');",
     "this.showNotification('🧠 Sistema inteligente activado!', 'success');"),
    ("'⏸️ Неактивна'", "'⏸️ Inactivo'"),
    ("this.showNotification('🧠 Smart система вимкнута', 'info');",
     "this.showNotification('🧠 Sistema inteligente desactivado', 'info');"),
    ("// Викликаємо глобальну функцію увімкнення AR",
     "// Chamar função global de activação do AR"),
    ("// Викликаємо глобальну функцію вимкнення AR",
     "// Chamar função global de desactivação do AR"),
    ("// Global functions", "// Funções globais"),
    ("// Ініціалізуємо при завантаженні",
     "// Inicializar ao carregar"),
]

TARGET = Path("pages/system-settings.html")


def main():
    if not TARGET.exists():
        print(f"❌ File not found: {TARGET}")
        return

    content = TARGET.read_text(encoding="utf-8")
    original_content = content
    replaced_count = 0

    for old, new in TRANSLATIONS:
        if old in content:
            content = content.replace(old, new, 1)  # replace one at time
            replaced_count += 1
            print(f"✅ {old[:60]:<60} → {new[:60]}")

    if content != original_content:
        TARGET.write_text(content, encoding="utf-8")
        print(f"\n🎉 Pass 23 complete! {replaced_count}/{len(TRANSLATIONS)} replacements applied to {TARGET}")
    else:
        print(f"\n⚠️ No changes were made to {TARGET}")


if __name__ == "__main__":
    main()
