"""Pass 6: dispatcher-specific and more common remaining strings."""
from pathlib import Path

TRANSLATIONS = [
    # ── Page titles (dispatcher/tech panels) ──────────────────────────────────
    ('Панель диспетчера - Управління ліфтами', 'Painel do despachante - Gestão de elevadores'),
    ('Панель диспетчера -', 'Painel do despachante -'),
    ('Панель техніка -', 'Painel do técnico -'),
    ('Управління ліфтами (Dispatcher)', 'Gestão de elevadores (Despachante)'),
    ('Примусово оновлюємо сторінку при зміні service worker',
     'Forçar actualização da página ao mudar o service worker'),

    # ── Lift list page ─────────────────────────────────────────────────────────
    ('Додати ліфт', 'Adicionar elevador'),
    ('Додати novo ліфт', 'Adicionar novo elevador'),
    ('<label>Пошук:</label>', '<label>Pesquisar:</label>'),
    ('Пошук por modelo, endereço, ID...', 'Pesquisar por modelo, endereço, ID...'),
    ('placeholder="Пошук..."', 'placeholder="Pesquisar..."'),
    ('<i class="fas fa-download"></i> Експорт CSV', '<i class="fas fa-download"></i> Exportar CSV'),
    ('<i class="fas fa-file-pdf"></i> Експорт PDF', '<i class="fas fa-file-pdf"></i> Exportar PDF'),
    ('Експорт CSV', 'Exportar CSV'),
    ('Експорт PDF', 'Exportar PDF'),
    ('Зберегти ліфт', 'Guardar elevador'),
    ('Збережіть ліфт, щоб переглянути та додати звіти',
     'Guarde o elevador para ver e adicionar relatórios'),
    ('Збережіть ліфт, щоб переглянути звіти інспекцій',
     'Guarde o elevador para ver os relatórios de inspecção'),
    ('Descarregar PDF звіт', 'Descarregar relatório PDF'),
    ('Додати звіт', 'Adicionar relatório'),

    # ── Contract modal ─────────────────────────────────────────────────────────
    ('Дата поchatку *', 'Data de início *'),
    ('Contrato продовжується автоматично, якщо клієнт не розірвав контракт',
     'O contrato renova-se automaticamente se o cliente não cancelar'),
    ('Дата закінчення', 'Data de fim'),
    ('якщо contrato фіксований', 'se contrato fixo'),
    ('Примітки', 'Notas'),
    ('Descarregar PDF контракт *', 'Descarregar PDF do contrato *'),
    ('Descarregar PDF контракту', 'Descarregar PDF do contrato'),
    ('Тільки PDF ficheiros. Tamanho máximo: 10MB', 'Apenas ficheiros PDF. Tamanho máximo: 10MB'),
    ('Тільки PDF ficheiros, до 10MB', 'Apenas ficheiros PDF, até 10MB'),
    ('Застосувати до всіх ліфтів за цією адресою', 'Aplicar a todos os elevadores neste endereço'),
    ('Блок застосувати до інших ліфтів за цією ж адресою',
     'Bloco para aplicar a outros elevadores no mesmo endereço'),

    # ── QR section ─────────────────────────────────────────────────────────────
    ('QR код ліфта', 'Código QR do elevador'),
    ('QR код буде згенеровано тут', 'O código QR será gerado aqui'),
    ('Відскануйте цей QR код для швидкого доступу до інформації про ліфт',
     'Digitalize este código QR para acesso rápido à informação do elevador'),
    ('<i class="fas fa-qrcode"></i> QR код ліфта', '<i class="fas fa-qrcode"></i> Código QR do elevador'),

    # ── Intervention modal ─────────────────────────────────────────────────────
    ('Додати втручання', 'Adicionar intervenção'),
    ('Дата втручання *', 'Data da intervenção *'),
    ('Тип втручання *', 'Tipo de intervenção *'),
    ('Модернізація', 'Modernização'),
    ('Заплановано', 'Planeado'),
    ('Опис втручання *', 'Descrição da intervenção *'),
    ('Detalhado опис виконаних робіт...', 'Descrição detalhada dos trabalhos realizados...'),
    ('Вартість', 'Custo'),
    ('<span class="input-group-text">год</span>', '<span class="input-group-text">h</span>'),
    ('годин', 'horas'),

    # ── Chat modal ─────────────────────────────────────────────────────────────
    ('Chat з ліфтом', 'Chat do elevador'),
    ('Mensagem будуть додані динамічно', 'Mensagens serão adicionadas dinamicamente'),
    ('Введіть mensagem...', 'Introduza a mensagem...'),

    # ── Inspection report modal (simplified) ──────────────────────────────────
    ('Inspection Report Modal (спрощена версія)', 'Modal de relatório de inspecção (versão simplificada)'),
    ('Інформація про інспекцію', 'Informação da inspecção'),
    ('Технічна інспекція', 'Inspecção técnica'),
    ('Verificação безпеки', 'Verificação de segurança'),
    ('Reparaçãoні роботи', 'Trabalhos de reparação'),
    ("Ім'я інспектора", 'Nome do inspector'),
    ("placeholder=\"Введіть прізвище, ім'я та по-батькові інспектора\"",
     'placeholder="Introduza o nome completo do inspector"'),
    ('Приклад: Петренко Петро Петрович', 'Exemplo: João Silva Santos'),
    ('Статус інспекції', 'Estado da inspecção'),
    ('Aprovado успішно', 'Aprovado com sucesso'),
    ('Pendente повторної перевірки', 'Pendente de nova verificação'),
    ('Relatório PDF інспекції', 'Relatório PDF de inspecção'),
    ('Descarregar PDF звіт', 'Descarregar relatório PDF'),
    ('Pré-visualização та ações з PDF', 'Pré-visualização e acções do PDF'),
    ('Завантажений звіт', 'Relatório carregado'),
    ('Дійсний до (наступна інспекція)', 'Válido até (próxima inspecção)'),
    ('<label>Дійсний до (наступна інспекція)</label>', '<label>Válido até (próxima inspecção)</label>'),
    ('<label>Тип звіту</label>', '<label>Tipo de relatório</label>'),
    ('<option value="annual">Щорічна</option>', '<option value="annual">Anual</option>'),
    ('Notas <small class="text-muted">(авто-заповнено з PDF)</small>',
     'Notas <small class="text-muted">(preenchidas automaticamente do PDF)</small>'),
    ('Підтвердити та зберегти', 'Confirmar e guardar'),

    # ── PDF / report page ─────────────────────────────────────────────────────
    ('PDF документ:', 'Documento PDF:'),
    ('Відкрити в новій вкладці', 'Abrir em nova aba'),
    ('PDF не прикріплено', 'PDF não anexado'),
    ('Прикріпити PDF', 'Anexar PDF'),

    # ── Report type labels (in JS object) ────────────────────────────────────
    ("inspection: 'Інспекція', maintenance: 'Технічне обслуговування'",
     "inspection: 'Inspecção', maintenance: 'Manutenção técnica'"),
    ("inspection: 'Інспекція', maintenance: 'ТО'",
     "inspection: 'Inspecção', maintenance: 'IT'"),
    ("emergency: 'Аварія'", "emergency: 'Avaria'"),
    ("annual: 'Інсп", "annual: 'Insp"),

    # ── Report status text in JS ──────────────────────────────────────────────
    ("statusText = 'ПРОЙДЕНО';", "statusText = 'APROVADO';"),
    ("statusText = 'НЕ ПРОЙДЕНО';", "statusText = 'REPROVADO';"),
    ("statusText = 'ВИКОНАНО';", "statusText = 'CONCLUÍDO';"),

    # ── Report HTML template ──────────────────────────────────────────────────
    ('<title>Звіт - ${type}</title>', '<title>Relatório - ${type}</title>'),
    ('<h1>🏢 ЗВІТ ПРО ${type.toUpperCase()}</h1>', '<h1>🏢 RELATÓRIO DE ${type.toUpperCase()}</h1>'),
    ('<h3>📍 Інформація про ліфт</h3>', '<h3>📍 Informação do elevador</h3>'),
    ('<div class="info-label">ID Ліфта:</div>', '<div class="info-label">ID do elevador:</div>'),
    ('<div class="info-label">Адреса:</div>', '<div class="info-label">Endereço:</div>'),
    ('<div class="info-label">Тип:</div>', '<div class="info-label">Tipo:</div>'),
    ('<div class="info-label">Дата:</div>', '<div class="info-label">Data:</div>'),
    ('<div class="info-label">Статус:</div>', '<div class="info-label">Estado:</div>'),
    ('<h3>💬 Коментарі та висновки</h3>', '<h3>💬 Comentários e conclusões</h3>'),
    ("'uk-UA'", "'pt-PT'"),
    ('<p><strong>FestLift</strong> - Sistema de gestão ліфтами</p>',
     '<p><strong>FestLift</strong> - Sistema de gestão de elevadores</p>'),

    # ── Validation errors ─────────────────────────────────────────────────────
    ("alert('Por favor, заповніть всі обов\\'язкові поля та оберіть ficheiro');",
     "alert('Por favor, preencha todos os campos obrigatórios e seleccione o ficheiro');"),
    ("alert('Сесія прострочена. Por favor, увійдіть знову');",
     "alert('Sessão expirada. Por favor, entre novamente.');"),
    ("alert('Token не encontrado. Por favor, увійдіть знову');",
     "alert('Token não encontrado. Por favor, entre novamente.');"),
    ("throw new Error(`Помилка з'єднання з сервером: ${error.message}`);",
     "throw new Error(`Erro de ligação ao servidor: ${error.message}`);"),
    ("throw new Error(`Помилка сервера (${response.status}): ${errorText}`);",
     "throw new Error(`Erro do servidor (${response.status}): ${errorText}`);"),
    ('Contrato успішно завантажено та застосовано до', 'Contrato carregado e aplicado a'),
    ('ліфтів за цією адресою!', 'elevadores neste endereço!'),
    ("'Контракт успішно завантажено!'", "'Contrato carregado com sucesso!'"),
    ("alert('Erro: ' + (result.message || result.error || 'Не вдалося завантажити контракт'));",
     "alert('Erro: ' + (result.message || result.error || 'Não foi possível carregar o contrato'));"),
    ("alert('Erro завантаження контракту: ' + error.message);",
     "alert('Erro ao carregar contrato: ' + error.message);"),
    ("const email = prompt('Введіть email адресу для надсилання контракту:');",
     "const email = prompt('Introduza o email para envio do contrato:');"),
    ("alert('Контракт успішно enviado на ' + email);",
     "alert('Contrato enviado para ' + email);"),
    ("alert('Erro надсилання контракту');", "alert('Erro ao enviar contrato');"),
    ("if (!confirm('Tem a certeza, що хочете видалити контракт?')) return;",
     "if (!confirm('Tem a certeza que quer eliminar o contrato?')) return;"),
    ("alert('Контракт успішно eliminado');", "alert('Contrato eliminado com sucesso');"),
    ("alert('Erro видалення: ' + (result.message || 'Erro desconhecido'));",
     "alert('Erro ao eliminar: ' + (result.message || 'Erro desconhecido'));"),
    ("alert('Erro видалення контракту');", "alert('Erro ao eliminar contrato');"),
    ('Exportar PDF буде доступний у наступній версії.\n\nНаразі використайте експорт CSV.',
     'A exportação PDF estará disponível numa versão futura.\n\nUse a exportação CSV por enquanto.'),
    ("'Заповніть обов\\'язкові поля: дата, тип, опис'",
     "'Preencha os campos obrigatórios: data, tipo, descrição'"),
    ('Збережіть ліфт, щоб переглянути та додати звіти',
     'Guarde o elevador para ver e adicionar relatórios'),
    ('Помилка завантаже', 'Erro ao carregar'),
    ('Звітів ще немає. Натисніт', 'Sem relatórios. Clique'),
    ("'Dados ліфта не завантажені'", "'Dados do elevador não carregados'"),
    ("'Email não especificado. Заповніть поле email.'",
     "'Email não especificado. Preencha o campo email.'"),
    ("toastr.info('Відкрито поштовий клієнт');", "toastr.info('Cliente de email aberto');"),
    ("та інших пор", "e outros por"),
    # Simple sub-string fixes
    ('z ${startDate} (автоматичне продовження)', 'z ${startDate} (renovação automática)'),
    ('com ${startDate} (automaticне продовження)', 'de ${startDate} (renovação automática)'),
    ('з ${startDate} (автоматичне продовження)', 'de ${startDate} (renovação automática)'),
    ('Примітки', 'Notas'),
    ('З ${startDate} (автоматичне продовження)', 'De ${startDate} (renovação automática)'),
    ('${description ? `<strong>Примітки:</strong> ${description}<br>` : \'\'}',
     '${description ? `<strong>Notas:</strong> ${description}<br>` : \'\'}'),
    ('Контракт не завантажено', 'Contrato não carregado'),
    ('Завантажити контракт', 'Carregar contrato'),
    ('Контракт №${contractNumber}', 'Contrato №${contractNumber}'),

    # ── Common remaining ──────────────────────────────────────────────────────
    ('Відкрито поштовий клієнт', 'Cliente de email aberto'),
    ('ліфт${suf}', 'elevador${suf}'),
    ('поточний ліфт', 'elevador actual'),
    ('Ліфт encontrado автоматично:', 'Elevador encontrado automaticamente:'),
    ('Ліфт не encontrado автоматично. Seleccione зі списку.',
     'Elevador não encontrado automaticamente. Seleccione da lista.'),
    ('Seleccione o elevador da lista або прийміть автоматично знайдений.',
     'Seleccione o elevador da lista ou aceite o encontrado automaticamente.'),
    ('Налаштування', 'Definições'),
    ('Змінити', 'Alterar'),
    ('Оновити', 'Actualizar'),
    ('Дійсно до', 'Válido até'),
    ('звітів</small>', 'relatórios</small>'),
    ('A mostrar 5 з', 'A mostrar 5 de'),
    ('Звіт criado', 'Relatório criado'),

    # ── Tech panel specific ───────────────────────────────────────────────────
    ('Mapa de завдань', 'Mapa de tarefas'),
    ('Таблиця завдань', 'Tabela de tarefas'),
    ('Завдань: ', 'Tarefas: '),
    ('Нових завдань', 'Novas tarefas'),
    ('Завдань у роботі', 'Tarefas em curso'),
    ('Завдання #', 'Tarefa #'),
    ('Час початку', 'Hora de início'),
    ('Час закінчення', 'Hora de fim'),
    ('Тривалість', 'Duração'),
    ('Нотатки', 'Notas'),
    ('Перші кроки', 'Primeiros passos'),
    ('Чек-лист', 'Lista de verificação'),
    ('Матеріали', 'Materiais'),
    ('Запчастини', 'Peças'),
    ('Запчастину', 'Peça'),
    ('Підпис клієнта', 'Assinatura do cliente'),
    ('Завдання виконано', 'Tarefa concluída'),
    ('Завдання відхилено', 'Tarefa recusada'),

    # ── Generic missing words ─────────────────────────────────────────────────
    ('Стан', 'Estado'),
    ('Назва', 'Nome'),
    ('Виробник', 'Fabricante'),
    ('Місто', 'Cidade'),
    ('Дата створення', 'Data de criação'),
    ('Коментар', 'Comentário'),
    ('Коментарі', 'Comentários'),
    ('Коментарі та висновки', 'Comentários e conclusões'),
    ('Висновок', 'Conclusão'),
    ('Примітка', 'Nota'),
    ('Примітки', 'Notas'),
    ('Результат', 'Resultado'),
    ('Деталі', 'Detalhes'),
    ('деталі', 'detalhes'),
    ('Поперед.', 'Anterior'),
    ('Наступн.', 'Seguinte'),
    ('Попередня', 'Anterior'),
    ('Наступна', 'Seguinte'),
    ('Сторінка', 'Página'),
    ('сторінка', 'página'),
    ('Поверх', 'Piso'),
    ('поверх', 'piso'),
    ('Поверхів', 'Pisos'),
    ('поверхів', 'pisos'),
    ('Місткість', 'Capacidade'),
    ('Вага', 'Peso'),
    ('Швидкість', 'Velocidade'),

    # ── Hybrid URL/form labels ────────────────────────────────────────────────
    ('Пошук:',  'Pesquisar:'),
    ('Пошук', 'Pesquisar'),
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
