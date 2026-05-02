"""Pass 15: Remaining 4x frequency patterns."""
from pathlib import Path

TRANSLATIONS = [
    ("toastr.error('❌ Не вдалося відправити email нагадування');",
     "toastr.error('❌ Não foi possível enviar o email de lembrete');"),
    ("'out-of-service': 'Não a funcionar',", "'out-of-service': 'Avariado',"),
    ("alert('Erro завантаження даних ліфта');",
     "alert('Erro ao carregar dados do elevador');"),
    ("console.log('🗺️ Ініціалізація карти редагування:', { lat, lng, address });",
     "console.log('🗺️ A inicializar mapa de edição:', { lat, lng, address });"),
    ("console.error('❌ Контейнер enhancedLiftMap не encontrado');",
     "console.error('❌ Contentor enhancedLiftMap não encontrado');"),
    ("console.log('✅ Карта редагування створена');",
     "console.log('✅ Mapa de edição criado');"),
    ("console.log('📍 Маркер переміщено:', position);",
     "console.log('📍 Marcador movido:', position);"),
    ("marker.bindPopup(`<strong>${address}</strong><br><small>Перетягніть маркер для зміни позиції</small>`).openPop",
     "marker.bindPopup(`<strong>${address}</strong><br><small>Arraste o marcador para alterar a posição</small>`).openPop"),
    ("console.log('✅ Tamanho карти редагування atualizado');",
     "console.log('✅ Tamanho do mapa de edição actualizado');"),
    ("console.log('✅ Другий виклик invalidateSize() після анімації');",
     "console.log('✅ Segunda chamada invalidateSize() após animação');"),
    ("console.error('❌ Помилка ініціалізації карти редагування:', error);",
     "console.error('❌ Erro ao inicializar mapa de edição:', error);"),
    ("console.log('🏷️ Генерація QR коду для do elevador:', liftId);",
     "console.log('🏷️ A gerar código QR para elevador:', liftId);"),
    ("console.log('✅ Повна відповідь API:', result);",
     "console.log('✅ Resposta completa da API:', result);"),
    ("console.log('✅ Витягнуто lift:', lift);",
     "console.log('✅ Elevador extraído:', lift);"),
    ("console.log('📂 Lift з localStorage:', lift);",
     "console.log('📂 Elevador do localStorage:', lift);"),
    ("console.error('❌ Ліфт не encontrado після всіх спроб');",
     "console.error('❌ Elevador não encontrado após todas as tentativas');"),
    ("console.log('🏷️ Фінальний об\\'єкт lift:', lift);",
     "console.log('🏷️ Objecto lift final:', lift);"),
    ("alert('Бібліотека QR кодів ще завантажується. Спробуйте через кілька секунд.');",
     "alert('A biblioteca de códigos QR ainda está a carregar. Tente em alguns segundos.');"),
    ("console.log('📍 Відформатовані дані:', { municipalNumber, addressStr });",
     "console.log('📍 Dados formatados:', { municipalNumber, addressStr });"),
    ("console.error('❌ Помилка генерації QR коду:', error);",
     "console.error('❌ Erro ao gerar código QR:', error);"),
    ("alert('Erro генерації QR коду: ' + error.message);",
     "alert('Erro ao gerar código QR: ' + error.message);"),
    ("console.error('❌ Erro ao carregar QR коду:', error);",
     "console.error('❌ Erro ao carregar código QR:', error);"),
    ("alert('Erro завантаження QR коду');",
     "alert('Erro ao carregar código QR');"),
    ("'<title>QR код - ' + municipalNumber + '</title>',",
     "'<title>Código QR - ' + municipalNumber + '</title>',"),
    ("'<div><strong>Адреса:</strong> ' + addressStr + '</div>',",
     "'<div><strong>Endereço:</strong> ' + addressStr + '</div>',"),
    ("'<div><strong>Модель:</strong> ' + model + '</div>',",
     "'<div><strong>Modelo:</strong> ' + model + '</div>',"),
    ("'<div><strong>Тип:</strong> ' + type + '</div>',",
     "'<div><strong>Tipo:</strong> ' + type + '</div>',"),
    ("console.error('❌ Помилка друку QR коду:', error);",
     "console.error('❌ Erro ao imprimir código QR:', error);"),
    ("alert('Erro друку QR коду');",
     "alert('Erro ao imprimir código QR');"),
    ("console.log('🔧 Planeamento обслуговування do elevador:', liftId);",
     "console.log('🔧 A planear manutenção do elevador:', liftId);"),
    ("const maintenanceDate = prompt('Введіть дату планового обслуговування (YYYY-MM-DD):');",
     "const maintenanceDate = prompt('Introduza a data de manutenção planeada (AAAA-MM-DD):');"),
    ("alert(`Manutenção zaплановано na ${maintenanceDate}`);",
     "alert(`Manutenção planeada para ${maintenanceDate}`);"),
    ("alert(`Manutenção заплановано на ${maintenanceDate}`);",
     "alert(`Manutenção planeada para ${maintenanceDate}`);"),
    ("console.log('🗑️ Видалення do elevador:', liftId);",
     "console.log('🗑️ A eliminar elevador:', liftId);"),
    ("if (!confirm('Tem a certeza que quer eliminar цей ліфт? Цю дію не можна скасувати.')) {",
     "if (!confirm('Tem a certeza que quer eliminar este elevador? Esta acção não pode ser desfeita.')) {"),
    ("console.log('✅ Ліфт eliminado з API');",
     "console.log('✅ Elevador eliminado da API');"),
    ("console.warn('⚠️ Помилка видалення з API, але локальні дані atualizado');",
     "console.warn('⚠️ Erro ao eliminar da API, mas dados locais actualizados');"),
    ("alert('Ліфт успішно eliminado');",
     "alert('Elevador eliminado com sucesso');"),
    ("console.log('🔄 Інтерфейс atualizado з API даними');",
     "console.log('🔄 Interface actualizada com dados da API');"),
    ("console.error('❌ Помилка оновлення інтерфейсу:', error);",
     "console.error('❌ Erro ao actualizar interface:', error);"),
    ("let allReports = []; // Всі звіти", "let allReports = []; // Todos os relatórios"),
    ("let filteredReports = []; // Відфільтровані звіти",
     "let filteredReports = []; // Relatórios filtrados"),
    ("let displayedReportsCount = 0; // Скільки показано",
     "let displayedReportsCount = 0; // Quantos mostrados"),
    ("const REPORTS_PER_PAGE = 20; // По 20 на сторінку",
     "const REPORTS_PER_PAGE = 20; // 20 por página"),
    ("<i class=\"fas fa-exclamation-triangle\"></i> Жодного звіту ще не додано",
     "<i class=\"fas fa-exclamation-triangle\"></i> Nenhum relatório adicionado ainda"),
    ("console.error('❌ Erro ao carregar звітів:', error);",
     "console.error('❌ Erro ao carregar relatórios:', error);"),
    ("<i class=\"fas fa-exclamation-circle\"></i> Erro ao carregar звітів",
     "<i class=\"fas fa-exclamation-circle\"></i> Erro ao carregar relatórios"),
    ("<i class=\"fas fa-search\"></i> Звітів не encontrado за вказаними критеріями",
     "<i class=\"fas fa-search\"></i> Nenhum relatório encontrado com os critérios indicados"),
    ("console.log('📋 Відкриття форми звіту для do elevador:', liftId);",
     "console.log('📋 A abrir formulário de relatório para elevador:', liftId);"),
    ("console.log('📋 Відправка звіту інспекції:', { liftId, type, date, status });",
     "console.log('📋 A enviar relatório de inspecção:', { liftId, type, date, status });"),
    ("alert('Por favor, zaповніть обов\\'язкові поля');",
     "alert('Por favor, preencha os campos obrigatórios');"),
    ("alert('Por favor, заповніть обов\\'язкові поля');",
     "alert('Por favor, preencha os campos obrigatórios');"),
    ("console.log('📥 Відповідь сервера:', result);",
     "console.log('📥 Resposta do servidor:', result);"),
    ("alert('Звіт успішно додано!');",
     "alert('Relatório adicionado com sucesso!');"),
    ("alert('Erro: ' + (result.message || result.error || 'Não вдалося додати звіт'));",
     "alert('Erro: ' + (result.message || result.error || 'Não foi possível adicionar o relatório'));"),
    ("console.error('❌ Помилка додавання звіту:', error);",
     "console.error('❌ Erro ao adicionar relatório:', error);"),
    ("alert('Erro додавання звіту: ' + error.message);",
     "alert('Erro ao adicionar relatório: ' + error.message);"),
    ("console.log('🖨️ Impressão звіту:', report);",
     "console.log('🖨️ A imprimir relatório:', report);"),
    ("console.log('ℹ️ Контракт не encontrado для do elevador:', liftId);",
     "console.log('ℹ️ Contrato não encontrado para elevador:', liftId);"),
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
