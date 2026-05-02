"""Pass 9: Targeting lifts modal forms, tech inspections, assignments remaining patterns."""
from pathlib import Path

TRANSLATIONS = [
    # ── Modal titles ─────────────────────────────────────────────────────────
    ('Adicionar elevador з картою', 'Adicionar elevador com mapa'),
    ('Guardar elevador з картою', 'Guardar elevador com mapa'),
    ('Adicionar relatório інспекції', 'Adicionar relatório de inspecção'),
    ('Adicionar втручання', 'Adicionar intervenção'),
    ('Guardar звіт інспекції', 'Guardar relatório de inspecção'),
    ('Guardar втручання', 'Guardar intervenção'),

    # ── Tab navigation ────────────────────────────────────────────────────────
    ('<i class="fas fa-map-marker-alt"></i> Localização і карта',
     '<i class="fas fa-map-marker-alt"></i> Localização e mapa'),
    ('<i class="fas fa-user"></i> Клієнт',
     '<i class="fas fa-user"></i> Cliente'),
    ('<i class="fas fa-wrench"></i> Технічні дані',
     '<i class="fas fa-wrench"></i> Dados técnicos'),
    ('<!-- Навігація табами -->', '<!-- Navegação por separadores -->'),
    ('<i class="fas fa-clipboard-check"></i> Технічні інспекції',
     '<i class="fas fa-clipboard-check"></i> Inspecções técnicas'),
    ('<!-- Технічні інспекції -->', '<!-- Inspecções técnicas -->'),
    ('<!-- Технічні дані -->', '<!-- Dados técnicos -->'),
    ('<!-- Динамічні поля для муніципальних номерів додаткових ліфтів -->',
     '<!-- Campos dinâmicos para números municipais de elevadores adicionais -->'),

    # ── Form labels ───────────────────────────────────────────────────────────
    ('placeholder="Муніципальний номер"', 'placeholder="Número municipal"'),
    ('placeholder="Муніципальний номер ліфта"', 'placeholder="Número municipal do elevador"'),
    ('<i class="fas fa-info-circle"></i> QR-код генерується автоматично',
     '<i class="fas fa-info-circle"></i> Código QR gerado automaticamente'),
    ('<label for="enhancedLiftsCountAtAddress">Quantidade ліфтів</label>',
     '<label for="enhancedLiftsCountAtAddress">Quantidade de elevadores</label>'),
    ('<small class="form-text text-muted">Скільки ліфтів у цій будівлі</small>',
     '<small class="form-text text-muted">Quantos elevadores neste edifício</small>'),
    ('<!-- QR-код для основного ліфта -->', '<!-- QR code do elevador principal -->'),
    ('<!-- QR код основного ліфта буде тут -->', '<!-- QR code do elevador principal aqui -->'),
    ('<i class="fas fa-plus-circle"></i> Додаткові ліфти',
     '<i class="fas fa-plus-circle"></i> Elevadores adicionais'),
    ('<!-- Тут будуть динамічно додаватися поля -->',
     '<!-- Os campos serão adicionados dinamicamente aqui -->'),
    ('<option value="">Seleccione бренд...</option>',
     '<option value="">Seleccione a marca...</option>'),
    ('<label for="enhancedLiftModel">Модель ліфта</label>',
     '<label for="enhancedLiftModel">Modelo do elevador</label>'),
    ('placeholder="Наприклад: Otis Gen2, KONE MonoSpace"',
     'placeholder="Ex: Otis Gen2, KONE MonoSpace"'),
    ('<label for="enhancedLiftCapacity">Capacidade de carga (кг)</label>',
     '<label for="enhancedLiftCapacity">Capacidade de carga (kg)</label>'),
    ('<i class="fas fa-info-circle"></i> Quantidade pessoas розраховується автоматично (1 особа ≈ 75 кг)',
     '<i class="fas fa-info-circle"></i> Quantidade de pessoas calculada automaticamente (1 pessoa ≈ 75 kg)'),
    ('placeholder="Rua Хрещатик, 1"', 'placeholder="Rua Principal, 1"'),
    ('placeholder="Autoматично визначається"', 'placeholder="Determinado automaticamente"'),
    ('placeholder="Autoматично визначається з адреси"', 'placeholder="Determinado automaticamente a partir do endereço"'),
    ('<p class="text-muted">Клікніть на карту щоб встановити розташування ліфта</p>',
     '<p class="text-muted">Clique no mapa para definir a localização do elevador</p>'),
    ('<!-- Клієнт -->', '<!-- Cliente -->'),
    ('<label for="enhancedClientName">Ім\'я клієнта</label>',
     '<label for="enhancedClientName">Nome do cliente</label>'),
    ('placeholder="Повне ім\'я клієнта"', 'placeholder="Nome completo do cliente"'),
    ('<label for="enhancedClientEmail">Email клієнта *</label>',
     '<label for="enhancedClientEmail">Email do cliente *</label>'),
    ('<small class="form-text text-muted">Для групування ліфтів ОСББ та інших клієнтів</small>',
     '<small class="form-text text-muted">Para agrupar elevadores de condomínios e outros clientes</small>'),
    ('<label for="enhancedClientPhone">Telefone клієнта</label>',
     '<label for="enhancedClientPhone">Telefone do cliente</label>'),
    ('placeholder="Менеджер, адміністратор..."',
     'placeholder="Gestor, administrador..."'),
    ('<small class="text-muted d-block">Тільки якщо для цього email ще не існує облікового registo</small>',
     '<small class="text-muted d-block">Apenas se não existir ainda conta com este email</small>'),
    ('<small class="form-text text-muted">Código доступу до entradaу або будівлі</small>',
     '<small class="form-text text-muted">Código de acesso à entrada ou edifício</small>'),
    ('<label for="enhancedLiftStatus">Статус ліфта</label>',
     '<label for="enhancedLiftStatus">Estado do elevador</label>'),

    # ── Inspection section ────────────────────────────────────────────────────
    ('<label for="enhancedInspectionFrequency">Periodicidade (міс.)</label>',
     '<label for="enhancedInspectionFrequency">Periodicidade (meses)</label>'),
    ('placeholder="Записи про manutenção"', 'placeholder="Registo de manutenção"'),
    ('<!-- Кнопка додавання звіту -->', '<!-- Botão para adicionar relatório -->'),
    ('<i class="fas fa-plus"></i> Adicionar relatório інспекції',
     '<i class="fas fa-plus"></i> Adicionar relatório de inspecção'),
    ('<i class="fas fa-clipboard-check mr-2"></i>Adicionar relatório інспекції',
     '<i class="fas fa-clipboard-check mr-2"></i>Adicionar relatório de inspecção'),

    # ── Contract modal ────────────────────────────────────────────────────────
    ('(optional — при відсутності продовжується автоматично)',
     '(opcional — se ausente é renovado automaticamente)'),

    # ── Intervention modal ────────────────────────────────────────────────────
    ('<label for="intStatus">Статус *</label>',
     '<label for="intStatus">Estado *</label>'),

    # ── Inspection report ─────────────────────────────────────────────────────
    ('<option value="certification">Сертифікація</option>',
     '<option value="certification">Certificação</option>'),
    ('<i class="fas fa-robot mr-1"></i> Analisar PDF автоматично',
     '<i class="fas fa-robot mr-1"></i> Analisar PDF automaticamente'),
    ('<small class="text-muted ml-2">Витягне дані інспекції з PDF звіту</small>',
     '<small class="text-muted ml-2">Extrai dados de inspecção do relatório PDF</small>'),
    ('<small class="text-muted">Аналізуємо PDF...</small>',
     '<small class="text-muted">A analisar PDF...</small>'),
    ('<small><i class="fas fa-robot mr-1"></i> <strong>Витягнуті дані — перевірте та підтвердіть</strong></small>',
     '<small><i class="fas fa-robot mr-1"></i> <strong>Dados extraídos — verifique e confirme</strong></small>'),
    ('<strong>Адреса:</strong> <span id="dispPdfSumAddress">—</span><br>',
     '<strong>Endereço:</strong> <span id="dispPdfSumAddress">—</span><br>'),
    ('<i class="fas fa-check mr-1"></i> Застосувати в форму',
     '<i class="fas fa-check mr-1"></i> Aplicar no formulário'),
    ('<i class="fas fa-times mr-1"></i> Ввести вручну',
     '<i class="fas fa-times mr-1"></i> Introduzir manualmente'),
    ('<i class="fas fa-eye mr-1"></i>Переглянути',
     '<i class="fas fa-eye mr-1"></i>Ver'),
    ('<!-- Спрощена інформація -->', '<!-- Informação simplificada -->'),
    ('<h3 class="card-title"><i class="fas fa-calendar mr-2"></i>Додаткова інформація</h3>',
     '<h3 class="card-title"><i class="fas fa-calendar mr-2"></i>Informação adicional</h3>'),
    ('<label>Autoматичне оновлення</label>', '<label>Actualização automática</label>'),
    ('Actualizar дати ТО в основній інформації ліфта',
     'Actualizar datas de manutenção na informação principal do elevador'),
    ('Autoматично оновить "Última manutenção" на дату цієї інспекції та розрахує "Próxima manutenção"',
     'Actualiza automaticamente "Última manutenção" para a data desta inspecção e calcula "Próxima manutenção"'),
    ('<label for="maintenanceFrequencyOverride">Periodicidade para наступного ТО</label>',
     '<label for="maintenanceFrequencyOverride">Periodicidade para próxima manutenção</label>'),
    ('Periodicidade para наступного ТО', 'Periodicidade para próxima manutenção'),
    ('<option value="">Використати стандартну (з налаштувань ліфта)</option>',
     '<option value="">Usar padrão (das configurações do elevador)</option>'),
    ('<option value="3">Через 3 місяці</option>', '<option value="3">Daqui a 3 meses</option>'),
    ('<option value="6">Через 6 місяців</option>', '<option value="6">Daqui a 6 meses</option>'),
    ('<option value="12">Через 12 місяців</option>', '<option value="12">Daqui a 12 meses</option>'),
    ('<option value="24">Через 24 місяці</option>', '<option value="24">Daqui a 24 meses</option>'),
    ('Залишіть порожнім для використання стандартної періодичності ліфта',
     'Deixe em branco para usar a periodicidade padrão do elevador'),
    ('<label for="inspectionComments">Comentários інспектора</label>',
     '<label for="inspectionComments">Comentários do inspector</label>'),
    ('placeholder="Введіть коментарі, recomendações, виявлені недоліки або інші примітки..."',
     'placeholder="Introduza comentários, recomendações, defeitos detectados ou outras notas..."'),
    ('<small class="form-text text-muted">Необов\'язкове поле для додаткової інформації</small>',
     '<small class="form-text text-muted">Campo opcional para informação adicional</small>'),
    ('<label for="nextInspectionDateField">Próxima inspecção / дійсний до</label>',
     '<label for="nextInspectionDateField">Próxima inspecção / válido até</label>'),
    ('<small class="text-muted">Заповнюється автоматично при аналізі PDF (2 роки або 30 днів якщо є С2)</small>',
     '<small class="text-muted">Preenchido automaticamente ao analisar PDF (2 anos ou 30 dias se C2)</small>'),
    ('<small><i class="fas fa-info-circle"></i> Переконайтеся, що всі поля заповнені</small>',
     '<small><i class="fas fa-info-circle"></i> Certifique-se de que todos os campos estão preenchidos</small>'),

    # ── Assignments page ──────────────────────────────────────────────────────
    ('Atribuição техніка', 'Atribuição de técnico'),
    ('Призначити техніка', 'Atribuir técnico'),
    ('Доступні техніки', 'Técnicos disponíveis'),
    ('Технік недоступний', 'Técnico indisponível'),
    ('Немає вільних техніків', 'Sem técnicos disponíveis'),
    ('Оновити призначення', 'Actualizar atribuição'),
    ('Видалити призначення', 'Eliminar atribuição'),
    ('Без техніка', 'Sem técnico'),
    ('Назад до pedidos', 'Voltar aos pedidos'),
    ('Нові pedidos', 'Novos pedidos'),
    ('Очікує призначення', 'Aguarda atribuição'),
    ('Час підготовки', 'Tempo de preparação'),
    ('Відповідальний', 'Responsável'),
    ('Відповідальний технік', 'Técnico responsável'),
    ('Рекомендована', 'Recomendada'),

    # ── Lift card viewer ──────────────────────────────────────────────────────
    ('<!-- Клієнт -->', '<!-- Cliente -->'),
    ('<i class="fas fa-building mr-1"></i>Місто:', '<i class="fas fa-building mr-1"></i>Cidade:'),
    ('ліфта:', 'do elevador:'),
    ('Ліфтів:', 'Elevadores:'),

    # ── JS messages in lifts files ────────────────────────────────────────────
    ("'Завантаження ліфтів...'", "'A carregar elevadores...'"),
    ("'Ліфт завантажено'", "'Elevador carregado'"),
    ("'Помилка завантаження ліфтів'", "'Erro ao carregar elevadores'"),
    ("'Ліфт збережено'", "'Elevador guardado'"),
    ("'Ліфт видалено'", "'Elevador eliminado'"),
    ("'Помилка збереження'", "'Erro ao guardar'"),
    ("'Підтвердіть видалення'", "'Confirmar eliminação'"),
    ("'Завантаження...'", "'A carregar...'"),
    ("'Оновлення...'", "'A actualizar...'"),
    ("'Збереження...'", "'A guardar...'"),
    ("'Немає даних'", "'Sem dados'"),
    ("'Помилка'", "'Erro'"),

    # ── Misc remaining ────────────────────────────────────────────────────────
    ('Autoматично визначається', 'Determinado automaticamente'),
    ('Munícipal номер', 'Número municipal'),
    ('Муніципальний номер', 'Número municipal'),
    ('Місто:', 'Cidade:'),
    ('Флоренція', 'Florença'),
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
