"""Pass 19: assignments.html and requests.html specific patterns."""
from pathlib import Path

TRANSLATIONS = [
    # ── Title ─────────────────────────────────────────────────────────────────
    ("<title>Диспетчер - Управління призначеннями</title>",
     "<title>Despachante - Gestão de atribuições</title>"),
    ("<h1>Управління призначеннями</h1>",
     "<h1>Gestão de atribuições</h1>"),

    # ── Stats labels ──────────────────────────────────────────────────────────
    ("<div class=\"stat-label\">Всього призначень</div>",
     "<div class=\"stat-label\">Total de atribuições</div>"),
    ("<div class=\"stat-label\">Активні</div>",
     "<div class=\"stat-label\">Activos</div>"),
    ("<div class=\"stat-label\">Завершені</div>",
     "<div class=\"stat-label\">Concluídos</div>"),
    ("<div class=\"stat-label\">Протерміновані</div>",
     "<div class=\"stat-label\">Em atraso</div>"),

    # ── Filter options ────────────────────────────────────────────────────────
    ("<option value=\"pending\">В очікуванні</option>",
     "<option value=\"pending\">Pendente</option>"),
    ("<option value=\"cancelled\">Скасовані</option>",
     "<option value=\"cancelled\">Cancelados</option>"),
    ("<option value=\"week\">Цей semana</option>",
     "<option value=\"week\">Esta semana</option>"),
    ("<option value=\"month\">Цей місяць</option>",
     "<option value=\"month\">Este mês</option>"),
    ("<option value=\"all\">Весь період</option>",
     "<option value=\"all\">Todo o período</option>"),

    # ── Buttons ───────────────────────────────────────────────────────────────
    ("<i class=\"fas fa-calendar\"></i> Календар",
     "<i class=\"fas fa-calendar\"></i> Calendário"),
    ("<i class=\"fas fa-archive\"></i> Архів",
     "<i class=\"fas fa-archive\"></i> Arquivo"),
    ("<!-- Перегляд -->", "<!-- Vista -->"),
    ("<i class=\"fas fa-th\"></i> Сітка",
     "<i class=\"fas fa-th\"></i> Grelha"),
    ("<!-- Atribuições будуть завантажені тут -->",
     "<!-- As atribuições serão carregadas aqui -->"),
    ("A mostrar <span id=\"shownCount\">0</span> de <span id=\"totalCount\">0</span> призначень",
     "A mostrar <span id=\"shownCount\">0</span> de <span id=\"totalCount\">0</span> atribuições"),
    ("<span class=\"btn btn-default\">Стор. <span id=\"currentPage\">1</span></span>",
     "<span class=\"btn btn-default\">Pág. <span id=\"currentPage\">1</span></span>"),

    # ── Quick actions ─────────────────────────────────────────────────────────
    ("<!-- Швидкі ações -->", "<!-- Acções rápidas -->"),
    ("<h3 class=\"card-title\">Швидкі ações</h3>",
     "<h3 class=\"card-title\">Acções rápidas</h3>"),
    ("<i class=\"fas fa-plus\"></i> Нове призначення",
     "<i class=\"fas fa-plus\"></i> Nova atribuição"),
    ("<i class=\"fas fa-users\"></i> Масове призначення",
     "<i class=\"fas fa-users\"></i> Atribuição em massa"),
    ("<i class=\"fas fa-sync\"></i> Reatribuir протерміновані",
     "<i class=\"fas fa-sync\"></i> Reatribuir em atraso"),
    ("<i class=\"fas fa-chart-bar\"></i> Звіт продуктивності",
     "<i class=\"fas fa-chart-bar\"></i> Relatório de produtividade"),

    # ── Assignment modal ──────────────────────────────────────────────────────
    ("<!-- Модальне вікно призначення -->", "<!-- Janela de atribuição -->"),
    ("<h5 class=\"modal-title\">Gestão призначенням</h5>",
     "<h5 class=\"modal-title\">Gestão de atribuição</h5>"),
    ("<!-- Вміст модального вікна -->", "<!-- Conteúdo da janela modal -->"),
    ("<!-- Модальне вікно перегляду деталей призначення -->",
     "<!-- Janela de detalhes da atribuição -->"),
    ("<h5 class=\"modal-title mb-0\">Detalhes запиту <span id=\"modalRequestNumber\" class=\"font-weight-bold\"></span></h5>",
     "<h5 class=\"modal-title mb-0\">Detalhes do pedido <span id=\"modalRequestNumber\" class=\"font-weight-bold\"></span></h5>"),
    ("<!-- Опис завжди видно -->", "<!-- Descrição sempre visível -->"),
    ("<i class=\"fas fa-user mr-1\"></i>Клієнт",
     "<i class=\"fas fa-user mr-1\"></i>Cliente"),
    ("<i class=\"fas fa-map mr-1\"></i>Карта",
     "<i class=\"fas fa-map mr-1\"></i>Mapa"),
    ("<p class=\"text-muted text-center py-3\"><i class=\"fas fa-inbox fa-2x d-block mb-2\"></i>Comentáriosв поки немає</p>",
     "<p class=\"text-muted text-center py-3\"><i class=\"fas fa-inbox fa-2x d-block mb-2\"></i>Ainda sem comentários</p>"),
    ("<strong id=\"modalTechnician\" style=\"font-size:.88rem\">Не призначено</strong>",
     "<strong id=\"modalTechnician\" style=\"font-size:.88rem\">Não atribuído</strong>"),
    ("<i class=\"fas fa-play mr-1\"></i>Розпоchatи роботу",
     "<i class=\"fas fa-play mr-1\"></i>Iniciar trabalho"),
    ("<i class=\"fas fa-times mr-1\"></i>Закрити",
     "<i class=\"fas fa-times mr-1\"></i>Fechar"),

    # ── Mass assignment modal ─────────────────────────────────────────────────
    ("<!-- Модальне вікно масового призначення -->",
     "<!-- Janela de atribuição em massa -->"),
    ("<h5 class=\"modal-title\">Масове призначення</h5>",
     "<h5 class=\"modal-title\">Atribuição em massa</h5>"),
    ("<h6>Доступні pedidos</h6>", "<h6>Pedidos disponíveis</h6>"),
    ("<!-- Pedidos будуть додані тут -->",
     "<!-- Os pedidos serão adicionados aqui -->"),
    ("<h6>Вибрані для призначення</h6>",
     "<h6>Seleccionados para atribuição</h6>"),
    ("<!-- Вибрані pedidos -->", "<!-- Pedidos seleccionados -->"),
    ("<label>Seleccione техніка для масового призначення:</label>",
     "<label>Seleccione o técnico para atribuição em massa:</label>"),
    ("<i class=\"fas fa-check\"></i> Призначити вибрані",
     "<i class=\"fas fa-check\"></i> Atribuir seleccionados"),

    # ── JS logic ──────────────────────────────────────────────────────────────
    ("{ id: 'disp_001', firstName: 'Марія', lastName: 'Коваленко', role: 'dispatcher' };",
     "{ id: 'disp_001', firstName: 'Maria', lastName: 'Kovalenko', role: 'dispatcher' };"),
    ("console.warn('⚠️ Não вдалося descarregar техніків з API');",
     "console.warn('⚠️ Não foi possível carregar técnicos da API');"),
    ("console.log('📋 Призначаємо запит:', { requestId, technicianId });",
     "console.log('📋 A atribuir pedido:', { requestId, technicianId });"),
    ("throw new Error(error.message || 'Erro призначення');",
     "throw new Error(error.message || 'Erro de atribuição');"),
    ("console.log('✅ Запит успішно призначено');",
     "console.log('✅ Pedido atribuído com sucesso');"),
    ("toastr.success('Zaявку призначено! Notificações enviado.');",
     "toastr.success('Pedido atribuído! Notificações enviadas.');"),
    ("toastr.success('Zaявку призначено! Notificações enviadas.');",
     "toastr.success('Pedido atribuído! Notificações enviadas.');"),
    ("toastr.success('Заявку призначено! Notificações enviado.');",
     "toastr.success('Pedido atribuído! Notificações enviadas.');"),
    ("console.error('❌ Помилка призначення:', error);",
     "console.error('❌ Erro de atribuição:', error);"),
    ("toastr.error('Não вдалося призначити заявку: ' + error.message);",
     "toastr.error('Não foi possível atribuir o pedido: ' + error.message);"),
    ("Swal.fire({ icon: 'warning', title: 'Немає техніків', text: 'Немає доступних техніків для призначення.',",
     "Swal.fire({ icon: 'warning', title: 'Sem técnicos', text: 'Não há técnicos disponíveis para atribuição.',"),
    ("const name = tech.name || `${tech.firstName || ''} ${tech.lastName || ''}`.trim() || 'Технік';",
     "const name = tech.name || `${tech.firstName || ''} ${tech.lastName || ''}`.trim() || 'Técnico';"),
    ("<div class=\"workload-dot ${dc}\" title=\"${tasks} активних\"></div>",
     "<div class=\"workload-dot ${dc}\" title=\"${tasks} activos\"></div>"),
    ("<h6 class=\"text-muted mb-2\"><i class=\"fas fa-users mr-1\"></i>Seleccione техніка</h6>",
     "<h6 class=\"text-muted mb-2\"><i class=\"fas fa-users mr-1\"></i>Seleccione o técnico</h6>"),
    ("<label class=\"small font-weight-bold\">Дата виїзду</label>",
     "<label class=\"small font-weight-bold\">Data de saída</label>"),
    ("<label class=\"small font-weight-bold\">Час</label>",
     "<label class=\"small font-weight-bold\">Hora</label>"),
    ("<option value=\"1\">~1 horasа</option>",
     "<option value=\"1\">~1 hora</option>"),
    ("<option value=\"2\" selected>~2 horasи</option>",
     "<option value=\"2\" selected>~2 horas</option>"),
    ("<option value=\"4\">~4 horasи</option>",
     "<option value=\"4\">~4 horas</option>"),
    ("<option value=\"8\">Цілий день</option>",
     "<option value=\"8\">Dia inteiro</option>"),
    ("<label class=\"small font-weight-bold\">Інструкції</label>",
     "<label class=\"small font-weight-bold\">Instruções</label>"),
    ("placeholder=\"Додаткові інструкції для техніка…\">",
     "placeholder=\"Instruções adicionais para o técnico…\">"),
    ("<label class=\"custom-control-label small\" for=\"dispEaNotifyPush\">Push техніку</label>",
     "<label class=\"custom-control-label small\" for=\"dispEaNotifyPush\">Push ao técnico</label>"),
    ("<label class=\"custom-control-label small\" for=\"dispEaNotifyEmail\">Email техніку</label>",
     "<label class=\"custom-control-label small\" for=\"dispEaNotifyEmail\">Email ao técnico</label>"),
    ("<label class=\"custom-control-label small\" for=\"dispEaNotifyClient\">Сповістити клієнта</label>",
     "<label class=\"custom-control-label small\" for=\"dispEaNotifyClient\">Notificar cliente</label>"),
    ("if (!techId) { toastr.warning('Seleccione техніка зі списку'); return; }",
     "if (!techId) { toastr.warning('Seleccione o técnico da lista'); return; }"),
    ("toastr.info('Заявку переназначено!');",
     "toastr.info('Pedido reatribuído!');"),
    ("throw new Error('Não вдалося descarregar призначення');",
     "throw new Error('Não foi possível carregar as atribuições');"),
    ("console.log('📊 Завантажено запитів:', apiRequests.length);",
     "console.log('📊 Pedidos carregados:', apiRequests.length);"),
    ("console.log('🔍 Приклад запиту:', apiRequests[0]);",
     "console.log('🔍 Exemplo de pedido:', apiRequests[0]);"),
    ("let assignedToName = 'Não призначено';",
     "let assignedToName = 'Não atribuído';"),
    ("assignedToName = foundTech.name || `${foundTech.firstName || ''} ${foundTech.lastName || ''}`.trim() || 'Технік';",
     "assignedToName = foundTech.name || `${foundTech.firstName || ''} ${foundTech.lastName || ''}`.trim() || 'Técnico';"),
    ("assignedToName = fullName || techData.name || 'Технік';",
     "assignedToName = fullName || techData.name || 'Técnico';"),
    ("console.error('Erro завантаження призначень:', error);",
     "console.error('Erro ao carregar atribuições:', error);"),
    ("alert('Erro завантаження призначень: ' + error.message);",
     "alert('Erro ao carregar atribuições: ' + error.message);"),
    ("assigned:    { cls: 'badge-primary',  label: 'Призначена' },",
     "assigned:    { cls: 'badge-primary',  label: 'Atribuída' },"),

    # ── More generic patterns ─────────────────────────────────────────────────
    ("'Не призначено'", "'Não atribuído'"),
    ("'Технік'", "'Técnico'"),
    ("|| 'Технік'", "|| 'Técnico'"),
    ("'Немає техніків'", "'Sem técnicos'"),
    ("'Протерміновані'", "'Em atraso'"),
    ("'В очікуванні'", "'Pendente'"),
]

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
