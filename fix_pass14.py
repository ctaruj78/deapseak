"""Pass 14: Remaining 4x frequency patterns in lifts files."""
from pathlib import Path

TRANSLATIONS = [
    # ── Switch cases / filter names ───────────────────────────────────────────
    ("case 1: // Активні", "case 1: // Activos"),
    ("filterName = 'Активні ліфти';", "filterName = 'Elevadores activos';"),
    ("filterName = 'Ліфти em manutenção';", "filterName = 'Elevadores em manutenção';"),
    ("case 3: // Неактивні", "case 3: // Inactivos"),
    ("filterName = 'Неактивні ліфти';", "filterName = 'Elevadores inactivos';"),
    ("console.log(`🔍 Фільтр застосовано: ${filterName} (value: ${filterValue})`);",
     "console.log(`🔍 Filtro aplicado: ${filterName} (valor: ${filterValue})`);"),

    # ── HTML comments ─────────────────────────────────────────────────────────
    ("<!-- Universal Drag-to-Scroll для таблиць (автоматична ініціалізація) -->",
     "<!-- Universal Drag-to-Scroll para tabelas (inicialização automática) -->"),

    # ── Console logs ──────────────────────────────────────────────────────────
    ("console.log('🚀 A carregar ліфтів при старті сторінки...');",
     "console.log('🚀 A carregar elevadores no arranque da página...');"),
    ("const liftId = detailsModal.data('current-lift-id'); // Necessário встановлювати це при відкритті деталей",
     "const liftId = detailsModal.data('current-lift-id'); // Necessário definir ao abrir os detalhes"),
    ("#('#modalTitle').text('Editar ліфт');",
     "$('#modalTitle').text('Editar elevador');"),
    ("$('#modalTitle').text('Editar ліфт');",
     "$('#modalTitle').text('Editar elevador');"),
    ("alert('Модальне вікно з картою ще не завантажилось. Спробуйте через кілька секунд.');",
     "alert('A janela com mapa ainda não carregou. Tente novamente em alguns segundos.');"),
    ("console.error('❌ Метод loadLiftForEdit не encontrado');",
     "console.error('❌ Método loadLiftForEdit não encontrado');"),
    ("console.log('🚀 Configurações EventBus інтеграції для сторінки ліфтів...');",
     "console.log('🚀 A configurar integração EventBus para a página de elevadores...');"),
    ("console.log('🏷️ Autoматично згенеровано QR код для do elevador:', data.liftId);",
     "console.log('🏷️ Código QR gerado automaticamente para elevador:', data.liftId);"),
    ("document.getElementById('filterDescription').textContent = 'Ліфти клієнта (фільтр активний)';",
     "document.getElementById('filterDescription').textContent = 'Elevadores do cliente (filtro activo)';"),
    ("const _savedName = lift.clientName && lift.clientName !== 'Невказано' ? lift.clientName : '';",
     "const _savedName = lift.clientName && lift.clientName !== 'Não especificado' ? lift.clientName : '';"),
    ("? `<i class=\"fas fa-user-check text-success ml-1\" title=\"Зареєстрований клієнт\"></i>`",
     "? `<i class=\"fas fa-user-check text-success ml-1\" title=\"Cliente registado\"></i>`"),
    (": `<i class=\"fas fa-user-times text-warning ml-1\" title=\"Клієнт без акаунту\"></i>`;",
     ": `<i class=\"fas fa-user-times text-warning ml-1\" title=\"Cliente sem conta\"></i>`;"),
    ("title=\"Детальна інформація\">", "title=\"Informação detalhada\">"),
    ("title=\"Генерувати QR код\">", "title=\"Gerar código QR\">"),
    ("title=\"Відправити до municípioу\">", "title=\"Enviar ao município\">"),
    ("title=\"Запланувати обслуговування\">", "title=\"Agendar manutenção\">"),
    ("console.log('✅ Відображено ліфтів в таблиці:', lifts.length);",
     "console.log('✅ Elevadores mostrados na tabela:', lifts.length);"),
    ("console.log('📊 Статистика: немає ліфтів');",
     "console.log('📊 Estatísticas: sem elevadores');"),
    ("console.log('📊 Статистика оновлена:', {",
     "console.log('📊 Estatísticas actualizadas:', {"),
    ("'out-of-service': 'Não a funcionar',",
     "'out-of-service': 'Avariado',"),
    ("console.log('⚠️ API помилка:', result.message);",
     "console.log('⚠️ Erro da API:', result.message);"),
    ("console.log('🔍 Об\\'єкт ліфта для відображення:', lift);",
     "console.log('🔍 Objecto do elevador para mostrar:', lift);"),
    ("capacityText = `${persons} pessoas / ${lift.capacity} кг`;",
     "capacityText = `${persons} pessoas / ${lift.capacity} kg`;"),
    ("capacityText = `${persons} pessoas / ${lift.loadCapacity} кг`;",
     "capacityText = `${persons} pessoas / ${lift.loadCapacity} kg`;"),
    ("capacityText = `${lift.passengerCapacity} pessoas / ${kg} кг`;",
     "capacityText = `${lift.passengerCapacity} pessoas / ${kg} kg`;"),
    ("$('#detail-speed').text(lift.speed ? `${lift.speed} м/с` : 'Não especificado');",
     "$('#detail-speed').text(lift.speed ? `${lift.speed} m/s` : 'Não especificado');"),
    ("const latitude = coords[1] || lift.latitude || 38.7223; // Лісабон за замовчуванням",
     "const latitude = coords[1] || lift.latitude || 38.7223; // Lisboa por defeito"),
    ("const longitude = coords[0] || lift.longitude || -9.1393; // Лісабон за замовчуванням",
     "const longitude = coords[0] || lift.longitude || -9.1393; // Lisboa por defeito"),
    ("console.log('📍 Координати do elevador:', {",
     "console.log('📍 Coordenadas do elevador:', {"),
    ("+ '<i class=\"fas fa-eye mr-1\"></i>Mostrar коментарі</a>'",
     "+ '<i class=\"fas fa-eye mr-1\"></i>Mostrar comentários</a>'"),
    ("console.log('🗺️ Підготовка до ініціалізації карти деталей:', {",
     "console.log('🗺️ A preparar inicialização do mapa de detalhes:', {"),
    ("console.log('🗺️ Модальне вікно відкрите, ініціалізуємо карту...');",
     "console.log('🗺️ Janela modal aberta, a inicializar mapa...');"),
    ("console.error('❌ Leaflet не завантажений');",
     "console.error('❌ Leaflet não carregado');"),
    ("console.warn('⚠️ Немає координат для відображення карти:', {",
     "console.warn('⚠️ Sem coordenadas para mostrar o mapa:', {"),
    ("console.error('❌ Erro ao carregar деталей do elevador:', error);",
     "console.error('❌ Erro ao carregar detalhes do elevador:', error);"),
    ("console.log('🗺️ Ініціалізація карти деталей:', { lat, lng, address });",
     "console.log('🗺️ A inicializar mapa de detalhes:', { lat, lng, address });"),
    ("console.error('❌ Контейнер detailsMap не encontrado');",
     "console.error('❌ Contentor detailsMap não encontrado');"),
    ("console.log('✅ Стара карта видалена');",
     "console.log('✅ Mapa antigo removido');"),
    ("console.log('✅ Карта створена');",
     "console.log('✅ Mapa criado');"),
    ("console.log('✅ Tamanho карти atualizado');",
     "console.log('✅ Tamanho do mapa actualizado');"),
    ("console.error('❌ Помилка ініціалізації карти деталей:', error);",
     "console.error('❌ Erro ao inicializar mapa de detalhes:', error);"),
    ("console.log('✏️ Редагування do elevador:', liftId);",
     "console.log('✏️ A editar elevador:', liftId);"),
    ("lift = rdd.lift;            // ✅ Padrão формат: data.data.lift",
     "lift = rdd.lift;            // ✅ Formato padrão: data.data.lift"),
    ("lift = rdd;                 // data.data — сам instalação",
     "lift = rdd;                 // data.data — a própria instalação"),
    ("lift = rd;                  // data — сам instalação",
     "lift = rd;                  // data — a própria instalação"),
    ("console.log('📋 Dados ліфта для редагування:', lift);",
     "console.log('📋 Dados do elevador para edição:', lift);"),
    ("const lat = coords[1] || lift.latitude || 38.7223; // Лісабон за замовчуванням",
     "const lat = coords[1] || lift.latitude || 38.7223; // Lisboa por defeito"),
    ("const lng = coords[0] || lift.longitude || -9.1393; // Лісабон за замовчуванням",
     "const lng = coords[0] || lift.longitude || -9.1393; // Lisboa por defeito"),
    ("console.log('✅ Форма заповнена даними');",
     "console.log('✅ Formulário preenchido com dados');"),
    ("console.log('🗺️ Ініціалізація карти редагування...');",
     "console.log('🗺️ A inicializar mapa de edição...');"),

    # ── More generic ──────────────────────────────────────────────────────────
    ("'Невказано'", "'Não especificado'"),
    ("кг</", "kg</"),
    (" кг`", " kg`"),
    ("м/с", "m/s"),
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
