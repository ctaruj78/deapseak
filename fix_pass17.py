"""Pass 17: More high-frequency patterns."""
from pathlib import Path

TRANSLATIONS = [
    ("'out-of-service': 'Não a funcionar',", "'out-of-service': 'Avariado',"),
    ("alert('Erro: ' + (result.message || result.error || 'Não вдалося додати звіт'));",
     "alert('Erro: ' + (result.message || result.error || 'Não foi possível adicionar o relatório'));"),
    ("<strong>Período ações:</strong> ${periodText}<br>",
     "<strong>Período de acções:</strong> ${periodText}<br>"),
    ("? `Contrato успішно завантажено та застосовано до ${sharedCount + 1} elevadores neste endereço!`",
     "? `Contrato carregado e aplicado com sucesso a ${sharedCount + 1} elevadores neste endereço!`"),
    ("throw new Error(`Não вдалося descarregar modelo: ${response.statusText}`);",
     "throw new Error(`Não foi possível descarregar modelo: ${response.statusText}`);"),
    ("<!-- Ініціалізація динамічного сайдбару -->",
     "<!-- Inicialização do sidebar dinâmico -->"),
    ("<i class=\"fas fa-download\"></i> Згенерувати",
     "<i class=\"fas fa-download\"></i> Gerar"),
    ("<i class=\"fas fa-save\"></i> Guardar налаштування",
     "<i class=\"fas fa-save\"></i> Guardar configurações"),
    ("console.log('ServiceWorker зареєстровано:', registration);",
     "console.log('ServiceWorker registado:', registration);"),
    ("console.log('ServiceWorker помилка:', err);",
     "console.log('Erro do ServiceWorker:', err);"),

    # ── 3x patterns ───────────────────────────────────────────────────────────
    ("<p class=\"text-muted\">Звіти про ТО ліфтів</p>",
     "<p class=\"text-muted\">Relatórios de manutenção de elevadores</p>"),
    ("<p class=\"text-muted\">Фінансові звіти та аналітика</p>",
     "<p class=\"text-muted\">Relatórios financeiros e análise</p>"),
    ("<p class=\"text-muted\">Eficiência роботи техніків</p>",
     "<p class=\"text-muted\">Eficiência dos técnicos</p>"),
    ("<h5>Інвентаризація</h5>", "<h5>Inventário</h5>"),
    ("<p class=\"text-muted\">Залишки запчастин та матеріалів</p>",
     "<p class=\"text-muted\">Stock de peças e materiais</p>"),
    ("<option value=\"pending\">Очікується</option>",
     "<option value=\"pending\">Pendente</option>"),
    ("<!-- 📊 Завантажувач статистики дашборду -->",
     "<!-- 📊 Carregador de estatísticas do painel -->"),
    ("if (confirm('Ви дійсно хочете вийти?')) {",
     "if (confirm('Tem a certeza que quer sair?')) {"),
    ("<i class=\"fas fa-route\"></i> Маршрут",
     "<i class=\"fas fa-route\"></i> Rota"),
    ("<h3 class=\"card-title\">Інтерактивна мапа ліфтів</h3>",
     "<h3 class=\"card-title\">Mapa interactivo de elevadores</h3>"),
    ("console.error('❌ Erro ao carregar ліфтів:', error);",
     "console.error('❌ Erro ao carregar elevadores:', error);"),
    ("console.log('✅ Маршрут encontrado:');",
     "console.log('✅ Rota encontrada:');"),
    ("case 'maintenance': return 'Na obслуговуванні';",
     "case 'maintenance': return 'Em manutenção';"),
    ("case 'maintenance': return 'Na обслуговуванні';",
     "case 'maintenance': return 'Em manutenção';"),
    ("case 'inactive': return 'З несправностями';",
     "case 'inactive': return 'Com falhas';"),
    ("<p>Сьогодні</p>", "<p>Hoje</p>"),
    ("<h3 class=\"card-title\">Filtros та пошук</h3>",
     "<h3 class=\"card-title\">Filtros e pesquisa</h3>"),
    ("<td><span class=\"badge badge-success\">Успішно</span></td>",
     "<td><span class=\"badge badge-success\">Com sucesso</span></td>"),
    ("<th>Дійсний до</th>", "<th>Válido até</th>"),
    ("<label>Capacidade de carga (кг)</label>",
     "<label>Capacidade de carga (kg)</label>"),
    ("<option value=\"security\">Безпека</option>",
     "<option value=\"security\">Segurança</option>"),
    ("<!-- 👤 Завантажувач профілю з API -->",
     "<!-- 👤 Carregador de perfil da API -->"),
    ("<label>Período:</label>", "<label>Período:</label>"),
    ("<strong>Ліфт:</strong> <span id=\"inspReqModal_liftRef\"></span> &nbsp;|&nbsp;",
     "<strong>Elevador:</strong> <span id=\"inspReqModal_liftRef\"></span> &nbsp;|&nbsp;"),
    ("<strong>Адреса:</strong> <span id=\"inspReqModal_address\"></span><br>",
     "<strong>Endereço:</strong> <span id=\"inspReqModal_address\"></span><br>"),
    ("<strong>Validade сертифікату:</strong>",
     "<strong>Validade do certificado:</strong>"),
    ("<small class=\"text-muted flex-grow-1\"><i class=\"fas fa-info-circle mr-1\"></i>Se Brevo não estiver configurado",
     "<small class=\"text-muted flex-grow-1\"><i class=\"fas fa-info-circle mr-1\"></i>Se o Brevo não estiver configurado"),
    ("if (confirm('Eliminar цей звіт з архіву назавжди?')) {",
     "if (confirm('Eliminar este relatório do arquivo permanentemente?')) {"),
    ("console.log('🏗️ Recebido currentLiftId з enhanced modal:', window.currentLiftId);",
     "console.log('🏗️ currentLiftId recebido do modal melhorado:', window.currentLiftId);"),
    ("alert('Erro завантаження деталей ліфта');",
     "alert('Erro ao carregar detalhes do elevador');"),
    ("console.log('✅ Стара карта редагування видалена');",
     "console.log('✅ Mapa de edição antigo removido');"),
    ("<i class=\"fas fa-trash\"></i> Видалити",
     "<i class=\"fas fa-trash\"></i> Eliminar"),
    ("title=\"Відкрити PDF ficheiro\">",
     "title=\"Abrir ficheiro PDF\">"),
    ("console.log('👁️ Перегляд звіту:', report);",
     "console.log('👁️ A ver relatório:', report);"),
    ("console.log('🔍 Pesquisar ліфтів:', query);",
     "console.log('🔍 A pesquisar elevadores:', query);"),
    ("console.log(`✅ Encontrado ліфтів: ${filtered.length} з ${window.allLiftsData.length}`);",
     "console.log(`✅ Elevadores encontrados: ${filtered.length} de ${window.allLiftsData.length}`);"),
    ("console.warn('⚠️ Поле searchInput не encontrado');",
     "console.warn('⚠️ Campo searchInput não encontrado');"),
    ("alert('Exportar PDF буде доступний у наступній версії.\\n\\nНаразі використовуйте експорт CSV.');",
     "alert('A exportação PDF estará disponível na próxima versão.\\n\\nPor enquanto, utilize a exportação CSV.');"),
    ("<i class=\"fas fa-use\"></i> Використати",
     "<i class=\"fas fa-use\"></i> Utilizar"),
    ("<i class=\"fas fa-check mr-1\"></i>Завершити",
     "<i class=\"fas fa-check mr-1\"></i>Concluir"),
    ("<option value=\"7\">7 днів</option>",
     "<option value=\"7\">7 dias</option>"),
    ("<option value=\"14\">14 днів</option>",
     "<option value=\"14\">14 dias</option>"),
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
