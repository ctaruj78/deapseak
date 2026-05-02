"""Pass 5: targeted remaining strings."""
from pathlib import Path

TRANSLATIONS = [
    # ── Tab section comments ────────────────────────────────────────────────────
    ("<!-- ===== TAB 1: ОБ'ЄКТ ===== -->", '<!-- ===== SEPARADOR 1: OBJECTO ===== -->'),
    ('<!-- ===== TAB 2: КЛІЄНТ ===== -->', '<!-- ===== SEPARADOR 2: CLIENTE ===== -->'),
    ('<!-- ===== TAB 3: ЛІФТ ===== -->', '<!-- ===== SEPARADOR 3: ELEVADOR ===== -->'),
    ('<!-- ===== TAB 4: СЕРВІС ===== -->', '<!-- ===== SEPARADOR 4: SERVIÇO ===== -->'),
    ('<!-- ===== TAB 5:', '<!-- ===== SEPARADOR 5:'),
    ('<!-- Навігаційна панель -->', '<!-- Barra de navegação -->'),
    ('<!-- Бічна панель -->', '<!-- Painel lateral -->'),
    ('<!-- Профіль -->', '<!-- Perfil -->'),
    ('<!-- Вийти -->', '<!-- Sair -->'),
    ('<!-- Налаштування -->', '<!-- Definições -->'),
    ('<!-- Universal Drag-to-Scroll для таблиць -->', '<!-- Drag-to-Scroll universal para tabelas -->'),
    ('<!-- генерується eLiftUpdateRows() -->', '<!-- gerado por eLiftUpdateRows() -->'),
    ('<!-- JS: динамічні рядки + прогрес + калькулятор -->', '<!-- JS: linhas dinâmicas + progresso + calculadora -->'),
    ('<!-- ДВА БЛОКИ поруч -->', '<!-- DOIS BLOCOS lado a lado -->'),
    ('<!-- 1. Notificar клієнта -->', '<!-- 1. Notificar o cliente -->'),
    ('<!-- 2. Запит до муніципалітету -->', '<!-- 2. Pedido ao município -->'),
    ('<!-- Секція звітів інспекцій -->', '<!-- Secção de relatórios de inspecção -->'),
    ('<!-- Секція контракту -->', '<!-- Secção do contrato -->'),
    ('<!-- Секція орçаментів -->', '<!-- Secção de orçamentos -->'),
    ('<!-- Модальне вікно перегляду звіту -->', '<!-- Modal de visualização do relatório -->'),
    ('<!-- Detalhes звіту будуть тут -->', '<!-- Detalhes do relatório aqui -->'),
    ('<!-- Модальне вікно запиту/mensagem про інспекцію -->', '<!-- Modal de pedido de inspecção -->'),
    ('<!-- Інформація про ліфт -->', '<!-- Informação do elevador -->'),
    ('<!-- Кнопка запросити інспекцію -->', '<!-- Botão solicitar inspecção -->'),
    ('<!-- Пагінація -->', '<!-- Paginação -->'),
    ('<!-- Модальне вікно для додавання звіту -->', '<!-- Modal para adicionar relatório -->'),
    ('<!-- Модальне вікно для завантаження контракту -->', '<!-- Modal para carregar contrato -->'),
    ('<!-- PDF.js Library для парсингу PDF звітів -->', '<!-- Biblioteca PDF.js para análise de PDFs -->'),
    ('<!-- Integração парсера з формою звітів інспекції -->', '<!-- Integração do analisador com formulário de inspecção -->'),

    # ── Inline labels (no enclosing tags) ──────────────────────────────────────
    ('<label>Статус:</label>', '<label>Estado:</label>'),
    ('<label>Тип:</label>', '<label>Tipo:</label>'),
    ('<label>Статус</label>', '<label>Estado</label>'),
    ('<label>Тип</label>', '<label>Tipo</label>'),
    ('</i> Клієнт <span class="tab-badge">', '</i> Cliente <span class="tab-badge">'),
    ('</i> Ліфт <span class="tab-badge">', '</i> Elevador <span class="tab-badge">'),
    ('<label for="enhancedClientPhone">Телефон', '<label for="enhancedClientPhone">Telefone'),
    ('<label for="enhancedLiftBrand">Бренд', '<label for="enhancedLiftBrand">Marca'),
    ('<label for="report-type">Тип звіту *</label>', '<label for="report-type">Tipo de relatório *</label>'),
    ('<label for="report-date">Дата *</label>', '<label for="report-date">Data *</label>'),
    ('<label for="report-status">Resultado інспекції</label>', '<label for="report-status">Resultado da inspecção</label>'),
    ('<label for="report-description">Opção</label>', '<label for="report-description">Descrição</label>'),
    ('<label for="report-description">Опис</label>', '<label for="report-description">Descrição</label>'),
    ('<label for="contract-number">Номер контракту *</label>', '<label for="contract-number">Número do contrato *</label>'),
    ('<label class="small font-weight-bold">Email клієнта</label>', '<label class="small font-weight-bold">Email do cliente</label>'),
    ('<label class="small font-weight-bold">Текст листа</label>', '<label class="small font-weight-bold">Texto da carta</label>'),
    ('<label class="small font-weight-bold">Email муніципалітету</label>',
     '<label class="small font-weight-bold">Email do município</label>'),
    ('<label class="small mb-1">Інспектор / Компанія</label>', '<label class="small mb-1">Inspector / Empresa</label>'),
    ('<label class="small mb-1">Тип звіту</label>', '<label class="small mb-1">Tipo de relatório</label>'),
    ('<label class="small mb-1">Нотатки</label>', '<label class="small mb-1">Notas</label>'),
    ('<label class="font-weight-bold small"><i class="fas fa-elevator mr-1"></i> Ліфт</label>',
     '<label class="font-weight-bold small"><i class="fas fa-elevator mr-1"></i> Elevador</label>'),

    # ── Detail modal section headers ────────────────────────────────────────────
    ('<h6>Клієнт та обслуговування</h6>', '<h6>Cliente e manutenção</h6>'),
    ('<h6>Звіт інспекції</h6>', '<h6>Relatório de inspecção</h6>'),
    ('<h6>Карта розташування</h6>', '<h6>Mapa de localização</h6>'),
    ('<h6>Додаткова інформація</h6>', '<h6>Informação adicional</h6>'),
    ('<h6>Контракт на обслуговування</h6>', '<h6>Contrato de manutenção</h6>'),

    # ── Detail modal table cells ────────────────────────────────────────────────
    ('<td><strong>Клієнт:</strong></td>', '<td><strong>Cliente:</strong></td>'),
    ('<td><strong>Código домофону:</strong></td>', '<td><strong>Código do interfone:</strong></td>'),
    ('<td><strong>Вартість обслуг. (€/міс):</strong></td>', '<td><strong>Custo manut. (€/mês):</strong></td>'),
    ('<td><strong>Дата сертифікату:</strong></td>', '<td><strong>Data do certificado:</strong></td>'),
    ('<td><strong>Validade сертифікату:</strong></td>', '<td><strong>Validade do certificado:</strong></td>'),
    ('<td><strong>Коментарі:</strong></td>', '<td><strong>Comentários:</strong></td>'),

    # ── Buttons in modals ──────────────────────────────────────────────────────
    ('Запросити інспекцію', 'Solicitar inspecção'),
    ('Надіслати Email клієнту', 'Enviar email ao cliente'),
    ('Надіслати клієнту', 'Enviar ao cliente'),
    ('Запит до муніципалітету', 'Pedido ao município'),
    ('Adicionar звіт', 'Adicionar relatório'),
    ('Aналізувати PDF', 'Analisar PDF'),
    ('Аналізувати PDF', 'Analisar PDF'),
    ('Зберегти втручання', 'Guardar intervenção'),
    ('Зберегти звіт', 'Guardar relatório'),

    # ── Inspection result options ──────────────────────────────────────────────
    ("Aprovado — сертифікат видано (наст. через 2 роки)", "Aprovado — certificado emitido (próximo em 2 anos)"),
    ("Reprovado — є клаузи (180 днів для виправлення)", "Reprovado — há cláusulas (180 dias para corrigir)"),
    ('<option value="">Seleccione тип...</option>', '<option value="">Seleccione o tipo...</option>'),
    ('<option value="inspection">Інспекція</option>', '<option value="inspection">Inspecção</option>'),
    ('<option value="maintenance">Технічне обслуговування</option>',
     '<option value="maintenance">Manutenção técnica</option>'),
    ('<option value="repair">Ремонт</option>', '<option value="repair">Reparação</option>'),
    ('<option value="conditional">⚠️ Реінспекція (клаузи C2)</option>',
     '<option value="conditional">⚠️ Reinspecção (cláusulas C2)</option>'),
    ('<option value="failed">❌ Reprovado / Іммобілізація</option>',
     '<option value="failed">❌ Reprovado / Imobilização</option>'),
    ('<option value="annual">Щорічна / Periodica</option>', '<option value="annual">Anual / Periódica</option>'),
    ('<option value="routine">Планова</option>', '<option value="routine">Planeada</option>'),
    ('<option value="certification">Сертифікаційна</option>', '<option value="certification">Certificação</option>'),
    ('<option value="emergency">Позапланова</option>', '<option value="emergency">Não planeada</option>'),
    ('<option value="reinspection">Реінспекція</option>', '<option value="reinspection">Reinspecção</option>'),
    ('<option value="passed">✅ Aprovado (2 роки)</option>', '<option value="passed">✅ Aprovado (2 anos)</option>'),

    # ── Filter options ─────────────────────────────────────────────────────────
    ('<option value="maintenance">ТО</option>', '<option value="maintenance">IT</option>'),
    ('<option value="repair">Ремонти</option>', '<option value="repair">Reparações</option>'),
    ('<option value="emergency">Аварії</option>', '<option value="emergency">Avarias</option>'),
    ('<option value="all">Весь час</option>', '<option value="all">Todo o período</option>'),
    ('<option value="30">Останні 30 днів</option>', '<option value="30">Últimos 30 dias</option>'),
    ('<option value="90">Останні 3 місяці</option>', '<option value="90">Últimos 3 meses</option>'),
    ('<option value="365">Último рік</option>', '<option value="365">Último ano</option>'),
    ('Filtroи', 'Filtros'),
    ('<!-- Filtroи -->', '<!-- Filtros -->'),

    # ── Loading / action states ────────────────────────────────────────────────
    ('A carregar звітів...', 'A carregar relatórios...'),
    ('A carregar контракту...', 'A carregar contrato...'),
    ('Завантажити ще', 'Carregar mais'),
    ('Збереження...', 'A guardar...'),
    ('Відправка...', 'A enviar...'),
    ('Збереження...', 'A guardar...'),

    # ── Inspection modal text ──────────────────────────────────────────────────
    ('Інспекція ліфта', 'Inspecção do elevador'),
    ('Клієнт повинен знати, що термін інспекції закінчується І що FestLift подбає про це.',
     'O cliente deve saber que o prazo da inspecção termina e que a FestLift tratará disso.'),
    ('Офіційний листа з проханням назначити дату інспекції.',
     'Carta oficial a solicitar agendamento da data de inspecção.'),
    ('Якщо Brevo не налаштований — відкриється ваш поштовий',
     'Se Brevo não estiver configurado — abrirá o seu cliente de email'),
    ('Notificar клієнта', 'Notificar o cliente'),
    ('Запит до <span', 'Pedido a <span'),

    # ── File label defaults ────────────────────────────────────────────────────
    ('Обрати ficheiro...', 'Escolher ficheiro...'),
    ('<label for="report-file">Завантажити ficheiro (PDF або imagem)</label>',
     '<label for="report-file">Carregar ficheiro (PDF ou imagem)</label>'),

    # ── PDF parser modal ──────────────────────────────────────────────────────
    ('Aналіз PDF звіту інспекції', 'Análise de PDF de inspecção'),
    ('Аналіз PDF звіту інспекції', 'Análise de PDF de inspecção'),
    ('Suportados звіти', 'Relatórios suportados'),
    ('Seleccione PDF звіт інспекції', 'Seleccione PDF de inspecção'),
    ('Аналізувати PDF', 'Analisar PDF'),
    ('Аналізуємо PDF звіт...', 'A analisar relatório PDF...'),
    ('Аналізуємо PDF звіт, будь ласка зачекайте...', 'A analisar relatório PDF, aguarde...'),
    ('Звіт проаналізовано!', 'Relatório analisado!'),
    ('Encontrado клауз:', 'Cláusulas encontradas:'),
    ('=== ВИЯВЛЕНІ КЛАУЗИ ===', '=== CLÁUSULAS DETECTADAS ==='),
    ('Виявлені клаузи (', 'Cláusulas detectadas ('),
    ('Потрібна реінспекція протягом 30', 'Reinspecção necessária em 30'),
    ('клауз.', 'cláusulas.'),
    ('Аналіз concluído', 'Análise concluída'),
    ('Помилка аналізу PDF', 'Erro na análise do PDF'),
    ('Дані necessário буде ввести вручну', 'Os dados terão de ser introduzidos manualmente'),
    ('Дані витягнуто автоматично — перевірте та підтвердіть:',
     'Dados extraídos automaticamente — verifique e confirme:'),
    ('Витягнуті дані зі звіту', 'Dados extraídos do relatório'),
    ('Інспектор:', 'Inspector:'),
    ('Інспектор / Компанія', 'Inspector / Empresa'),
    ('Назва інспекційного органу', 'Nome do organismo de inspecção'),
    ('Вулиця та номер', 'Rua e número'),
    ('Щорічна / Periodica', 'Anual / Periódica'),
    ('Нотатки', 'Notas'),
    ('Додаткові нотатки...', 'Notas adicionais...'),
    ('Ліфт encontrado:', 'Elevador encontrado:'),
    ('(Змінити)', '(Alterar)'),
    ('Ліфт не encontrado автоматично — оберіть зі списку',
     'Elevador não encontrado automaticamente — seleccione da lista'),
    ('Виявлені порушення', 'Violações detectadas'),
    ('Всі дані правильні?', 'Todos os dados estão correctos?'),
    ('Так, зберегти', 'Sim, guardar'),
    ('Часткове розпізнавання', 'Reconhecimento parcial'),
    ('Редагувати', 'Editar'),
    ('Застосувати зміни', 'Aplicar alterações'),
    ('Seleccione ліфт зі списку', 'Seleccione o elevador da lista'),
    ('— Обрати ліфт —', '— Seleccione o elevador —'),
    ('— Ліфт не encontrado автоматично —', '— Elevador não encontrado automaticamente —'),

    # ── Report status badges (JS object) ──────────────────────────────────────
    ('Certificado 2 роки', 'Certificado 2 anos'),
    ('Реінспекція (C2)', 'Reinspecção (C2)'),
    ('Іммобілізація (C1)', 'Imobilização (C1)'),
    ('Умовно', 'Condicional'),
    ('Невизначено', 'Indefinido'),
    ('Aprovado (2 роки)', 'Aprovado (2 anos)'),
    ('Реінспекція', 'Reinspecção'),
    ('Reprovado', 'Reprovado'),

    # ── Filter reset / paginate ────────────────────────────────────────────────
    ('Скинути', 'Repor'),

    # ── JS alert/error messages ────────────────────────────────────────────────
    ("'Erro видалення звіту'", "'Erro ao eliminar relatório'"),
    ('"Erro видалення звіту"', '"Erro ao eliminar relatório"'),
    ("'Введіть email адресу для надсилання звіту:'", "'Introduza o email para envio do relatório:'"),
    ('"Введіть email адресу для надсилання звіту:"', '"Introduza o email para envio do relatório:"'),
    ("'Звіт успішно enviado на '", "'Relatório enviado para '"),
    ('"Звіт успішно enviado на "', '"Relatório enviado para "'),
    ("'Erro надсилання: '", "'Erro ao enviar: '"),
    ('"Erro надсилання: "', '"Erro ao enviar: "'),
    ("'Erro надсилання звіту'", "'Erro ao enviar relatório'"),
    ('"Erro надсилання звіту"', '"Erro ao enviar relatório"'),
    ("'Неможливо видалити: дані звіту не encontrado'",
     "'Não é possível eliminar: dados do relatório não encontrados'"),
    ("'Неможливо надіслати: ID ліфта не encontrado'",
     "'Não é possível enviar: ID do elevador não encontrado'"),
    ("'Sem dados для експорту'", "'Sem dados para exportar'"),
    ("'CSV ficheiro завантажено!'", "'Ficheiro CSV descarregado!'"),
    ("'Erro експорту CSV: '", "'Erro ao exportar CSV: '"),
    ('"Erro експорту CSV: "', '"Erro ao exportar CSV: "'),
    ('Exportar PDF буде доступний у наступній версії.\n\nНаразі використовуйте експорт CSV.',
     'A exportação PDF estará disponível numa versão futura.\n\nUse a exportação CSV por enquanto.'),
    ("'Не вдалося завантажити дані ліфта'", "'Não foi possível carregar os dados do elevador'"),
    ("'Структура відповіді API не розпізнана'", "'Estrutura da resposta API não reconhecida'"),
    ("'Erro завантаження даних ліфта: '", "'Erro ao carregar dados do elevador: '"),
    ('"Erro завантаження даних ліфта: "', '"Erro ao carregar dados do elevador: "'),
    ("'Erro: Дані ліфта не завантажені'", "'Erro: Dados do elevador não carregados'"),
    ("'Не вдалося завантажити modelo: '", "'Não foi possível carregar o modelo: '"),
    ("'⚠️ Por favor, дозвольте спливаючі вікна для попереднього перегляду'",
     "'⚠️ Por favor, permita pop-ups para pré-visualização'"),
    ("'Erro попереднього перегляду: '", "'Erro na pré-visualização: '"),
    ('"Erro попереднього перегляду: "', '"Erro na pré-visualização: "'),
    ("'Erro: ID ліфта не визначено'", "'Erro: ID do elevador não definido'"),
    ("'Erro відправки звіту: '", "'Erro ao enviar relatório: '"),
    ('"Erro відправки звіту: "', '"Erro ao enviar relatório: "'),
    ("'❌ Por favor, оберіть тільки PDF ficheiros'", "'❌ Por favor, seleccione apenas ficheiros PDF'"),
    ("\"Заповніть обов'язкові поля: дата, тип, опис\"",
     '"Preencha os campos obrigatórios: data, tipo, descrição"'),
    ("'Sem dados для експорту'", "'Sem dados para exportar'"),
    ("'Não foi possível carregar o modelo: '", "'Não foi possível carregar o modelo: '"),
    ('Не вдалося автоматично проаналізувати PDF. Введіть дані вручну.',
     'Não foi possível analisar o PDF automaticamente. Introduza os dados manualmente.'),
    ('"Не вдалося автоматично проаналізувати PDF. Введіть дані вручну."',
     '"Não foi possível analisar o PDF automaticamente. Introduza os dados manualmente."'),
    ("'Координати не вказані'", "'Coordenadas não especificadas'"),
    ("'Erro мережі: '", "'Erro de rede: '"),
    ('"Erro мережі: "', '"Erro de rede: "'),
    ("'Err збереження'", "'Erro ao guardar'"),
    ('Err збереження', 'Erro ao guardar'),
    ("'Звіт інспекції guardado!'", "'Relatório de inspecção guardado!'"),
    ('"Звіт інспекції guardado!"', '"Relatório de inspecção guardado!"'),
    ('Звіт інспекції guardado успішно!', 'Relatório de inspecção guardado com sucesso!'),
    ('Втручання guardado!', 'Intervenção guardada!'),
    ('Втручання guardado успішно!', 'Intervenção guardada com sucesso!'),
    ("'Nevідома помилка'", "'Erro desconhecido'"),
    ("'Невідома помилка'", "'Erro desconhecido'"),
    ('"Невідома помилка"', '"Erro desconhecido"'),
    ('Невідома помилка', 'Erro desconhecido'),
    ("Erro: '+((res.data&&res.data.message)||'Невідома помилка')",
     "Erro: '+((res.data&&res.data.message)||'Erro desconhecido')"),
    ("'Erro збереження'", "'Erro ao guardar'"),

    # ── Export table headers ───────────────────────────────────────────────────
    ("const headers = ['ID', 'Назва', 'Адреса', 'Виробник', 'Модель', 'Місто', 'Статус', 'Дата створення'];",
     "const headers = ['ID', 'Nome', 'Endereço', 'Fabricante', 'Modelo', 'Cidade', 'Estado', 'Data de criação'];"),

    # ── CSV toastr ─────────────────────────────────────────────────────────────
    ("toastr.success('CSV ficheiro завантажено!');",
     "toastr.success('Ficheiro CSV descarregado!');"),

    # ── Throw messages ─────────────────────────────────────────────────────────
    ("throw new Error('Не вдалося завантажити дані ліфта');",
     "throw new Error('Não foi possível carregar os dados do elevador');"),
    ("throw new Error('Структура відповіді API не розпізнана');",
     "throw new Error('Estrutura da resposta API não reconhecida');"),

    # ── Contract modal ────────────────────────────────────────────────────────
    ('Завантажити контракт на обслуговування', 'Carregar contrato de manutenção'),
    ('Номер контракту', 'Número do contrato'),

    # ── Misc remaining ────────────────────────────────────────────────────────
    ('Скасовати', 'Cancelar'),
    ("Cancelarати", 'Cancelar'),
    ('<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelarати</button>',
     '<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>'),
    ('Impressãoувати', 'Imprimir'),
    ('>Detalhes звіту<', '>Detalhes do relatório<'),
    ('Detalhes звіту', 'Detalhes do relatório'),
    ('Визначає дату наступної інспекції', 'Determina a data da próxima inspecção'),
    ('<small class="form-text text-muted">Визначає дату наступної інспекції</small>',
     '<small class="form-text text-muted">Determina a data da próxima inspecção</small>'),
    ('Репонт', 'Reparação'),
    ('Ремонт', 'Reparação'),
    ('Ремонти', 'Reparações'),
    ('Аварії', 'Avarias'),
    ('Весь час', 'Todo o período'),
    ('Останні 30 днів', 'Últimos 30 dias'),
    ('Останні 3 місяці', 'Últimos 3 meses'),
    ('Останній рік', 'Último ano'),
    ('Останні 7 днів', 'Últimos 7 dias'),
    ('Планова', 'Planeada'),
    ('Позапланова', 'Não planeada'),
    ('Сертифікаційна', 'Certificação'),
    ('напр. CAM-LX-00456', 'ex. CAM-LX-00456'),
    ('напр. Gen2, MonoSpace', 'ex. Gen2, MonoSpace'),
    ('напр.', 'ex.'),
    ('Код доступу', 'Código de acesso'),

    # ── Placeholder text ───────────────────────────────────────────────────────
    ('placeholder="напр.', 'placeholder="ex.'),

    # ── Typo corrections from prior partial PT+UA hybrid ─────────────────────
    ('Tipo договору', 'Tipo de contrato'),
    ('Num. договору', 'Número do contrato'),
    ('Дата начала договору', 'Data de início do contrato'),
    ('Данні', 'Dados'),
    ('Дані', 'Dados'),

    # ── Common JS property access patterns ────────────────────────────────────
    ("'Manutenção planeada'", "'Manutenção planeada'"),
    ("type.value==='repair'?'Ремонт'", "type.value==='repair'?'Reparação'"),
    (":'Втручання'", ":'Intervenção'"),
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
