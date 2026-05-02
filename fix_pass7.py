"""Pass 7: high-frequency shared lines + sidebar items."""
from pathlib import Path

TRANSLATIONS = [
    # ── High-frequency comment/template lines ──────────────────────────────────
    ('<!-- 🌍 Sistema багатомовності -->', '<!-- 🌍 Sistema multilingue -->'),
    ('<!-- Статистика -->', '<!-- Estatísticas -->'),
    ('<!-- Права частина навігації -->', '<!-- Parte direita da navegação -->'),
    ('<!-- Додаткові стилі -->', '<!-- Estilos adicionais -->'),
    ('<!-- Підchaveення скриптів -->', '<!-- Inclusão de scripts -->'),
    ('<!-- Підключення скриптів -->', '<!-- Inclusão de scripts -->'),
    ('<!-- Filtros та пошук -->', '<!-- Filtros e pesquisa -->'),
    ('<!-- Sistema авторизації -->', '<!-- Sistema de autorização -->'),

    # ── Sidebar nav items (16 files!) ──────────────────────────────────────────
    ('<p>Розклад</p>', '<p>Agenda</p>'),
    ('<p>Звіти робіт</p>', '<p>Relatórios de trabalho</p>'),
    ('<p>QR Сканер</p>', '<p>Leitor QR</p>'),
    ('<p>Довідник</p>', '<p>Manual</p>'),
    ('<p>Інструкції</p>', '<p>Instruções</p>'),
    ('<p>Чеклісти</p>', '<p>Listas de verificação</p>'),
    ('<span class="badge badge-success right">Новинка</span>',
     '<span class="badge badge-success right">Novidade</span>'),

    # ── Nav/toolbar items ──────────────────────────────────────────────────────
    ('<a class="nav-link" href="#" id="darkModeToggle" title="Темна тема">',
     '<a class="nav-link" href="#" id="darkModeToggle" title="Tema escuro">'),
    ('<i class="fas fa-download"></i> Завантажити', '<i class="fas fa-download"></i> Descarregar'),
    ('<i class="fas fa-sign-out-alt"></i> Вийти', '<i class="fas fa-sign-out-alt"></i> Sair'),
    ('<i class="fas fa-eye"></i> Переглянути', '<i class="fas fa-eye"></i> Ver'),
    ('<i class="fas fa-times"></i> Закрити', '<i class="fas fa-times"></i> Fechar'),
    ('<i class="fas fa-archive mr-1"></i>Архівувати', '<i class="fas fa-archive mr-1"></i>Arquivar'),

    # ── Confirm dialogs ────────────────────────────────────────────────────────
    ("if (confirm('Tem a certeza, що хочете вийти з системи?')) {",
     "if (confirm('Tem a certeza que quer sair do sistema?')) {"),
    ("if (confirm('Tem a certeza, що хочете вийти?')) {",
     "if (confirm('Tem a certeza que quer sair?')) {"),
    ("Tem a certeza, що хочете", "Tem a certeza que quer"),
    ("que quer видалити", "que quer eliminar"),
    ("que quer вийти", "que quer sair"),

    # ── Filter options ─────────────────────────────────────────────────────────
    ('<option value="all">Всі пріоритети</option>', '<option value="all">Todas as prioridades</option>'),
    ('<option value="active">Активні</option>', '<option value="active">Activos</option>'),
    ('<option value="inactive">Неактивні</option>', '<option value="inactive">Inactivos</option>'),
    ('<option value="completed">Завершені</option>', '<option value="completed">Concluídos</option>'),
    ('<option value="all">Всі техніки</option>', '<option value="all">Todos os técnicos</option>'),
    ('<option value="tech1">Іван Петренко</option>', '<option value="tech1">Técnico 1</option>'),
    ('<option value="tech2">Олег Коваленко</option>', '<option value="tech2">Técnico 2</option>'),
    ('<option value="tech3">Андрій Сидоренко</option>', '<option value="tech3">Técnico 3</option>'),
    ('<option value="tech4">Василь Шевченко</option>', '<option value="tech4">Técnico 4</option>'),
    ('<option value="equipment">Для обладнання</option>',
     '<option value="equipment">Para equipamento</option>'),
    ('<label>Пріоритет:</label>', '<label>Prioridade:</label>'),

    # ── Nav links ─────────────────────────────────────────────────────────────
    ('href="#" class="nav-link">QR-коди</a>', 'href="#" class="nav-link">QR-códigos</a>'),
    ('<a href="#" class="nav-link">QR-коди</a>', '<a href="#" class="nav-link">QR-códigos</a>'),
    ('<a href="assignments.html" class="nav-link">Призначення</a>',
     '<a href="assignments.html" class="nav-link">Atribuições</a>'),
    ('<a class="nav-link" href="ar-helper.html" title="AR помічник">',
     '<a class="nav-link" href="ar-helper.html" title="Auxiliar AR">'),

    # ── Console messages (hybrid) ──────────────────────────────────────────────
    ("console.log('🔄 A carregar ліфтів з API...');",
     "console.log('🔄 A carregar elevadores da API...');"),
    ("console.error('❌ Erro ao carregarння ліфта:', error);",
     "console.error('❌ Erro ao carregar elevador:', error);"),
    ("carregarння", "carregar"),

    # ── Stats cards ───────────────────────────────────────────────────────────
    ('<p>Всього ліфтів</p>', '<p>Total de elevadores</p>'),
    ('<p>Активних ліфтів</p>', '<p>Elevadores activos</p>'),
    ('<p>Ліфтів без техніка</p>', '<p>Elevadores sem técnico</p>'),

    # ── Requests / assignments pages ──────────────────────────────────────────
    ('Призначення', 'Atribuições'),
    ('Призначення техніка', 'Atribuição de técnico'),
    ('Призначення завдання', 'Atribuição de tarefa'),
    ('Призначення виконавця', 'Atribuição do executor'),
    ('Заявки', 'Pedidos'),
    ('Заявка', 'Pedido'),
    ('заявка', 'pedido'),
    ('заявки', 'pedidos'),
    ('заявок', 'pedidos'),
    ('Нова заявка', 'Novo pedido'),
    ('нова заявка', 'novo pedido'),
    ('Тип заявки', 'Tipo de pedido'),
    ('Мої заявки', 'Os meus pedidos'),
    ('Відкриті заявки', 'Pedidos abertos'),
    ('Закриті заявки', 'Pedidos fechados'),
    ('Заявок не знайдено', 'Pedidos não encontrados'),
    ('Додати заявку', 'Adicionar pedido'),
    ('Деталі заявки', 'Detalhes do pedido'),
    ('Призначений технік', 'Técnico atribuído'),
    ('Відповідальний', 'Responsável'),
    ('відповідальний', 'responsável'),
    ('Виконавець', 'Executor'),
    ('виконавець', 'executor'),

    # ── Status strings ────────────────────────────────────────────────────────
    ('Відкрито', 'Aberto'),
    ('відкрито', 'aberto'),
    ('Закрито', 'Fechado'),
    ('закрито', 'fechado'),
    ('В роботі', 'Em curso'),
    ('в роботі', 'em curso'),
    ('Виконано', 'Concluído'),
    ('виконано', 'concluído'),
    ('Завершено', 'Concluído'),
    ('завершено', 'concluído'),
    ('Скасовано', 'Cancelado'),
    ('скасовано', 'cancelado'),
    ('Відхилено', 'Recusado'),
    ('відхилено', 'recusado'),
    ('Прийнято', 'Aceite'),
    ('прийнято', 'aceite'),

    # ── Analytics ─────────────────────────────────────────────────────────────
    ('Детальна аналітика', 'Análise detalhada'),
    ('Загальна статистика', 'Estatísticas gerais'),
    ('Статистика ліфтів', 'Estatísticas de elevadores'),
    ('Статистика по техніках', 'Estatísticas por técnico'),
    ('Статистика по заявках', 'Estatísticas de pedidos'),
    ('Графік', 'Gráfico'),
    ('графік', 'gráfico'),
    ('Гістограма', 'Histograma'),
    ('Кругова діаграма', 'Gráfico circular'),

    # ── Remaining common strings ──────────────────────────────────────────────
    ('Архівувати', 'Arquivar'),
    ('архівувати', 'arquivar'),
    ('Відновити', 'Restaurar'),
    ('відновити', 'restaurar'),
    ('Дублювати', 'Duplicar'),
    ('дублювати', 'duplicar'),
    ('Експортувати', 'Exportar'),
    ('експортувати', 'exportar'),
    ('Імпортувати', 'Importar'),
    ('імпортувати', 'importar'),
    ('Підтвердити', 'Confirmar'),
    ('підтвердити', 'confirmar'),
    ('Завантажити', 'Descarregar'),
    ('завантажити', 'descarregar'),

    # ── QR scanner page ────────────────────────────────────────────────────────
    ('QR Сканер', 'Leitor QR'),
    ('Сканування', 'Leitura'),
    ('сканування', 'leitura'),
    ('Відскануйте', 'Digitalize'),
    ('відскануйте', 'digitalize'),
    ('Наведіть камеру', 'Aponte a câmara'),
    ('Результат сканування', 'Resultado da leitura'),

    # ── Unified analytics ─────────────────────────────────────────────────────
    ('Зведена аналітика', 'Análise global'),
    ('Прогностична аналітика', 'Análise preditiva'),
    ('Технічне обслуговування', 'Manutenção técnica'),
    ('технічне обслуговування', 'manutenção técnica'),
    ('Прогнозована дата', 'Data prevista'),
    ('Ймовірність', 'Probabilidade'),
    ('ймовірність', 'probabilidade'),
    ('Рекомендація', 'Recomendação'),
    ('рекомендація', 'recomendação'),
    ('Відновлення', 'Recuperação'),
    ('відновлення', 'recuperação'),

    # ── Maps page ─────────────────────────────────────────────────────────────
    ('Карта ліфтів', 'Mapa de elevadores'),
    ('Карта заявок', 'Mapa de pedidos'),
    ('Показати всі', 'Mostrar todos'),
    ('Показати тільки', 'Mostrar apenas'),
    ('показати', 'mostrar'),
    ('Приховати', 'Ocultar'),
    ('приховати', 'ocultar'),
    ('Кластеризація', 'Agrupamento'),

    # ── User management ───────────────────────────────────────────────────────
    ('Управління користувачами', 'Gestão de utilizadores'),
    ('Список користувачів', 'Lista de utilizadores'),
    ('Додати користувача', 'Adicionar utilizador'),
    ('Редагувати користувача', 'Editar utilizador'),
    ('Видалити користувача', 'Eliminar utilizador'),
    ('Роль користувача', 'Papel do utilizador'),
    ('Статус користувача', 'Estado do utilizador'),
    ('Останній вхід', 'Último acesso'),
    ('Заблокувати', 'Bloquear'),
    ('заблокувати', 'bloquear'),
    ('Розблокувати', 'Desbloquear'),
    ('розблокувати', 'desbloquear'),
    ('Запросити', 'Convidar'),
    ('запросити', 'convidar'),

    # ── Backup file note ──────────────────────────────────────────────────────
    # (Leave backup file as-is; don't slow down by translating old backup)
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
