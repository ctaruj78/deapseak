"""Pass 13: patterns from top-frequency analysis."""
from pathlib import Path

TRANSLATIONS = [
    # ── Geolocation alert ─────────────────────────────────────────────────────
    ("alert('Не вдалося визначити вашу поточну локацію. Дозвольте доступ до геолокації в браузері.');",
     "alert('Não foi possível determinar a sua localização actual. Permita o acesso à geolocalização no navegador.');"),

    # ── Console logs ──────────────────────────────────────────────────────────
    ("console.log('  Від (користувач):', userLocation.lat, userLocation.lng);",
     "console.log('  De (utilizador):', userLocation.lat, userLocation.lng);"),
    ("console.log('  До (ліфт):', lift.lat, lift.lng);",
     "console.log('  Para (elevador):', lift.lat, lift.lng);"),

    # ── HTML comments ─────────────────────────────────────────────────────────
    ("<!-- Основний контент -->", "<!-- Conteúdo principal -->"),
    ("<!-- 🔌 КОНФІГУРАЦІЯ ПОРТІВ (завантажується ПЕРШОЮ!) -->",
     "<!-- 🔌 CONFIGURAÇÃO DE PORTAS (carregada PRIMEIRO!) -->"),
    ("<!-- QR Code Smart Loader - Спробує descarregar з кількох CDN джерел -->",
     "<!-- QR Code Smart Loader - Tenta descarregar de várias fontes CDN -->"),

    # ── Filter button ─────────────────────────────────────────────────────────
    ("Filtroувати <i class=\"fas fa-arrow-circle-right\"></i>",
     "Filtrar <i class=\"fas fa-arrow-circle-right\"></i>"),

    # ── Form labels ───────────────────────────────────────────────────────────
    ("<label>Тип QR-коду *</label>", "<label>Tipo de código QR *</label>"),
    ("<label>Статус *</label>", "<label>Estado *</label>"),
    ("<label>Дійсний до *</label>", "<label>Válido até *</label>"),
    ("<option value=\"expired\">Протермінований</option>",
     "<option value=\"expired\">Expirado</option>"),
    ("<option value=\"today\">Сьогодні</option>",
     "<option value=\"today\">Hoje</option>"),

    # ── Municipality section ──────────────────────────────────────────────────
    ("<i class=\"fas fa-building mr-2\"></i>Відправити звіт до муніципалітету",
     "<i class=\"fas fa-building mr-2\"></i>Enviar relatório ao município"),
    ("<strong>Інформація:</strong> Звіт буде автоматично enviado до відповідного муніципалітету на основі адреси ліф",
     "<strong>Informação:</strong> O relatório será enviado automaticamente ao município correspondente com base no endereço do el"),
    ("<h6 class=\"mb-0\"><i class=\"fas fa-elevator mr-2\"></i>Інформація про ліфт</h6>",
     "<h6 class=\"mb-0\"><i class=\"fas fa-elevator mr-2\"></i>Informação do elevador</h6>"),
    ("<p><strong>Адреса:</strong> <span id=\"mun-address\">-</span></p>",
     "<p><strong>Endereço:</strong> <span id=\"mun-address\">-</span></p>"),
    ("<p><strong>QR код:</strong> <span id=\"mun-qr-code\">-</span></p>",
     "<p><strong>Código QR:</strong> <span id=\"mun-qr-code\">-</span></p>"),
    ("<h6 class=\"mb-0 text-white\"><i class=\"fas fa-landmark mr-2\"></i>Муніципалітет</h6>",
     "<h6 class=\"mb-0 text-white\"><i class=\"fas fa-landmark mr-2\"></i>Município</h6>"),
    ("<p class=\"mt-2 text-muted\">Визначення муніципалітету...</p>",
     "<p class=\"mt-2 text-muted\">A determinar município...</p>"),
    ("<p><strong>Телефон:</strong> <span id=\"mun-phone\">-</span></p>",
     "<p><strong>Telefone:</strong> <span id=\"mun-phone\">-</span></p>"),
    ("<span id=\"municipality-error-message\">Не вдалося визначити муніципалітет</span>",
     "<span id=\"municipality-error-message\">Não foi possível determinar o município</span>"),
    ("<i class=\"fas fa-file-alt mr-1\"></i>Тип звіту",
     "<i class=\"fas fa-file-alt mr-1\"></i>Tipo de relatório"),
    ("<option value=\"municipality-inicio-servico\">✅ Início de Serviço - Поchatок обслуговування ліфта</option>",
     "<option value=\"municipality-inicio-servico\">✅ Início de Serviço - Início de manutenção do elevador</option>"),
    ("<option value=\"municipality-fim-servico\">❌ Fim de Serviço - Припинення обслуговування ліфта</option>",
     "<option value=\"municipality-fim-servico\">❌ Fim de Serviço - Cessação de manutenção do elevador</option>"),
    ("<i class=\"fas fa-comment mr-1\"></i>Додаткові примітки (опціонально)",
     "<i class=\"fas fa-comment mr-1\"></i>Notas adicionais (opcional)"),
    ("placeholder=\"Додайте додаткову інформацію для",
     "placeholder=\"Adicione informação adicional para"),
    ("<i class=\"fas fa-paper-plane mr-1\"></i>Відправити звіт",
     "<i class=\"fas fa-paper-plane mr-1\"></i>Enviar relatório"),

    # ── Test data cleanup ─────────────────────────────────────────────────────
    ("const confirm = window.confirm('Tem a certeza? Це видалить всі testeові дані з localStorage.');",
     "const confirm = window.confirm('Tem a certeza? Isto eliminará todos os dados de teste do localStorage.');"),
    ("console.log(`✅ Eliminado ${removed} testeових registos`);",
     "console.log(`✅ ${removed} registos de teste eliminados`);"),
    ("alert(`Eliminado ${removed} registos. Página буде оновлена.`);",
     "alert(`${removed} registos eliminados. A página será actualizada.`);"),

    # ── Email modal ───────────────────────────────────────────────────────────
    ("<h5 class=\"modal-title\">Enviar relatório на email</h5>",
     "<h5 class=\"modal-title\">Enviar relatório por email</h5>"),
    ("<label for=\"clientEmail\">Email клієнта:</label>",
     "<label for=\"clientEmail\">Email do cliente:</label>"),
    ("<label for=\"emailSubject\">Assunto листа:</label>",
     "<label for=\"emailSubject\">Assunto do email:</label>"),
    ("value=\"Технічний звіт по ліфту\">",
     "value=\"Relatório técnico do elevador\">"),
    ("Шановний клієнте!", "Prezado cliente,"),
    ("Надсилаємо вам технічний звіт по вашому ліфту.",
     "Enviamos-lhe o relatório técnico do seu elevador."),
    ("Команда FestLift", "Equipa FestLift"),
    ("alert('✅ Контракт успішно enviado на email: ' + email);",
     "alert('✅ Contrato enviado com sucesso por email para: ' + email);"),

    # ── Archive modal ─────────────────────────────────────────────────────────
    ("if (confirm('Tem a certeza que quer eliminar цей звіт?')) {",
     "if (confirm('Tem a certeza que quer eliminar este relatório?')) {"),
    ("toastr.success('Звіт успішно архівовано!');",
     "toastr.success('Relatório arquivado com sucesso!');"),
    ("if (confirm('Звіт архівовано. Хочете переглянути архів звітів?')) {",
     "if (confirm('Relatório arquivado. Deseja ver o arquivo de relatórios?')) {"),
    ("reportsList += '<p class=\"text-muted\">Архівних звітів не encontrado</p>';",
     "reportsList += '<p class=\"text-muted\">Nenhum relatório arquivado encontrado</p>';"),
    ("<p class=\"mb-1\"><small class=\"text-muted\">Тип: ${report.reportType} | Дата: ${date} | Tamanho: ${size}</small>",
     "<p class=\"mb-1\"><small class=\"text-muted\">Tipo: ${report.reportType} | Data: ${date} | Tamanho: ${size}</small>"),
    ("<h5 class=\"modal-title\"><i class=\"fas fa-archive mr-2\"></i>Архів звітів інспекцій</h5>",
     "<h5 class=\"modal-title\"><i class=\"fas fa-archive mr-2\"></i>Arquivo de relatórios de inspecção</h5>"),
    ("<button type=\"button\" class=\"btn btn-warning\" onclick=\"clearArchive()\">Очистити архів</button>",
     "<button type=\"button\" class=\"btn btn-warning\" onclick=\"clearArchive()\">Limpar arquivo</button>"),
    ("toastr.success('Звіт eliminado з архіву');",
     "toastr.success('Relatório eliminado do arquivo');"),
    ("if (confirm('Очистити весь архів звітів? Ця дія незворотна!')) {",
     "if (confirm('Limpar todo o arquivo de relatórios? Esta acção é irreversível!')) {"),
    ("toastr.info('Архів очищено');",
     "toastr.info('Arquivo limpo');"),

    # ── Switch case ───────────────────────────────────────────────────────────
    ("case 0: // Загальна quantidade", "case 0: // Quantidade total"),

    # ── Search placeholder ─────────────────────────────────────────────────────
    ("placeholder=\"Pesquisar por modelo, endereço, ID...\" a",
     "placeholder=\"Pesquisar por modelo, endereço, ID...\" a"),

    # ── More generic ──────────────────────────────────────────────────────────
    ("Муніципалітет", "Município"),
    ("муніципалітет", "município"),
    ("муніципалітету", "município"),
    ("муніципальний", "municipal"),
    ("Муніципальний", "Municipal"),
    ("Поchatок обслуговування", "Início de manutenção"),
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
