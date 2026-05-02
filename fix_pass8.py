"""Pass 8: requests.html, assignments.html, and JS console messages."""
from pathlib import Path

TRANSLATIONS = [
    # ── Title/breadcrumb pattern ───────────────────────────────────────────────
    ('Pedidos на обслуговування', 'Pedidos de manutenção'),
    ('Novo pedido на обслуговування', 'Novo pedido de manutenção'),
    ('Editar заявку', 'Editar pedido'),
    ('Система pedidos', 'Sistema de pedidos'),
    ('Ініціалізація системи pedidos', 'Inicialização do sistema de pedidos'),

    # ── Stats cards  ──────────────────────────────────────────────────────────
    ('<span class="info-box-text">Всього</span>', '<span class="info-box-text">Total</span>'),
    ('<span class="info-box-text">Призначені</span>', '<span class="info-box-text">Atribuídos</span>'),
    ('<span class="info-box-text">Виконані</span>', '<span class="info-box-text">Concluídos</span>'),

    # ── Filter options ─────────────────────────────────────────────────────────
    ('<option value="emergency">Аварійні</option>', '<option value="emergency">Avarias</option>'),
    ('<option value="consultation">Консультação</option>', '<option value="consultation">Consulta</option>'),
    ('<option value="orcamento">Орсаменто</option>', '<option value="orcamento">Orçamento</option>'),
    ('<option value="assigned">Призначені</option>', '<option value="assigned">Atribuídos</option>'),
    ('<option value="">Всі пріоритети</option>', '<option value="">Todas as prioridades</option>'),
    ('<option value="">Всі техніки</option>', '<option value="">Todos os técnicos</option>'),
    ('<label>Технік:</label>', '<label>Técnico:</label>'),

    # ── Actions ────────────────────────────────────────────────────────────────
    ('<i class="fas fa-times"></i> Очистити', '<i class="fas fa-times"></i> Limpar'),
    ('<i class="fas fa-search"></i> Застосувати', '<i class="fas fa-search"></i> Aplicar'),
    ('Завантажується динамічно', 'Carregado dinamicamente'),

    # ── Archive mode ───────────────────────────────────────────────────────────
    ('Режим перегляду архіву.', 'Modo de visualização de arquivo.'),
    ('Показуються архівовані та скасовані pedidos (фальшиві виклики).',
     'São mostrados pedidos arquivados e cancelados (chamadas falsas).'),
    ('Повернутись до активних', 'Voltar aos activos'),

    # ── New request modal ──────────────────────────────────────────────────────
    ('<label for="requestLift">Ліфт *</label>', '<label for="requestLift">Elevador *</label>'),
    ('<option value="">Seleccione ліфт...</option>', '<option value="">Seleccione o elevador...</option>'),
    ('<label for="requestClient">Клієнт *</label>', '<label for="requestClient">Cliente *</label>'),
    ('<option value="">Seleccione клієнта...</option>', '<option value="">Seleccione o cliente...</option>'),
    ('Опції будуть завантажені динамічно', 'Opções serão carregadas dinamicamente'),
    ('<option value="emergency">🚨 Аварійна ситуація</option>', '<option value="emergency">🚨 Situação de emergência</option>'),
    ('<option value="consultation">💬 Консультація</option>', '<option value="consultation">💬 Consulta</option>'),
    ('<option value="orcamento">💰 Орсаменто</option>', '<option value="orcamento">💰 Orçamento</option>'),
    ('<option value="inspection">📋 Інспекція</option>', '<option value="inspection">📋 Inspecção</option>'),
    ('<label for="requestPriority">Пріоритет *</label>', '<label for="requestPriority">Prioridade *</label>'),
    ('<label for="requestScheduled">Запланована дата виконання</label>', '<label for="requestScheduled">Data de execução planeada</label>'),
    ('<label for="requestDescription">Опис проблеми *</label>', '<label for="requestDescription">Descrição do problema *</label>'),
    ('placeholder="Детально опишіть проблему або необхідні роботи...">',
     'placeholder="Descreva detalhadamente o problema ou trabalhos necessários...">'),
    ('<i class="fas fa-save"></i> Criar zaявку', '<i class="fas fa-save"></i> Criar pedido'),
    ('<i class="fas fa-save"></i> Criar pedido', '<i class="fas fa-save"></i> Criar pedido'),
    ('Criar zaявку', 'Criar pedido'),
    ('Criar заявку', 'Criar pedido'),
    ('<i class="fas fa-save"></i> Criar заявку', '<i class="fas fa-save"></i> Criar pedido'),

    # ── View request modal tabs ────────────────────────────────────────────────
    ('Опис проблеми', 'Descrição do problema'),
    ('Comentárioі', 'Comentários'),
    ('Хронологія', 'Cronologia'),
    ('Локація', 'Localização'),
    ('ID ліфта:', 'ID do elevador:'),
    ('Адреса não especificado', 'Endereço não especificado'),
    ('Adreса невідома', 'Endereço desconhecido'),
    ('Адреса невідома', 'Endereço desconhecido'),
    ('Comentárioів поки немає', 'Ainda sem comentários'),
    ('placeholder="Написати комен', 'placeholder="Escrever comen'),
    ('Дедлайн +', 'Prazo +'),
    ('Фальшивий виклик', 'Chamada falsa'),
    ('Restaurar із архіву', 'Restaurar do arquivo'),

    # ── Edit request modal ─────────────────────────────────────────────────────
    ('<label for="editRequestLift">Ліфт:</label>', '<label for="editRequestLift">Elevador:</label>'),
    ('<option value="">-- Вибір bloqueado --</option>', '<option value="">-- Seleção bloqueada --</option>'),
    ('Ліфт не можна змінити після створення', 'O elevador não pode ser alterado após a criação'),
    ('<option value="emergency">Аварія</option>', '<option value="emergency">Avaria</option>'),
    ('Тип не можна змінити', 'O tipo não pode ser alterado'),
    ('<label for="editRequestPriority">Пріоритет:</label>', '<label for="editRequestPriority">Prioridade:</label>'),
    ('<label for="editRequestTitle">Заголовок:</label>', '<label for="editRequestTitle">Título:</label>'),
    ('<label for="editRequestDescription">Опис проблеми:</label>', '<label for="editRequestDescription">Descrição do problema:</label>'),
    ('<label for="editScheduledAt">Planeado на:</label>', '<label for="editScheduledAt">Planeado para:</label>'),
    ('Можна обрати тільки поточну дату або майбутню', 'Pode seleccionar apenas a data actual ou futura'),
    ('Guardar зміни', 'Guardar alterações'),

    # ── JS console messages ────────────────────────────────────────────────────
    ("console.log('🎫 Ініціалізація системи pedidos...');",
     "console.log('🎫 Inicialização do sistema de pedidos...');"),
    ("// Завантажуємо ліфти з API", "// Carregar elevadores da API"),
    ("console.warn('⚠️ AuthManager не готовий або користувач не авторизований, використовую demo дані');",
     "console.warn('⚠️ AuthManager não pronto ou utilizador não autenticado, usando dados demo');"),
    ("console.log('📥 API відповідь:', result);",
     "console.log('📥 Resposta da API:', result);"),
    ("console.log('📊 Заявок recebido:', apiRequests.length);",
     "console.log('📊 Pedidos recebidos:', apiRequests.length);"),
    ("// Зберігаємо реальний MongoDB ID", "// Guardamos o ID real do MongoDB"),
    ("// Використовуємо req.type, а не status", "// Usamos req.type, não status"),
    ("console.log('✅ Завантажено pedidos з API:', this.requests.length);",
     "console.log('✅ Pedidos carregados da API:', this.requests.length);"),
    ("console.warn('⚠️ Inválido формат відповіді API, використовую demo дані');",
     "console.warn('⚠️ Formato inválido da resposta API, usando dados demo');"),
    ("console.warn('⚠️ API недоступний, використовую demo дані');",
     "console.warn('⚠️ API indisponível, usando dados demo');"),
    ("console.log('🔄 A carregar ліфтів для select...');",
     "console.log('🔄 A carregar elevadores para select...');"),
    ("console.error('❌ Користувач не авторизований');",
     "console.error('❌ Utilizador não autenticado');"),
    ("select.empty().append('<option value=\"\">Увійдіть в систему</option>');",
     "select.empty().append('<option value=\"\">Entre no sistema</option>');"),
    ("console.log('📡 Виклик API /api/lifts...');",
     "console.log('📡 Chamada API /api/lifts...');"),
    ("console.error('❌ Помилка авторизації при завантаженні ліфтів');",
     "console.error('❌ Erro de autenticação ao carregar elevadores');"),
    ("select.empty().append('<option value=\"\">Помилка авторизації</option>');",
     "select.empty().append('<option value=\"\">Erro de autenticação</option>');"),
    ("console.log('📥 Відповідь API (parsed):', data);",
     "console.log('📥 Resposta API (parsed):', data);"),
    ("console.error('❌ API повернув помилку:', data.message);",
     "console.error('❌ API retornou erro:', data.message);"),
    ("select.empty().append('<option value=\"\">Немає доступних ліфтів</option>');",
     "select.empty().append('<option value=\"\">Sem elevadores disponíveis</option>');"),
    ("select.empty().append('<option value=\"\">Seleccione ліфт...</option>');",
     "select.empty().append('<option value=\"\">Seleccione o elevador...</option>');"),

    # ── Demo data strings ──────────────────────────────────────────────────────
    ("'Ліфт не a funcionar'", "'Elevador avariado'"),
    ("'Ліфт зупинився між pisoами, всередині знаходиться людина'",
     "'Elevador parado entre pisos, há pessoa no interior'"),
    ("'Заявку criado'", "'Pedido criado'"),
    ("'Адміністратор'", "'Administrador'"),
    ("'Щомісячне manutenção técnica згідно з gráficoом'",
     "'Manutenção técnica mensal conforme planeado'"),
    ("'Призначено техніка Петров І.В.'", "'Técnico Petrov I.V. atribuído'"),
    ("'Диспетчер'", "'Despachante'"),
    ("'Reparação дверей'", "'Reparação das portas'"),
    ("'Двері ліфта не закриваються повністю, потрібна заміна сенсора'",
     "'As portas do elevador não fecham completamente, é necessário substituir o sensor'"),
    ("'Заявку criado диспетчером'", "'Pedido criado pelo despachante'"),
    ("'Призначено техніка Сидоров П.П.'", "'Técnico Sidorov P.P. atribuído'"),
    ("'Технік розпочав роботу'", "'Técnico iniciou trabalho'"),
    ("'Planeada інспекція'", "'Inspecção planeada'"),
    ("'Квартальна інспекція безпеки та технічного стану'",
     "'Inspecção trimestral de segurança e estado técnico'"),
    ("'Призначено техніка Козлов А.А.'", "'Técnico Kozlov A.A. atribuído'"),
    ("'Розпоchatо інспекцію'", "'Inspecção iniciada'"),
    ("'Інспекцію concluído успішно'", "'Inspecção concluída com sucesso'"),

    # ── Direct type map ────────────────────────────────────────────────────────
    ("maintenance: 'ТО', repair: 'Reparação', inspection: 'Інспекція', consultation: 'Консультація'",
     "maintenance: 'IT', repair: 'Reparação', inspection: 'Inspecção', consultation: 'Consulta'"),
    ("inspection: 'Інспекція'", "inspection: 'Inspecção'"),
    ("consultation: 'Консультація'", "consultation: 'Consulta'"),
    ("'Інспекція'", "'Inspecção'"),
    ("'Консультація'", "'Consulta'"),

    # ── More JS comments ──────────────────────────────────────────────────────
    ("'Без назви'", "'Sem título'"),
    ("'Без опису'", "'Sem descrição'"),
    ("// Зберігаємо оригінальні дані", "// Guardamos os dados originais"),
    ("'nevідома помилка'", "'erro desconhecido'"),
    ("'невідома помилка'", "'erro desconhecido'"),

    # ── Notifications dropdown ─────────────────────────────────────────────────
    ('Аварія ліфта', 'Avaria do elevador'),
    ('хв тому', 'min atrás'),
    ('год тому', 'h atrás'),
    ('дн тому', 'd atrás'),
    ('Всі сповіщення', 'Todas as notificações'),

    # ── Generic ───────────────────────────────────────────────────────────────
    ('Завантажується динамічно', 'Carregado dinamicamente'),
    ('Детально опишіть проблему або необхідні роботи',
     'Descreva detalhadamente o problema ou os trabalhos necessários'),
    ('Opção вибір ліфта', 'Opção de selecção do elevador'),
    ('Seleccione ліфт...', 'Seleccione o elevador...'),
    ('Seleccione клієнта...', 'Seleccione o cliente...'),

    # ── More sidebar/nav items ─────────────────────────────────────────────────
    ('<p>AR Помічник</p>', '<p>Auxiliar AR</p>'),
    ('AR помічник', 'Auxiliar AR'),
    ('<p>Звіти робіт</p>', '<p>Relatórios de trabalho</p>'),
    ('<p>Розклад</p>', '<p>Agenda</p>'),

    # ── Assignments page specific ─────────────────────────────────────────────
    ('Система призначень', 'Sistema de atribuições'),
    ('Призначення техніків', 'Atribuição de técnicos'),
    ('Список призначень', 'Lista de atribuições'),
    ('Додати призначення', 'Adicionar atribuição'),
    ('Редагувати призначення', 'Editar atribuição'),
    ('Видалити призначення', 'Eliminar atribuição'),
    ('Статус призначення', 'Estado da atribuição'),
    ('Черга призначень', 'Fila de atribuições'),
    ('Незаплановані', 'Não planeados'),
    ('Заплановані', 'Planeados'),
    ('Сортування', 'Ordenação'),
    ('сортування', 'ordenação'),
    ('Сортувати за', 'Ordenar por'),
    ('за датою', 'por data'),
    ('за пріоритетом', 'por prioridade'),
    ('за технікою', 'por técnico'),
    ('Доставка', 'Entrega'),
    ('доставка', 'entrega'),

    # ── Lifts page specific (remaining) ───────────────────────────────────────
    ('Ліфт не a funcionar', 'Elevador avariado'),
    ('між pisoами', 'entre pisos'),
    ('Ліфт зупинився', 'Elevador parado'),

    # ── Breadcrumb / title hybrid ─────────────────────────────────────────────
    ('<title>Pedidos на обслуговування - FestLift</title>',
     '<title>Pedidos de manutenção - FestLift</title>'),
    ('<h1><i class="fas fa-clipboard-list mr-2"></i>Pedidos на обслуговування</h1>',
     '<h1><i class="fas fa-clipboard-list mr-2"></i>Pedidos de manutenção</h1>'),
    ('<li class="breadcrumb-item active">Pedidos на обслуговування</li>',
     '<li class="breadcrumb-item active">Pedidos de manutenção</li>'),

    # ── Reports section in liftcard ────────────────────────────────────────────
    ('A mostrar <span id="reports-showing">0</span> з <span id="reports-total">0</span>',
     'A mostrar <span id="reports-showing">0</span> de <span id="reports-total">0</span>'),
    ('Увійдіть в систему', 'Entre no sistema'),
    ('Немає доступних ліфтів', 'Sem elevadores disponíveis'),
    ('Помилка авторизації', 'Erro de autenticação'),
    ('Користувач не авторизований', 'Utilizador não autenticado'),
]

# Deduplicate
seen = set()
DEDUP = []
for pair in TRANSLATIONS:
    if pair[0] not in seen:
        seen.add(pair[0])
        DEDUP.append(pair)

def process_file(path):
    txt = path.read_text(encoding='utf-8')
    original = txt
    for old, new in DEDUP:
        if old in txt:
            txt = txt.replace(old, new)
    if txt != original:
        path.write_text(txt, encoding='utf-8')
        return True
    return False

base = __import__('pathlib').Path('/workspaces/deapseak/pages')
for panel in ['admin', 'dispatcher', 'tech']:
    changed = skipped = 0
    for f in sorted((base / panel).glob('*.html')):
        if process_file(f):
            changed += 1
        else:
            skipped += 1
    print(f'{panel}: {changed} files updated, {skipped} unchanged')
print('Done.')
