"""Pass 16: More 4x frequency patterns."""
from pathlib import Path

TRANSLATIONS = [
    ("'out-of-service': 'Não a funcionar',", "'out-of-service': 'Avariado',"),
    ("alert('Erro: ' + (result.message || result.error || 'Não вдалося додати звіт'));",
     "alert('Erro: ' + (result.message || result.error || 'Não foi possível adicionar o relatório'));"),
    ("console.log('ℹ️ Контракт відсутній:', apiError.message);",
     "console.log('ℹ️ Contrato ausente:', apiError.message);"),
    ("<strong>Período ações:</strong> ${periodText}<br>",
     "<strong>Período de acções:</strong> ${periodText}<br>"),
    ("<i class=\"fas fa-envelope\"></i> Надіслати Email",
     "<i class=\"fas fa-envelope\"></i> Enviar Email"),
    ("console.log('📄 Відкриття форми контракту для do elevador:', liftId);",
     "console.log('📄 A abrir formulário de contrato para elevador:', liftId);"),
    ("`.replace('and', 'и')", "`.replace('and', 'e')"),
    ("const token = AuthManager.getAuthToken(); // Виправлено: getAuthToken замість getToken",
     "const token = AuthManager.getAuthToken(); // Corrigido: getAuthToken em vez de getToken"),
    ("? `Contrato успішно завантажено та застосовано до ${sharedCount + 1} elevadores neste endereço!`",
     "? `Contrato carregado e aplicado com sucesso a ${sharedCount + 1} elevadores neste endereço!`"),
    ("console.error('❌ Помилка надсилання контракту:', error);",
     "console.error('❌ Erro ao enviar contrato:', error);"),
    ("console.error('❌ Помилка видалення контракту:', error);",
     "console.error('❌ Erro ao eliminar contrato:', error);"),
    ("console.log('📊 Ініціалізація обробників експорту...');",
     "console.log('📊 A inicializar processadores de exportação...');"),
    ("console.log('🔍 Застосування фільтрів:', { searchQuery, statusValue, typeValue });",
     "console.log('🔍 A aplicar filtros:', { searchQuery, statusValue, typeValue });"),
    ("console.log(`✅ Resultado фільтрації: ${filtered.length} з ${window.allLiftsData.length}`);",
     "console.log(`✅ Resultado de filtro: ${filtered.length} de ${window.allLiftsData.length}`);"),
    ("console.log('✅ Обробник фільтру статусу додано');",
     "console.log('✅ Processador de filtro de estado adicionado');"),
    ("console.warn('⚠️ Filtro statusFilter не encontrado');",
     "console.warn('⚠️ Filtro statusFilter não encontrado');"),
    ("console.log('✅ Обробник фільтру типу додано');",
     "console.log('✅ Processador de filtro de tipo adicionado');"),
    ("console.warn('⚠️ Filtro typeFilter не encontrado');",
     "console.warn('⚠️ Filtro typeFilter não encontrado');"),
    ("console.log('✅ Обробник пошуку atualizado для роботи з фільтрами');",
     "console.log('✅ Processador de pesquisa actualizado para trabalhar com filtros');"),
    ("console.log('✅ CSV експортовано успішно');",
     "console.log('✅ CSV exportado com sucesso');"),
    ("console.error('❌ Помилка експорту CSV:', error);",
     "console.error('❌ Erro ao exportar CSV:', error);"),
    ("console.log('✅ Обробник CSV додано');",
     "console.log('✅ Processador CSV adicionado');"),
    ("console.warn('⚠️ Кнопка exportCSVBtn не знайдена');",
     "console.warn('⚠️ Botão exportCSVBtn não encontrado');"),
    ("console.log('✅ Обробник PDF додано');",
     "console.log('✅ Processador PDF adicionado');"),
    ("console.warn('⚠️ Кнопка exportPDFBtn не знайдена');",
     "console.warn('⚠️ Botão exportPDFBtn não encontrado');"),
    ("console.log('🏛️ Відкриття модального вікна municípioу для do elevador:', liftId);",
     "console.log('🏛️ A abrir janela do município para elevador:', liftId);"),
    ("console.log('📦 Municipality modal - повна відповідь API:', result);",
     "console.log('📦 Janela do município - resposta completa da API:', result);"),
    ("console.log('✅ Dados ліфта завантажено:', lift);",
     "console.log('✅ Dados do elevador carregados:', lift);"),
    ("console.log('🔍 Pesquisar municípioу для postal code:', postalCode);",
     "console.log('🔍 A pesquisar município para código postal:', postalCode);"),
    ("console.log('✅ Витягнуто з munResult.data.data (подвійна обгортка)');",
     "console.log('✅ Extraído de munResult.data.data (invólucro duplo)');"),
    ("console.log('✅ Використано munResult.data напряму (має name)');",
     "console.log('✅ Usado munResult.data directamente (tem name)');"),
    ("console.log('✅ Використано munResult.data напряму (має postal_codes)');",
     "console.log('✅ Usado munResult.data directamente (tem postal_codes)');"),
    ("console.error('❌ Не encontrado даних municípioу в відповіді');",
     "console.error('❌ Dados do município não encontrados na resposta');"),
    ("console.error('❌ Помилка відкриття модального вікна municípioу:', error);",
     "console.error('❌ Erro ao abrir janela do município:', error);"),
    ("throw new Error(`Não вдалося descarregar modelo: ${response.statusText}`);",
     "throw new Error(`Não foi possível descarregar modelo: ${response.statusText}`);"),
    ("console.log('✅ Preview aberto успішно');",
     "console.log('✅ Pré-visualização aberta com sucesso');"),
    ("console.error('❌ Помилка попереднього перегляду:', error);",
     "console.error('❌ Erro na pré-visualização:', error);"),
    ("console.log('📤 Відправка звіту до municípioу...');",
     "console.log('📤 A enviar relatório ao município...');"),
    ("console.log('📧 Dados для відправки:', {",
     "console.log('📧 Dados para envio:', {"),
    ("console.error('❌ Помилка відправки звіту:', error);",
     "console.error('❌ Erro ao enviar relatório:', error);"),
    ("console.log('🔧 Definições інтеграції парсера PDF звітів...');",
     "console.log('🔧 A configurar integração do parser de PDF de relatórios...');"),
    ("console.log('📄 PDF ficheiro вибрано:', file.name);",
     "console.log('📄 Ficheiro PDF seleccionado:', file.name);"),
    ("console.log('🔍 Поchatок парсингу PDF...');",
     "console.log('🔍 A iniciar parsing do PDF...');"),
    ("console.log('✅ PDF успішно проаналізовано:', parsedData);",
     "console.log('✅ PDF analisado com sucesso:', parsedData);"),
    ("console.log('📝 Компанія обслуговування:', parsedData.liftInfo.maintenanceCompany);",
     "console.log('📝 Empresa de manutenção:', parsedData.liftInfo.maintenanceCompany);"),
    ("console.log('✅ Статус instalado:', status);",
     "console.log('✅ Estado instalado:', status);"),
    ("console.log(`✅ Додано ${parsedData.clauses.length} клауз до коментарів`);",
     "console.log(`✅ ${parsedData.clauses.length} cláusulas adicionadas aos comentários`);"),
    ("console.error('❌ Помилка парсингу PDF:', error);",
     "console.error('❌ Erro no parsing do PDF:', error);"),
    ("console.log('✅ Integração парсера PDF налаштована');",
     "console.log('✅ Integração do parser PDF configurada');"),
    ("console.warn('⚠️ Парсер PDF або поле вводу не знайдені');",
     "console.warn('⚠️ Parser PDF ou campo de entrada não encontrados');"),
    ("alert('Для виконання цієї ações потрібна autorização.\\nPor favor, увійдіть через сторінку логіну.');",
     "alert('É necessária autenticação para esta acção.\\nPor favor, entre através da página de login.');"),
    ("alert('Ваша сесія закінчилась.\\nPor favor, увійдіть знову.');",
     "alert('A sua sessão expirou.\\nPor favor, entre novamente.');"),
    ("<a href=\"monitoring.html\" class=\"nav-link\">Моніторинг</a>",
     "<a href=\"monitoring.html\" class=\"nav-link\">Monitorização</a>"),
    ("placeholder=\"Напишіть mensagem...\">",
     "placeholder=\"Escreva uma mensagem...\">"),
    ("<button class=\"ai-send-message\"><i class=\"fas fa-paper-plane\"></i> Надіслати</button>",
     "<button class=\"ai-send-message\"><i class=\"fas fa-paper-plane\"></i> Enviar</button>"),
    ("<button class=\"ai-voice-toggle\"><i class=\"fas fa-microphone\"></i> Голос</button>",
     "<button class=\"ai-voice-toggle\"><i class=\"fas fa-microphone\"></i> Voz</button>"),
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
