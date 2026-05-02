"""Pass 11: JS console/alert/toastr strings in lifts files."""
from pathlib import Path

TRANSLATIONS = [
    # ── Toastr ───────────────────────────────────────────────────────────────
    ("toastr.info(`QR код автоматично criado для ліфта ${data.liftId}`);",
     "toastr.info(`Código QR criado automaticamente para o elevador ${data.liftId}`);"),
    ("toastr.success('Координати encontrado!', 'Геокодування')",
     "toastr.success('Coordenadas encontradas!', 'Geocodificação')"),

    # ── Console ───────────────────────────────────────────────────────────────
    ("console.log('📊 Оновлюємо статистику QR кодів');",
     "console.log('📊 A actualizar estatísticas de códigos QR');"),
    ("console.log('📅 Інспекція заплановано, налаштовуємо автоматичні сповіщення');",
     "console.log('📅 Inspecção planeada, a configurar notificações automáticas');"),
    ("console.log(`📧 Буде enviado email на ${data.clientEmail} за ${data.notificationDays} днів`);",
     "console.log(`📧 Email será enviado para ${data.clientEmail} em ${data.notificationDays} dias`);"),
    ("console.log('📧 Email успішно enviado:', data);",
     "console.log('📧 Email enviado com sucesso:', data);"),
    ("console.warn('⚠️ EventBus не encontrado, деякі автоматичні функції не працюватимуть');",
     "console.warn('⚠️ EventBus não encontrado, algumas funções automáticas não funcionarão');"),
    ("console.log('✅ Voice Control готовий');",
     "console.log('✅ Voice Control pronto');"),
    ("voiceControl.addCustomCommand('mostrar список ліфтів', () => {",
     "voiceControl.addCustomCommand('mostrar lista de elevadores', () => {"),
    ("voiceControl.speak('Показую список ліфтів');",
     "voiceControl.speak('A mostrar lista de elevadores');"),
    ("voiceControl.addCustomCommand('відкрити статистику', () => {",
     "voiceControl.addCustomCommand('abrir estatísticas', () => {"),
    ("voiceControl.speak('Показую статистику');",
     "voiceControl.speak('A mostrar estatísticas');"),
    ("console.log('🔍 Діагностика навігації AI прогнозування запущена');",
     "console.log('🔍 Diagnóstico de navegação de previsão AI iniciado');"),
    ("console.log('✅ Encontrado посилання AI прогнозування:', aiLink);",
     "console.log('✅ Ligação de previsão AI encontrada:', aiLink);"),
    ("console.log('🎯 Клік по AI прогнозуванню зареєстровано!');",
     "console.log('🎯 Clique na previsão AI registado!');"),
    ("console.log('✅ Activado пункт меню AI прогнозування');",
     "console.log('✅ Item de menu de previsão AI activado');"),
    ("console.error('❌ Посилання AI прогнозування не encontrado!');",
     "console.error('❌ Ligação de previsão AI não encontrada!');"),
    ("console.log('📊 Клік по аналітиці зареєстровано!');",
     "console.log('📊 Clique em análise registado!');"),
    ("console.log('✅ Activado пункт меню Análise');",
     "console.log('✅ Item de menu de análise activado');"),
    ("console.log(`🔄 Відновлено активний пункт меню: ${activeMenuItem}`);",
     "console.log(`🔄 Item de menu activo restaurado: ${activeMenuItem}`);"),
    ("console.log('🚀 Ініціалізація Enhanced Lift Modal...');",
     "console.log('🚀 A inicializar Enhanced Lift Modal...');"),
    ("const maxAttempts = 50; // Максимум 5 секунд очікування",
     "const maxAttempts = 50; // Máximo 5 segundos de espera"),
    ("console.log('⏳ Очікування завантаження QRCode бібліотеки... (спроба ' + initAttempts + '/' + maxAttempts + ')');",
     "console.log('⏳ A aguardar o carregamento da biblioteca QRCode... (tentativa ' + initAttempts + '/' + maxAttempts + ')');"),
    ("console.log('⏳ Очікування завантаження EnhancedLiftModal класу... (спроба ' + initAttempts + '/' + maxAttempts + ')');",
     "console.log('⏳ A aguardar o carregamento da classe EnhancedLiftModal... (tentativa ' + initAttempts + '/' + maxAttempts + ')');"),
    ("console.log('✅ Enhanced Lift Modal ініціалізовано успішно!');",
     "console.log('✅ Enhanced Lift Modal inicializado com sucesso!');"),
    ("console.error('❌ Enhanced Lift Modal не готовий для генерації QR!');",
     "console.error('❌ Enhanced Lift Modal não pronto para geração de QR!');"),
    ("console.error('❌ Помилка ініціалізації Enhanced Lift Modal:', error);",
     "console.error('❌ Erro ao inicializar Enhanced Lift Modal:', error);"),
    ("console.log('📚 Verificação бібліотек:');",
     "console.log('📚 Verificação de bibliotecas:');"),
    ("console.log('  - QRCode:', typeof QRCode !== 'undefined' ? '✅' : '⏳ завантажується...');",
     "console.log('  - QRCode:', typeof QRCode !== 'undefined' ? '✅' : '⏳ a carregar...');"),
    ("console.log('  - EnhancedLiftModal:', typeof EnhancedLiftModal !== 'undefined' ? '✅' : '⏳ завантажується...');",
     "console.log('  - EnhancedLiftModal:', typeof EnhancedLiftModal !== 'undefined' ? '✅' : '⏳ a carregar...');"),
    ("console.log('🌍 Геокодування адреси...');",
     "console.log('🌍 A geocodificar endereço...');"),
    ("console.log('📍 Геокодування:', fullAddress);",
     "console.log('📍 Geocodificação:', fullAddress);"),
    ("console.log('✅ Геокодовано:', { lat, lon });",
     "console.log('✅ Geocodificado:', { lat, lon });"),
    ("layer.bindPopup(`<strong>${address}</strong><br><small>Перетягніть маркер для зміни позиції</small>`).openPopup();",
     "layer.bindPopup(`<strong>${address}</strong><br><small>Arraste o marcador para alterar a posição</small>`).openPopup();"),
    ("console.log('✅ Карта оновлена після геокодування');",
     "console.log('✅ Mapa actualizado após geocodificação');"),
    ("console.warn('⚠️ Адреса не знайдена');",
     "console.warn('⚠️ Endereço não encontrado');"),
    ("console.error('❌ Помилка геокодування:', error);",
     "console.error('❌ Erro de geocodificação:', error);"),
    ("console.log('✅ Обробник геокодування ligado');",
     "console.log('✅ Processador de geocodificação ligado');"),
    ("return { success: false, error: 'Не авторизований' };",
     "return { success: false, error: 'Não autenticado' };"),
    ("return { success: false, error: 'Erro авторизації' };",
     "return { success: false, error: 'Erro de autenticação' };"),
    ("console.log('✅ Elevadores завантажено з API:', lifts.length);",
     "console.log('✅ Elevadores carregados da API:', lifts.length);"),
    ("console.error('❌ API повернув не масив:', lifts);",
     "console.error('❌ API não retornou array:', lifts);"),
    ("console.error('❌ Erro ao carregar ліфтів:', result.error || 'Unknown error');",
     "console.error('❌ Erro ao carregar elevadores:', result.error || 'Unknown error');"),
    ("console.error('❌ Exception при завантаженні ліфтів:', error);",
     "console.error('❌ Excepção ao carregar elevadores:', error);"),
    ("console.log('💾 Збереження ліфта через API...', liftData);",
     "console.log('💾 A guardar elevador via API...', liftData);"),
    ("console.log('📥 Відповідь API:', result);",
     "console.log('📥 Resposta da API:', result);"),
    ("console.log('✅ Ліфт guardado в MongoDB:', savedLift);",
     "console.log('✅ Elevador guardado no MongoDB:', savedLift);"),
    ("console.error('❌ Помилка збереження do elevador:', result.error || result.message);",
     "console.error('❌ Erro ao guardar elevador:', result.error || result.message);"),
    ("console.log('📋 Відображення ліфтів в таблиці:', lifts.length);",
     "console.log('📋 A mostrar elevadores na tabela:', lifts.length);"),
    ("console.error('❌ Таблиця ліфтів не знайдена');",
     "console.error('❌ Tabela de elevadores não encontrada');"),
    ("<p class=\"mb-0\">Elevadores не знайдені</p>",
     "<p class=\"mb-0\">Nenhum elevador encontrado</p>"),
    ("<small>Додайте перший ліфт, натиснувши кнопку \"Adicionar elevador\"</small>",
     "<small>Adicione o primeiro elevador clicando no botão \"Adicionar elevador\"</small>"),
    ("console.error('❌ Ліфт без ID:', lift);",
     "console.error('❌ Elevador sem ID:', lift);"),
    ("return; // Пропускаємо ліфти без ID",
     "return; // Ignoramos elevadores sem ID"),

    # ── Alert strings ─────────────────────────────────────────────────────────
    ("alert('⚠️ Бібліотека QR-кодів не завантажилася. Спробуйте оновити сторінку (Ctrl+Shift+R)');",
     "alert('⚠️ A biblioteca de QR codes não carregou. Tente actualizar a página (Ctrl+Shift+R)');"),
    ("alert('QR генератор ще не готовий. Спробуйте через кілька секунд.');",
     "alert('O gerador QR ainda não está pronto. Tente novamente dentro de alguns segundos.');"),
    ("alert('Модальне вікно тимчасово недоступне. Спробуйте оновити сторінку.');",
     "alert('A janela modal está temporariamente indisponível. Tente actualizar a página.');"),
    ("alert('Por favor, введіть адресу');",
     "alert('Por favor, introduza o endereço');"),
    ("alert('Não вдалося знайти координати для цієї адреси. Спробуйте ввести більш детальну адресу.');",
     "alert('Não foi possível encontrar coordenadas para este endereço. Tente introduzir um endereço mais detalhado.');"),
    ("alert('Erro геокодування адреси. Перевірте інтернет-з\\'єднання.');",
     "alert('Erro de geocodificação do endereço. Verifique a ligação à internet.');"),

    # ── More patterns ─────────────────────────────────────────────────────────
    ("// Пропускаємо ліфти без ID", "// Ignoramos elevadores sem ID"),
    ("// Максимум 5 секунд очікування", "// Máximo 5 segundos de espera"),
    ("'Ліфт без ID'", "'Elevador sem ID'"),
    ("'Ліфт не знайдений'", "'Elevador não encontrado'"),
    ("'Ліфт не авторизований'", "'Elevador não autorizado'"),
    ("'ліфта з'", "'do elevador'"),
    ("'ліфт z'", "'elevador'"),
    ("Ліфт зупинений", "Elevador parado"),
    ("ліфта в систему", "elevador no sistema"),
    ("'Збережено!'", "'Guardado!'"),
    ("'Успішно'", "'Com sucesso'"),
    ("'Видалено'", "'Eliminado'"),
    ("'Додано'", "'Adicionado'"),
    ("'Не знайдено'", "'Não encontrado'"),
    ("'Завантаження'", "'A carregar'"),
    ("'Помилка мережі'", "'Erro de rede'"),
    ("'Немає підключення'", "'Sem ligação'"),
    ("'Сталася помилка'", "'Ocorreu um erro'"),
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
