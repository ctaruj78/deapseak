"""Pass 18: More frequency patterns."""
from pathlib import Path

TRANSLATIONS = [
    # ── Persistent 4x ─────────────────────────────────────────────────────────
    ("'out-of-service': 'Não a funcionar',", "'out-of-service': 'Avariado',"),
    ("alert('Erro: ' + (result.message || result.error || 'Não вдалося додати звіт'));",
     "alert('Erro: ' + (result.message || result.error || 'Não foi possível adicionar o relatório'));"),
    ("<strong>Período ações:</strong> ${periodText}<br>",
     "<strong>Período de acções:</strong> ${periodText}<br>"),
    ("? `Contrato успішно завантажено та застосовано до ${sharedCount + 1} elevadores neste endereço!`",
     "? `Contrato carregado e aplicado com sucesso a ${sharedCount + 1} elevadores neste endereço!`"),
    ("throw new Error(`Não вдалося descarregar modelo: ${response.statusText}`);",
     "throw new Error(`Não foi possível descarregar modelo: ${response.statusText}`);"),

    # ── 3x patterns ───────────────────────────────────────────────────────────
    ("<option value=\"30\" selected>30 днів</option>",
     "<option value=\"30\" selected>30 dias</option>"),
    ("<option value=\"60\">60 днів</option>",
     "<option value=\"60\">60 dias</option>"),
    ("<option value=\"90\">90 днів</option>",
     "<option value=\"90\">90 dias</option>"),
    ("alert('Pedido не обрана');",
     "alert('Nenhum pedido seleccionado');"),
    ("<i class=\"fas fa-user-check mr-1\"></i>Призначити",
     "<i class=\"fas fa-user-check mr-1\"></i>Atribuir"),
    ("console.error('Erro призначення техніка:', error);",
     "console.error('Erro ao atribuir técnico:', error);"),
    ("<label for=\"maintenanceFrequencyOverride\">Periodicidade для наступного ТО</label>",
     "<label for=\"maintenanceFrequencyOverride\">Periodicidade para próxima manutenção</label>"),
    ("fields.inspector.style.backgroundColor = '#ffebee'; // Підсвічуємо червоним",
     "fields.inspector.style.backgroundColor = '#ffebee'; // Destacamos a vermelho"),
    ("console.log('✅ Валідація пройшла успішно');",
     "console.log('✅ Validação passou com sucesso');"),
    ("<label for=\"clientEmailInspection\">Email клієнта:</label>",
     "<label for=\"clientEmailInspection\">Email do cliente:</label>"),
    ("<label for=\"emailInspectionSubject\">Assunto листа:</label>",
     "<label for=\"emailInspectionSubject\">Assunto do email:</label>"),
    ("value=\"Звіт інспекції ліфта\">",
     "value=\"Relatório de inspecção do elevador\">"),
    ("Надсилаємо вам звіт інспекції вашого ліфта.",
     "Enviamos-lhe o relatório de inspecção do seu elevador."),
    ("alert('✅ Звіт інспекції успішно enviado на email: ' + email);",
     "alert('✅ Relatório de inspecção enviado com sucesso por email para: ' + email);"),
    ("toastr.success('Звіт інспекції успішно архівовано!');",
     "toastr.success('Relatório de inspecção arquivado com sucesso!');"),
    ("if (confirm('Tem a certeza que quer eliminar цей звіт інспекції?')) {",
     "if (confirm('Tem a certeza que quer eliminar este relatório de inspecção?')) {"),
    ("const municipalNumber = lift.municipalNumber || 'Без номера';",
     "const municipalNumber = lift.municipalNumber || 'Sem número';"),
    ("<i class=\"fas fa-filter\"></i> Застосувати",
     "<i class=\"fas fa-filter\"></i> Aplicar"),
    ("<i class=\"fas fa-list\"></i> Список",
     "<i class=\"fas fa-list\"></i> Lista"),
    ("<option value=\"\">Seleccione техніка...</option>",
     "<option value=\"\">Seleccione o técnico...</option>"),
    ("'assigned': 'Призначено',", "'assigned': 'Atribuído',"),
    ("<h3 class=\"card-title\"><i class=\"fas fa-plus-circle mr-2\"></i>Швидкі ações</h3>",
     "<h3 class=\"card-title\"><i class=\"fas fa-plus-circle mr-2\"></i>Acções rápidas</h3>"),
    ("<span class=\"mx-3\">Página <span id=\"currentPage\">1</span> з <span id=\"totalPages\">1</span></span>",
     "<span class=\"mx-3\">Página <span id=\"currentPage\">1</span> de <span id=\"totalPages\">1</span></span>"),
    ("<option value=\"safety\">Безпека</option>",
     "<option value=\"safety\">Segurança</option>"),

    # ── 2x patterns ───────────────────────────────────────────────────────────
    ("<i class=\"fas fa-arrow-left\"></i> Повернутися",
     "<i class=\"fas fa-arrow-left\"></i> Voltar"),
    ("<h4 class=\"mb-0\">🤖 AI Previsão і Análise</h4>",
     "<h4 class=\"mb-0\">🤖 AI Previsão e Análise</h4>"),
    ("<span class=\"ml-2\">Критичні алерти</span>",
     "<span class=\"ml-2\">Alertas críticos</span>"),
    ("<i class=\"fas fa-sync-alt\"></i> Запустити аналіз",
     "<i class=\"fas fa-sync-alt\"></i> Executar análise"),
    ("<h5><i class=\"fas fa-brain\"></i> Аналіз штучного інтелекту</h5>",
     "<h5><i class=\"fas fa-brain\"></i> Análise de inteligência artificial</h5>"),
    ("<p id=\"mlInsightText\">Sistema аналізує дані 24/7 для прогнозування потреб технічного обслуговування...</p>",
     "<p id=\"mlInsightText\">O sistema analisa dados 24/7 para prever necessidades de manutenção técnica...</p>"),
    ("<p>Високий ризик</p>", "<p>Risco elevado</p>"),
    ("<p>Середній ризик</p>", "<p>Risco médio</p>"),
    ("<p>Низький ризик</p>", "<p>Risco baixo</p>"),
    ("<p>Середній вік (роки)</p>", "<p>Idade média (anos)</p>"),
    ("<h3 class=\"card-title\"><i class=\"fas fa-list\"></i> Detalhado аналіз ліфтів</h3>",
     "<h3 class=\"card-title\"><i class=\"fas fa-list\"></i> Análise detalhada dos elevadores</h3>"),
    ("<i class=\"fas fa-table\"></i> Матриця ризиків",
     "<i class=\"fas fa-table\"></i> Matriz de risco"),
    ("<!-- Lista de elevadores буде додано динамічно -->",
     "<!-- Lista de elevadores será adicionada dinamicamente -->"),
    ("<h3 class=\"card-title\"><i class=\"fas fa-crystal-ball\"></i> ШІ Прогнози на seguinte período</h3>",
     "<h3 class=\"card-title\"><i class=\"fas fa-crystal-ball\"></i> Previsões de IA para o próximo período</h3>"),
    ("<div>Seguinte місяць</div>", "<div>Próximo mês</div>"),
    ("<small id=\"nextMonthDetails\">0 відмов очікується</small>",
     "<small id=\"nextMonthDetails\">0 falhas previstas</small>"),
    ("<div>Seguinte квартал</div>", "<div>Próximo trimestre</div>"),
    ("<small id=\"nextQuarterDetails\">0 ТО necessário</small>",
     "<small id=\"nextQuarterDetails\">0 manutenções necessárias</small>"),
    ("<div>Seguinte рік</div>", "<div>Próximo ano</div>"),

    # ── More generic ──────────────────────────────────────────────────────────
    ("'Призначено'", "'Atribuído'"),
    ("'Призначений'", "'Atribuído'"),
    ("'Без номера'", "'Sem número'"),
    ("'Закрито'", "'Fechado'"),
    ("'Скасовано'", "'Cancelado'"),
    ("'Заплановано'", "'Planeado'"),
    ("'Відхилено'", "'Rejeitado'"),
    ("'Очікується'", "'Pendente'"),
    ("'Відкрито'", "'Aberto'"),
    ("'Виконано'", "'Concluído'"),
    ("'Архівовано'", "'Arquivado'"),
    ("'Перевіряється'", "'Em verificação'"),
    ("'Нова'", "'Nova'"),
    ("'Новий'", "'Novo'"),
    ("'нова'", "'nova'"),
    ("'Висока'", "'Alta'"),
    ("'Середня'", "'Média'"),
    ("'Низька'", "'Baixa'"),
    ("'Критична'", "'Crítica'"),
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
