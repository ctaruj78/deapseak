"""Pass 12: High-frequency patterns (8-12x occurrences across files)."""
from pathlib import Path

TRANSLATIONS = [
    # ── High-frequency (8-12x) ────────────────────────────────────────────────
    ("alert('Ліфт не encontrado');",
     "alert('Elevador não encontrado');"),
    ("alert('Erro: менеджер не ініціалізовано');",
     "alert('Erro: gestor não inicializado');"),
    (": 'Невідома дата';", ": 'Data desconhecida';"),
    ("const displayName = lift.model || lift.name || `Ліфт ${lift.id}`;",
     "const displayName = lift.model || lift.name || `Elevador ${lift.id}`;"),
    ("confirmButtonText: 'Зрозуміло'", "confirmButtonText: 'Entendido'"),
    ("$('#enhancedModalTitle').text('Editar ліфт');",
     "$('#enhancedModalTitle').text('Editar elevador');"),
    ("console.log('✅ Ліфт завантажено з API:', lift);",
     "console.log('✅ Elevador carregado da API:', lift);"),
    ("console.log('⚠️ A carregar з localStorage (API не доступний)');",
     "console.log('⚠️ A carregar do localStorage (API não disponível)');"),
    ("console.log('📊 Chaveі об'єкта:', Object.keys(lift));",
     "console.log('📊 Chaves do objecto:', Object.keys(lift));"),
    ("console.log('📊 Chaveі об\\'єкта:', Object.keys(lift));",
     "console.log('📊 Chaves do objecto:', Object.keys(lift));"),
    ("console.error('❌ Leaflet бібліотека не завантажена');",
     "console.error('❌ Biblioteca Leaflet não carregada');"),
    ("console.log('✅ Tiles додані');",
     "console.log('✅ Tiles adicionados');"),
    ("console.log('✅ Маркер додано');",
     "console.log('✅ Marcador adicionado');"),
    ("console.log('📊 Chaveі об'єкта lift:', Object.keys(lift));",
     "console.log('📊 Chaves do objecto lift:', Object.keys(lift));"),
    ("console.log('📊 Chaveі об\\'єкта lift:', Object.keys(lift));",
     "console.log('📊 Chaves do objecto lift:', Object.keys(lift));"),
    ("alert('QR код не encontrado');",
     "alert('Código QR não encontrado');"),

    # ── Frequency 7x ─────────────────────────────────────────────────────────
    ("З повагою,", "Com os melhores cumprimentos,"),
    ("alert('Por favor, введіть email клієнта');",
     "alert('Por favor, introduza o email do cliente');"),
    ("alert('Inválido формат email');",
     "alert('Formato de email inválido');"),
    ("alert('Autenticação необхідна');",
     "alert('Autenticação necessária');"),
    ("alert('❌ Помилка відправки: ' + result.error);",
     "alert('❌ Erro de envio: ' + result.error);"),
    ("console.error('Erro відправки email:', error);",
     "console.error('Erro ao enviar email:', error);"),
    ("alert('❌ Не вдалося відправити email: ' + error.message);",
     "alert('❌ Não foi possível enviar o email: ' + error.message);"),
    ("toastr.success(`Звіт завантажено як: ${filename}`);",
     "toastr.success(`Relatório descarregado como: ${filename}`);"),
    ("console.warn('⚠️ Помилка видалення старої карти:', e);",
     "console.warn('⚠️ Erro ao remover mapa antigo:', e);"),
    ("console.warn('⚠️ Dados ліфтів ще не завантажені');",
     "console.warn('⚠️ Dados dos elevadores ainda não carregados');"),

    # ── Frequency 6x ─────────────────────────────────────────────────────────
    ("const notes = report.comments || report.findings || report.notes || 'Без коментарів';",
     "const notes = report.comments || report.findings || report.notes || 'Sem comentários';"),

    # ── Frequency 5x ─────────────────────────────────────────────────────────
    ("<option value=\"lift\">Для ліфта</option>",
     "<option value=\"lift\">Para elevador</option>"),
    ("<option value=\"technician\">Для техніка</option>",
     "<option value=\"technician\">Para técnico</option>"),
    ("<option value=\"location\">Для локації</option>",
     "<option value=\"location\">Para localização</option>"),
    ("<option value=\"maintenance\">Для ТО</option>",
     "<option value=\"maintenance\">Para manutenção</option>"),
    ("<label>Додаткові дані (JSON)</label>",
     "<label>Dados adicionais (JSON)</label>"),
    ("const inspector = report.inspectorName || 'Невідомий';",
     "const inspector = report.inspectorName || 'Desconhecido';"),
    ("<i class=\"fas fa-play\"></i> Переглянути",
     "<i class=\"fas fa-play\"></i> Ver"),

    # ── Frequency 4x ─────────────────────────────────────────────────────────
    ("<!-- Типи звітів -->", "<!-- Tipos de relatórios -->"),
    ("<h5>Фінансовий</h5>", "<h5>Financeiro</h5>"),
    ("<th>Муніципалітет</th>", "<th>Município</th>"),
    ("toastr.error('Erro підchaveення');",
     "toastr.error('Erro de ligação');"),
    ("<p>На обслуговуванні</p>", "<p>Em manutenção</p>"),
    ("<option value=\"maintenance\">На обслуговуванні</option>",
     "<option value=\"maintenance\">Em manutenção</option>"),
    ("<i class=\"fas fa-save\"></i> Зберегти",
     "<i class=\"fas fa-save\"></i> Guardar"),

    # ── More common patterns ──────────────────────────────────────────────────
    ("console.error('❌ Erro ao carregar контракту:', error);",
     "console.error('❌ Erro ao carregar contrato:', error);"),
    ("'Без коментарів'", "'Sem comentários'"),
    ("'Невідомий'", "'Desconhecido'"),
    ("'Невідома дата'", "'Data desconhecida'"),
    ("'Невідомий технік'", "'Técnico desconhecido'"),
    ("'Невідома адреса'", "'Endereço desconhecido'"),
    ("'невідомий'", "'desconhecido'"),
    ("'невідома'", "'desconhecida'"),
    ("'Невідомо'", "'Desconhecido'"),
    ("Муніципальний №", "Nº municipal"),
    ("Муніципальний номер", "Número municipal"),
    ("Munícipal номер", "Número municipal"),
    ("'Ліфт ${lift.id}'", "'Elevador ${lift.id}'"),
    ("`Ліфт ${lift.id}`", "`Elevador ${lift.id}`"),
    ("`Ліфт ${lift.municipalNumber}`", "`Elevador ${lift.municipalNumber}`"),
    ("'Всі ліфти'", "'Todos os elevadores'"),
    ("'Ліфт завантажено'", "'Elevador carregado'"),
    ("'Ліфт не завантажений'", "'Elevador não carregado'"),
    ("'Завантаження ліфта'", "'A carregar elevador'"),
    ("'Munícipal'", "'Municipal'"),
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
