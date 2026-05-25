#!/usr/bin/env python3
"""
translate_all10.py — Tradução Ukrainian → Portuguese (pt-PT)
Foco: client, tech, dispatcher panels
"""
import glob, re

files_client = glob.glob('pages/client/**/*.html', recursive=True) + glob.glob('pages/client/*.html')
files_tech = glob.glob('pages/tech/**/*.html', recursive=True) + glob.glob('pages/tech/*.html')
files_dispatcher = glob.glob('pages/dispatcher/**/*.html', recursive=True) + glob.glob('pages/dispatcher/*.html')
files_all = list(set(files_client + files_tech + files_dispatcher))

FIXES = [
    # ============================================================
    # VISIBLE HTML TEXT - monitoring.html
    # ============================================================
    ("Мапи розeшування de técnicos", "Mapa de localização de técnicos"),
    ("Мапа розeшування de técnicos", "Mapa de localização de técnicos"),
    ("Ativos tarefas в реальному horaі", "Tarefas ativas em tempo real"),
    ("Наванeження do sistema", "Carga do sistema"),

    # ============================================================
    # VISIBLE HTML TEXT - reports.html
    # ============================================================
    ("Розподіл по prioridadeах", "Distribuição por prioridades"),
    ("A carregar по do diaх", "A carregar por dias"),
    ("Disponíveis tipoи de relatórios", "Tipos de relatórios disponíveis"),
    ("Atéрівняльний análise", "Análise comparativa"),
    ("Atéрівняльний аналjunto", "Análise comparativa"),
    ("Indicadorи KPI", "Indicadores KPI"),

    # ============================================================
    # VISIBLE HTML TEXT - tech/support.html
    # ============================================================
    ("Як отримати acesso ao sistema?", "Como obter acesso ao sistema?"),
    ("Contacte o administrador para отримання loginа e palavra-passe.", "Contacte o administrador para obter login e palavra-passe."),
    ("O que fazer при поломці do elevador?", "O que fazer em caso de avaria do elevador?"),
    ("Em primeiro lugar оцініть ситуацію, потім заtelefoneуйте на гарячу лінію.", "Em primeiro lugar, avalie a situação e ligue para a linha de apoio."),

    # ============================================================
    # VISIBLE HTML TEXT - tech/ar-helper.html
    # ============================================================
    ("Aponte a câmara на elevador ou маркер para активації AR", "Aponte a câmara para o elevador ou marcador para ativar o AR"),
    ("Aponte a câmara на elevador ou робоче ambiente", "Aponte a câmara para o elevador ou ambiente de trabalho"),

    # ============================================================
    # VISIBLE HTML TEXT - tech/knowledge-base.html
    # ============================================================
    ("Todas теми", "Todos os temas"),

    # ============================================================
    # JS INLINE ERROR MESSAGES (user-visible in alerts/throws)
    # ============================================================
    ("'Сервер повернув неправильний formato dados'", "'Servidor devolveu formato de dados inválido'"),
    ("Орçаменто не encontrado", "Orçamento não encontrado"),
    ("'QR-code не encontrado'", "'QR-code não encontrado'"),
    ("'Erro: не selecionados elevador'", "'Erro: nenhum elevador selecionado'"),
    ("'Ficheiro занадто великий. Tamanho máximo: 10 MB'", "'Ficheiro demasiado grande. Tamanho máximo: 10 MB'"),
    ("'Недопустимий tipo ficheiro. Дозволені: PDF, DOC, DOCX, JPG, PNG'", "'Tipo de ficheiro inválido. Permitidos: PDF, DOC, DOCX, JPG, PNG'"),
    ("'Erro carregamento documentoа'", "'Erro ao carregar documento'"),
    ("'Erro eliminação documentoа'", "'Erro ao eliminar documento'"),
    ("Документ com sucesso eliminado", "Documento eliminado com sucesso"),
    ("Документ com sucesso carregado", "Documento carregado com sucesso"),
    ("Preencha обов'язкові поля: Número municipal e Endereço", "Preencha os campos obrigatórios: Número municipal e Endereço"),
    ("Inspeção прострочена на", "Inspeção em atraso há"),
    ("Неativo", "Inativo"),

    # ============================================================
    # HTML COMMENTS (sidebar templates - appear in all pages)
    # ============================================================
    ("<!-- ЕТАЛОННИЙ SIDEBAR ДЛЯ КЛІЄНТСЬКИХ СManutençãoРІНОК -->", "<!-- SIDEBAR PADRÃO PARA PÁGINAS DO CLIENTE -->"),
    ("<!-- ⚠️ НЕ РЕДАГУЙТЕ ОКРЕМО! Виutilizовуйте цей ficheiro як еeлон -->", "<!-- ⚠️ NÃO EDITE SEPARADAMENTE! Use este ficheiro como modelo -->"),
    ("<!-- Навігаційна painel -->", "<!-- Painel de navegação -->"),
    ("<!-- Бічна painel -->", "<!-- Painel lateral -->"),
    ("<!-- Додаткові стилі -->", "<!-- Estilos adicionais -->"),
    ("<!-- Додаткові ferramentas -->", "<!-- Ferramentas adicionais -->"),
    ("<!-- Скрипт para підсвічування активного itemу -->", "<!-- Script para destacar item ativo -->"),
    ("<!-- Стилі para badge purple -->", "<!-- Estilos para badge roxo -->"),
    ("<!-- Janela modal створення нової pedidos -->", "<!-- Modal de criação de novo pedido -->"),
    ("<!-- Janela modal візуалізації pedidos -->", "<!-- Modal de visualização de pedido -->"),
    ("<!-- Janela modal visualizaçãoу pedidos -->", "<!-- Modal de visualização de pedido -->"),
    ("<!-- Janela modal налаштувань relatório -->", "<!-- Modal de configurações de relatório -->"),
    ("<!-- Janela modal дetc do técnico -->", "<!-- Modal de detalhes do técnico -->"),
    ("<!-- Conteúdo дetc do técnico -->", "<!-- Conteúdo de detalhes do técnico -->"),
    ("<!-- Gráficoи e análise -->", "<!-- Gráficos e análise -->"),
    ("<!-- Estatísticas в реальному horaі -->", "<!-- Estatísticas em tempo real -->"),
    ("<!-- Мапа e основний monitorização -->", "<!-- Mapa e monitorização principal -->"),
    ("<!-- Permissões horaтина навігації -->", "<!-- Permissões de navegação -->"),
    ("<!-- Chart.js ЛОКАЛЬНИЙ -->", "<!-- Chart.js LOCAL -->"),
    ("<!-- 3. AI Previsãoування -->", "<!-- 3. Previsão AI -->"),
    ("<!-- Filtroи -->", "<!-- Filtros -->"),
    ("<!-- Atéрівняльний аналjunto será заванeжений aqui -->", "<!-- A análise comparativa será carregada aqui -->"),
    ("<!-- Atéрівняльний аналjunto -->", "<!-- Análise comparativa -->"),
    ("<!-- KPI indicadores serão заванeжені aqui -->", "<!-- Os indicadores KPI serão carregados aqui -->"),
    ("<!-- Dados serão заванeжені aqui -->", "<!-- Os dados serão carregados aqui -->"),
    ("<!-- Ativos tarefas serão заванeжені aqui -->", "<!-- As tarefas ativas serão carregadas aqui -->"),
    ("<!-- Estadoи de técnicos serão заванeжені aqui -->", "<!-- Os estados dos técnicos serão carregados aqui -->"),
    ("<!-- Notificações serão заванeжені aqui -->", "<!-- As notificações serão carregadas aqui -->"),

    # ============================================================
    # JS COMMENTS — common patterns across all pages
    # ============================================================
    ("// Ініціалізація AdminLTE", "// Inicialização do AdminLTE"),
    ("// Ініціалізація clienteських dados desde API", "// Inicialização dos dados do cliente desde a API"),
    ("// Ініціалізація менеджера de relatórios", "// Inicialização do gestor de relatórios"),
    ("// Ініціалізація", "// Inicialização"),
    ("// Ініціалізуexisteмо WebSocket", "// Inicialização do WebSocket"),
    ("// Визнаouти поточну a página", "// Determinar a página atual"),
    ("// Мапінг de páginas на ID навігації", "// Mapeamento de páginas para ID de navegação"),
    ("// Підсвітити ativo item", "// Destacar item ativo"),
    ("// Descarregar ліouльники desde API", "// Carregar contadores desde a API"),
    ("// Оновлювати ліouльники кожні 30 segundos", "// Atualizar contadores a cada 30 segundos"),
    ("// Atualização horaу", "// Atualização da hora"),
    ("// Quantidade рахунків", "// Quantidade de faturas"),
    ("// Функція виходу", "// Função de saída"),
    ("// Função виходу", "// Função de saída"),
    ("// Маsando todos dados через AuthManager", "// Limpando todos os dados através do AuthManager"),
    ("// Оouщуexisteмо todos dados через de AuthManager", "// Limpando todos os dados através do AuthManager"),
    ("// Fallback se AuthManager не заванeжений", "// Fallback se AuthManager não estiver carregado"),
    ("// Fallback до локальних dados", "// Fallback para dados locais"),
    ("// Ініціалізація AdminLTE", "// Inicialização do AdminLTE"),
    ("// Ініціалізація clienteських dados desde API", "// Inicialização dos dados do cliente desde API"),
    ("// client-dashboard.js створюexiste window.clientDashboard сам через de DOMContentLoaded", "// client-dashboard.js cria window.clientDashboard via DOMContentLoaded"),
    ("// Деаванeжуexisteмо dados do utilizador", "// Carregar dados do utilizador"),
    ("// Оновлюexisteмо interface do utilizador", "// Atualizar interface do utilizador"),
    ("// Деаванeжуexisteмо dados painelу", "// Carregar dados do painel"),
    ("// Оновлюexisteмо сeтистику", "// Atualizar estatísticas"),
    ("// Атéказуexisteмо recentes pedidos", "// Mostrar pedidos recentes"),
    ("// ✅ Передаexisteмо реальні dados в ClientDashboard", "// ✅ Passar dados reais ao ClientDashboard"),
    ("// ✅ API já devolve apenas elevadores цього cliente", "// ✅ A API já devolve apenas os elevadores deste cliente"),
    ("// Оновлюexisteмо ліouльник de notificações", "// Atualizar contador de notificações"),
    ("// Масив вибраних foto (File objects)", "// Array de fotos selecionadas (File objects)"),
    ("// Уникнути дублікатів", "// Evitar duplicados"),
    ("// Кнопка \"+inda\" se менше 5 foto", "// Botão \"+mais\" se menos de 5 fotos"),
    ("// Gestor de pedidos para de clientes", "// Gestor de pedidos para clientes"),
    ("// Descarregar e відобразити pedidos", "// Carregar e mostrar pedidos"),
    ("// Отримуexisteмо dados desde форми", "// Obter dados do formulário"),
    ("// Валідація", "// Validação"),
    ("// Валідація email", "// Validação de email"),
    ("// Отримуexisteмо endereço selecionadosго do elevador desde select'а", "// Obter endereço selecionado do elevador no select"),
    ("// Формуexisteмо dados pedidos", "// Formar dados do pedido"),
    ("// Прикріплюexisteмо foto як base64 se existe", "// Anexar fotos como base64 se existirem"),
    ("// Ocultar ліouльник se ендпоінт не existe", "// Ocultar contador se o endpoint não existir"),
    ("// Прибираexisteмо ativo classe desde todосх itens меню", "// Remover classe ativa de todos os itens do menu"),
    ("// Прибираexisteмо ativo classe desde todosх itens меню", "// Remover classe ativa de todos os itens do menu"),
    ("// Спробуexisteмо descarregar desde API", "// Tentar carregar desde a API"),
    ("// Створюexisteмо нову mapa", "// Criar novo mapa"),
    ("// Перевіряexisteмо чи Leaflet заванeжений", "// Verificar se Leaflet está carregado"),
    ("// Додаexisteмо tiles", "// Adicionar tiles"),
    ("// Додаexisteмо popup se existe endereço", "// Adicionar popup se existir endereço"),
    ("// Видаляexisteмо сeру mapa se existe", "// Remover mapa anterior se existir"),
    ("// Оновлюexisteмо tamanho карти (важливо para модальних вікон)", "// Atualizar tamanho do mapa (importante para janelas modais)"),
    ("// Обробник carregamento PDF ficheiro", "// Manipulador de carregamento de ficheiro PDF"),
    ("// Додаexisteмо модальне вікно до DOM se його ainda não має", "// Adicionar janela modal ao DOM se ainda não existir"),
    ("// Додаexisteмо модальне вікно до DOM se його ainda não há", "// Adicionar janela modal ao DOM se ainda não existir"),
    ("// Переchaveення власного períodoу", "// Alternância do período personalizado"),
    ("// Deа замовчуванням", "// Por predefinição"),
    ("// Deа замовчуванням 1 horasа", "// Por predefinição 1 hora"),
    ("// 20% шанс trabalhos Manutenção", "// 20% de probabilidade de trabalhos de manutenção"),
    ("// Тільки URL, не весь instalação!", "// Apenas URL, não toda a instalação!"),
    ("// Deнижуexisteмо рівень корекції (H->M) para менших códigos", "// Reduzir nível de correção (H->M) para códigos menores"),
    ("// Deберігаexisteмо URL para do QR-code", "// Guardar URL do QR-code"),
    ("// Deберігаexisteмо відformatoовану endereço", "// Guardar endereço formatado"),
    ("// Лісouн predefinido", "// Lisboa predefinida"),
    ("// 2 anos para com sucessoї inspeções", "// 2 anos para inspeções bem-sucedidas"),
    ("// Limpar попереdias опції", "// Limpar opções anteriores"),
    ("// Не створювати додаткові маркери", "// Não criar marcadores adicionais"),
    ("// Base будівлі", "// Base do edifício"),
    ("// Колона 1", "// Coluna 1"),
    ("// Колона 2", "// Coluna 2"),
    ("// Колона 3", "// Coluna 3"),
    ("// Колона 4", "// Coluna 4"),
    ("// Дах", "// Telhado"),
    ("/* ігноруexisteмо */", "/* ignorar */"),
    ("// Adicionar para email функції", "// Adicionar para funções de email"),

    # ============================================================
    # REMAINING SIDEBAR COMMENTS
    # ============================================================
    ("ЕТАЛОННИЙ SIDEBAR ДЛЯ КЛІЄНТСЬКИХ СManutençãoРІНОК", "SIDEBAR PADRÃO PARA PÁGINAS DO CLIENTE"),
    ("НЕ РЕДАГУЙТЕ ОКРЕМО! Виutilizовуйте цей ficheiro як еeлон", "NÃO EDITE SEPARADAMENTE! Use este ficheiro como modelo"),
]

changed_files = 0
total_replacements = 0

for filepath in sorted(set(files_all)):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ Cannot read {filepath}: {e}")
        continue
    
    new_content = content
    count = 0
    for old, new in FIXES:
        if old in new_content:
            new_content = new_content.replace(old, new)
            count += 1
    
    if count > 0 and new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"✅ {filepath} — {count} fix(es)")
        changed_files += 1
        total_replacements += count
    
print(f"\n{'='*50}")
print(f"✅ Total: {changed_files} files, {total_replacements} replacements")
