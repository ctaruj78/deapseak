"""Pass 10: JS console/alert/toastr mixed strings and remaining form patterns."""
from pathlib import Path

TRANSLATIONS = [
    # ── Alerts ────────────────────────────────────────────────────────────────
    ("alert('Por favor, вкажіть дату інспекції');",
     "alert('Por favor, indique a data de inspecção');"),
    ("alert('Por favor, вкажіть email клієнта для сповіщень');",
     "alert('Por favor, indique o email do cliente para notificações');"),
    ("alert('Por favor, оберіть тільки PDF ficheiros');",
     "alert('Por favor, seleccione apenas ficheiros PDF');"),
    ("alert('❌ Erro: Не всі поля форми знайдені!')",
     "alert('❌ Erro: Nem todos os campos do formulário foram encontrados!')"),
    ("alert('❌ Erro: Введіть ім\\'я інспектора')",
     "alert('❌ Erro: Introduza o nome do inspector')"),
    ("alert('❌ Erro: Seleccione дату інспекції')",
     "alert('❌ Erro: Seleccione a data de inspecção')"),
    ("alert('❌ Не вдалося визначити ліфт. Закрийте модальне вікно і спробуйте знову.')",
     "alert('❌ Não foi possível identificar o elevador. Feche a janela e tente novamente.')"),
    ("alert('❌ Помилка збереження звіту: ' + error.message)",
     "alert('❌ Erro ao guardar relatório: ' + error.message)"),
    ("alert('❌ Помилка збереження: ' + error.message)",
     "alert('❌ Erro ao guardar: ' + error.message)"),
    ("alert('Por favor, завантажте PDF звіт інспекції');",
     "alert('Por favor, carregue o relatório PDF de inspecção');"),
    ("alert('Por favor, вкажіть ім\\'я інспектора');",
     "alert('Por favor, indique o nome do inspector');"),
    ("alert('Por favor, оберіть тип інспекції');",
     "alert('Por favor, seleccione o tipo de inspecção');"),
    ("alert('Споchatку завантажте PDF ficheiro');",
     "alert('Primeiro carregue o ficheiro PDF');"),
    ("if (confirm('Cancelar цю інспекцію?')) {",
     "if (confirm('Cancelar esta inspecção?')) {"),

    # ── Toastr messages ───────────────────────────────────────────────────────
    ("toastr.success('Інспекція успішно заплановано!');",
     "toastr.success('Inspecção planeada com sucesso!');"),
    ("toastr.success('Інспекція скасована');",
     "toastr.success('Inspecção cancelada');"),
    ("toastr.success('✅ Звіт інспекції guardado!');",
     "toastr.success('✅ Relatório de inspecção guardado!');"),
    ("toastr.warning(data.message || 'Não вдалося розпізнати PDF. Заповніть вручну.')",
     "toastr.warning(data.message || 'Não foi possível reconhecer o PDF. Preencha manualmente.')"),
    ("toastr.error('Erro аналізу: ' + err.message)",
     "toastr.error('Erro de análise: ' + err.message)"),
    ("toastr.success('Dados з PDF застосовано. Перевірте та збережіть.')",
     "toastr.success('Dados do PDF aplicados. Verifique e guarde.')"),
    ("toastr.error(`❌ Помилка відправки email: ${result.error}`)",
     "toastr.error(`❌ Erro ao enviar email: ${result.error}`)"),
    ("toastr.error('❌ Não вдалося відправити email нагадування')",
     "toastr.error('❌ Não foi possível enviar o email de lembrete')"),

    # ── Console log messages ──────────────────────────────────────────────────
    ("console.log('🗺️ Ініціалізація карти для нового ліфта...');",
     "console.log('🗺️ A inicializar mapa para novo elevador...');"),
    ("console.log('✅ Карта створення - додатковий invalidateSize()');",
     "console.log('✅ Mapa de criação - invalidateSize() adicional');"),
    ("console.warn('⚠️ Елемент scheduledInspections не encontrado на сторінці');",
     "console.warn('⚠️ Elemento scheduledInspections não encontrado na página');"),
    ("console.log(`Email заплановано на ${notificationDate.toLocaleString()}`);",
     "console.log(`Email agendado para ${notificationDate.toLocaleString()}`);"),
    ("console.error('JWT token не encontrado');",
     "console.error('JWT token não encontrado');"),
    ("console.error('Erro відправки inspection email:', error);",
     "console.error('Erro ao enviar email de inspecção:', error);"),
    ("console.log('🏗️ currentLiftId ініціалізовано');",
     "console.log('🏗️ currentLiftId inicializado');"),
    ("console.log('🚪 ГЛОБАЛЬНА функція закриття модального вікна інспекції...');",
     "console.log('🚪 Função GLOBAL de fecho da janela de inspecção...');"),
    ("console.log('Encontrado модальних вікон:', allModals.length);",
     "console.log('Janelas encontradas:', allModals.length);"),
    ("console.log('❌ Видаляємо ВСІ дублікати...');",
     "console.log('❌ A remover TODOS os duplicados...');"),
    ("console.log('🧹 Видаляємо ВСІ backdrop\\'и:', backdrops.length);",
     "console.log('🧹 A remover TODOS os backdrops:', backdrops.length);"),
    ("console.log('✅ Модальне вікно успішно fechado');",
     "console.log('✅ Janela fechada com sucesso');"),
    ("console.error('❌ Помилка при закритті модального вікна:', error);",
     "console.error('❌ Erro ao fechar a janela:', error);"),
    ("console.log('🏗️ currentLiftId з enhanced modal:', window.currentLiftId);",
     "console.log('🏗️ currentLiftId do modal melhorado:', window.currentLiftId);"),
    ("console.log('🏗️ currentLiftId з dataset:', window.currentLiftId);",
     "console.log('🏗️ currentLiftId do dataset:', window.currentLiftId);"),
    ("console.warn('⚠️ Не вдалося визначити liftId');",
     "console.warn('⚠️ Não foi possível determinar liftId');"),
    ("backdrop: 'static', // Не дозволяємо закриття по кліку поза модалом",
     "backdrop: 'static', // Não permitir fecho ao clicar fora da janela"),
    ("keyboard: true      // Дозволяємо закриття по ESC",
     "keyboard: true      // Permitir fecho com ESC"),
    ("console.log('🎯 Поле інспектора розблоковано та activado');",
     "console.log('🎯 Campo do inspector desbloqueado e activado');"),
    ("console.log('💬 Поле коментарів розблоковано');",
     "console.log('💬 Campo de comentários desbloqueado');"),
    ("certType === 'immobilization' ? '❌ Іmmобілізація' : '⚠️ Reinspecção'",
     "certType === 'immobilization' ? '❌ Imobilização' : '⚠️ Reinspecção'"),
    ("certType === 'immobilization' ? '❌ Іммобілізація' : '⚠️ Reinspecção'",
     "certType === 'immobilization' ? '❌ Imobilização' : '⚠️ Reinspecção'"),
    ("console.log('💾 === КНОПКА ЗБЕРЕЖЕННЯ НАТИСНУТА ===');",
     "console.log('💾 === BOTÃO GUARDAR PREMIDO ===');"),
    ("console.log('📋 Значення полів:', {",
     "console.log('📋 Valores dos campos:', {"),
    ("console.error('❌ Помилка при виклику saveInspectionReport:', error);",
     "console.error('❌ Erro ao chamar saveInspectionReport:', error);"),
    ("console.error('❌ Кнопка збереження не знайдена!');",
     "console.error('❌ Botão de guardar não encontrado!');"),
    ("console.log('✅ Форма звіту інспекції ініціалізована');",
     "console.log('✅ Formulário do relatório de inspecção inicializado');"),
    ("console.log('🔍 === DEBUG МОДАЛЬНОГО ВІКНА ===');",
     "console.log('🔍 === DEBUG DA JANELA MODAL ===');"),
    ("console.error('❌ ЗНАЙДЕНО ДУБЛІКАТИ МОДАЛЬНОГО ВІКНА!');",
     "console.error('❌ DUPLICADOS DA JANELA MODAL ENCONTRADOS!');"),
    ("console.log('🔓 Модальне вікно aberto, запуск debug...');",
     "console.log('🔓 Janela modal aberta, a iniciar debug...');"),
    ("inspectorNameField.select(); // Виділяємо текст для зручності редагування",
     "inspectorNameField.select(); // Seleccionamos o texto para facilitar a edição"),
    ("};        console.log('=== ВАЛІДАЦІЯ ФОРМИ ===');",
     "};        console.log('=== VALIDAÇÃO DO FORMULÁRIO ===');"),
    ("console.error(`Поле ${key} не encontrado в DOM`);",
     "console.error(`Campo ${key} não encontrado no DOM`);"),
    ("alert(`Erro: поле ${key} не encontrado`);",
     "alert(`Erro: campo ${key} não encontrado`);"),
    ("console.log('💾 === ЗБЕРЕЖЕННЯ ЗВІТУ ІНСПЕКЦІЇ ===');",
     "console.log('💾 === A GUARDAR RELATÓRIO DE INSPECÇÃO ===');"),
    ("console.log('🔍 Verificação полів:', {",
     "console.log('🔍 Verificação dos campos:', {"),
    ("console.error('❌ Не всі поля форми знайдені!');",
     "console.error('❌ Nem todos os campos do formulário foram encontrados!');"),
    ("console.log('📋 Dados з полів:', {",
     "console.log('📋 Dados dos campos:', {"),
    ("; // стандартно 6 місяців", "; // padrão 6 meses"),
    ("// YYYY-MM-DD формат", "// formato YYYY-MM-DD"),
    ("console.log('🏗️ Збереження звіту через API для do elevador:', liftId);",
     "console.log('🏗️ A guardar relatório via API para elevador:', liftId);"),
    ("console.log('✅ Звіт успішно guardado на сервері!');",
     "console.log('✅ Relatório guardado com sucesso no servidor!');"),
    ("console.error('❌ Помилка збереження:', error);",
     "console.error('❌ Erro ao guardar:', error);"),
    ("console.log('🔄 Оновлення дат ТО та даних інспекції для do elevador:', liftId);",
     "console.log('🔄 A actualizar datas de manutenção e dados de inspecção para elevador:', liftId);"),
    ("console.log('✅ Дати ТО та дані інспекції atualizado для do elevador:', lifts[i].municipalNumber);",
     "console.log('✅ Datas de manutenção e dados de inspecção actualizados para elevador:', lifts[i].municipalNumber);"),
    ("console.log('✅ Dados ліфта atualizado успішно');",
     "console.log('✅ Dados do elevador actualizados com sucesso');"),
    ("console.warn('⚠️ Ліфт з ID', liftId, 'не encontrado');",
     "console.warn('⚠️ Elevador com ID', liftId, 'não encontrado');"),
    ("console.error('❌ Помилка оновлення дат ТО:', error);",
     "console.error('❌ Erro ao actualizar datas de manutenção:', error);"),

    # ── Template text ─────────────────────────────────────────────────────────
    ("Інспекції не заплановані. Додайте дату інспекції вище.",
     "Nenhuma inspecção planeada. Adicione uma data de inspecção acima."),
    ("${daysUntil > 0 ? `Залишилося ${daysUntil} днів` : 'Інспекція сьогодні!'}",
     "${daysUntil > 0 ? `Faltam ${daysUntil} dias` : 'Inspecção hoje!'}"),
    ("subject: `Нагадування про інспекцію ліфта - ${formattedDate}`,",
     "subject: `Lembrete de inspecção do elevador - ${formattedDate}`,"),
    ("toastr.success(`✅ Email нагадування enviado на ${inspection.clientEmail}`)",
     "toastr.success(`✅ Email de lembrete enviado para ${inspection.clientEmail}`)"),
    ("// Максимальний setTimeout", "// Máximo setTimeout"),
    ("<h5 class=\"modal-title\">Enviar relatório інспекції на email</h5>",
     "<h5 class=\"modal-title\">Enviar relatório de inspecção por email</h5>"),

    # ── Remaining form/label patterns ─────────────────────────────────────────
    ("placeholder=\"Munícipal номер\"", "placeholder=\"Número municipal\""),
    ("placeholder=\"Муніципальний номер\"", "placeholder=\"Número municipal\""),
    ("Atribuição техніка", "Atribuição de técnico"),

    # ── Common recurring JS strings ───────────────────────────────────────────
    ("'Завантаження ліфтів...'", "'A carregar elevadores...'"),
    ("'Ліфт збережено'", "'Elevador guardado'"),
    ("'Ліфт видалено'", "'Elevador eliminado'"),
    ("'Підтвердіть видалення'", "'Confirmar eliminação'"),
    ("'Збереження...'", "'A guardar...'"),
    ("'Немає даних'", "'Sem dados'"),
    ("Рекомендована мат. підтримка", "Manutenção recomendada"),
    ("'Ліфт не можна видалити з активними контрактами'",
     "'Não é possível eliminar o elevador com contratos activos'"),
    ("Ліфт та договір", "Elevador e contrato"),
    ("Переглянути ліфт", "Ver elevador"),
    ("Редагувати ліфт", "Editar elevador"),
    ("Видалити ліфт", "Eliminar elevador"),
    ("Статус ліфта:", "Estado do elevador:"),
    ("переглянути картку ліфта", "ver ficha do elevador"),
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
