#!/usr/bin/env python3
# Другий прохід перекладу — розширений словник для залишків

import glob

TRANSLATIONS2 = [
    # === Redirects ===
    ('Перенаправлення на нову сторінку AI Assistenteа...', 'A redirecionar para a nova página do Assistente de IA...'),
    ('Якщо автоматичне перенаправлення не спрацювало, <a href="/pages/ai-assistant/ai-assistant.html">клікніть тут</a>.', 'Se o redirecionamento automático não funcionar, <a href="/pages/ai-assistant/ai-assistant.html">clique aqui</a>.'),
    ('Перенаправлення на правильний login.html', 'Redirecionamento para o login.html correto'),
    ('Застаріла endereço', 'Endereço desatualizado'),
    ('Перенаправлення на правильну endereço...', 'A redirecionar para o endereço correto...'),
    ('Перenаправлення...', 'A redirecionar...'),
    ('Перенаправлення...', 'A redirecionar...'),
    ('⏳ Перенаправлення...', '⏳ A redirecionar...'),
    ('Переendereçoція...', 'A redirecionar...'),
    ('переendereçoовані на нову єдину аналітичну систему', 'redirecionados para o novo sistema de análise unificado'),
    ('Ви будете автоматично переendereçoовані', 'Será automaticamente redirecionado'),
    ('Clique тут, якщо переendereçoція не a funcionar', 'Clique aqui se o redirecionamento não funcionar'),

    # === Diagnostics buttons ===
    ('Verificar скрипти', 'Verificar scripts'),
    ('Verificar класи', 'Verificar classes'),

    # === Analytics dashboard ===
    ('Actualizar дані', 'Atualizar dados'),
    ('QR кодів criado', 'QR-codes criados'),
    ('Інспекцій запланов.', 'Inspeções agendadas.'),
    ('Ativosсть do sistema за останні 7 днів', 'Atividade do sistema nos últimos 7 dias'),
    ('Розподіл подій', 'Distribuição de eventos'),
    ("Здоров'я do sistema", 'Saúde do sistema'),
    ('QR коди', 'QR-codes'),
    ('Згенеровано QR код', 'QR-code gerado'),
    ('Sistema a funcionar нормально', 'Sistema a funcionar normalmente'),
    ('EventBus не ativo', 'EventBus não ativo'),
    ('Baixa активність do sistema', 'Baixa atividade do sistema'),
    ('Низька активність do sistema', 'Baixa atividade do sistema'),
    ('Поações: ', 'Eventos: '),
    ('Слухачі: ', 'Ouvintes: '),
    ('Неacessoно', 'Não acessível'),
    ('Зберігання даних', 'Armazenamento de dados'),

    # === Analytics page ===
    ('Análise та статистика', 'Análise e estatísticas'),
    ('Filtros аналітики', 'Filtros de análise'),
    ('Período:', 'Período:'),
    ('Período', 'Período'),
    ('Tipo аналітики:', 'Tipo de análise:'),
    ('Фінансова', 'Financeira'),
    ('Використання', 'Utilização'),
    ('Застосувати filtros', 'Aplicar filtros'),
    ('Exportar relatórioу', 'Exportar relatório'),
    ('Total ТО', 'Total de manutenções'),
    ('Concluído ТО', 'Manutenções concluídas'),
    ('Загальний дохід', 'Receita total'),
    ('Ativosсть технічного обслуговування', 'Atividade de manutenção técnica'),
    ('Фінансові показники', 'Indicadores financeiros'),
    ('Тенденції та прогнози', 'Tendências e previsões'),
    ('Chaveові інсайти', 'Insights principais'),
    ('Зростання ефективності', 'Crescimento de eficiência'),
    ('Desempenho de técnicos зросла за останній місяць', 'O desempenho dos técnicos cresceu no último mês'),
    ('Увага до профілактики', 'Atenção à prevenção'),
    ('Elevadores потребують urgenteго обслуговування', 'Elevadores necessitam de manutenção urgente'),
    ('Фінансова стабільність', 'Estabilidade financeira'),
    ('Receitas зросли порівняно з минулим кварталом', 'As receitas cresceram em relação ao trimestre anterior'),
    ('Задоволеність клієнтів', 'Satisfação dos clientes'),
    ('Високий рівень задоволеності клієнтів', 'Alto nível de satisfação dos clientes'),
    ('Previsão та recomendações', 'Previsão e recomendações'),
    ('Прогноз carregamento', 'Previsão de carga'),
    ('Наступного тижня очікується зmaisння pedidos на 25%', 'Prevê-se um aumento de 25% nos pedidos na próxima semana'),
    ('Recomendações по ресурсах', 'Recomendações de recursos'),

    # === Audit log ===
    ('Журнал безпеки', 'Registo de segurança'),
    ('Журнал безпеки (Audit Log)', 'Registo de segurança (Audit Log)'),
    ('Exportarувати журнал', 'Exportar registo'),
    ('Операція', 'Operação'),

    # === Email template ===
    ("Dinamicamente додані modeloи з'являться тут", 'Os modelos adicionados dinamicamente aparecerão aqui'),
    ('Novo modelo - очистити форму', 'Novo modelo - limpar formulário'),
    ('Edição існуючого modeloу', 'Edição do modelo existente'),
    ('Створити novo ID для modeloу', 'Criar novo ID para o modelo'),
    ('Actualizar існуючий modelo', 'Atualizar modelo existente'),

    # === Import checklists ===
    ('Імпорт чек-листів для de inspeções', 'Importação de listas de verificação para inspeções'),
    ('Імпортовані чек-листи:', 'Listas de verificação importadas:'),
    ('Seleccione ficheiro для імпорту', 'Selecione ficheiro para importar'),

    # === Inspection template ===
    ('Війти', 'Sair'),
    ('послідовна нумерація в межах сесії', 'numeração sequencial dentro da sessão'),

    # === Invoice template ===
    ('Блок pesquisaу по endereçoі / elevadorу', 'Bloco de pesquisa por endereço / elevador'),
    ('Логоtipo FestLift', 'Logótipo FestLift'),
    ('jsPDF для генерації PDF', 'jsPDF para geração de PDF'),
    ('Отримати останній número з API', 'Obter o último número da API'),
    ('Fallback: генерувати локально', 'Fallback: gerar localmente'),

    # === Admin lifts ===
    ('Таб: Instalação', 'Separador: Instalação'),
    ("Обов\\'язковий · QR генерується автоматично", "Obrigatório · QR gerado automaticamente"),
    ("Обов\\'язковий", 'Obrigatório'),
    ('Novos estilos limpos для поля інспектора', 'Estilos limpos para o campo do inspetor'),
    ('Estilos para novo динамічно criado textarea коментарів', 'Estilos para o textarea de comentários criado dinamicamente'),
    ('Zbереження do elevador', 'Guardar elevador'),
    ("Споchatку збережіть elevador, щоб можна було adicionar relatório.", "Primeiro guarde o elevador para poder adicionar um relatório."),
    ('Для цього do elevador вже є relatório від ', 'Já existe um relatório para este elevador de '),
    ('Видаляємо лише inspection backdrop', 'Remover apenas a sobreposição da inspeção'),
    ('Перетягніть маркер для точнішого позиціонування', 'Arraste o marcador para um posicionamento mais preciso'),
    ('Encontrado кілька endereço — оберіть правильну', 'Encontrados vários endereços — selecione o correto'),
    ('Геокодування (проксі):', 'Geocodificação (proxy):'),
    ('Não encontrado. Уточніть назву вулиці та número будинку.', 'Não encontrado. Especifique o nome da rua e o número da casa.'),
    ('Endereçoу не encontrado. Уточніть назву вулиці та número будинку.', 'Endereço não encontrado. Especifique o nome da rua e o número da casa.'),
    ('Geocode не encontrado:', 'Geocode não encontrado:'),
    ('Геокодовано:', 'Geocodificado:'),
    ('варіантів', 'opções'),
    ('Coordenadas визначено:', 'Coordenadas determinadas:'),
    ('Геокодування', 'Geocodificação'),
    ('Err геокодування:', 'Erro de geocodificação:'),
    ("Erro геокодування. Перевірте з\\'єднання.", "Erro de geocodificação. Verifique a ligação."),
    ('Обробник геокодування ligado (проксі + авто)', 'Handler de geocodificação ligado (proxy + auto)'),
    ('Elevadores клієнта ', 'Elevadores do cliente '),
    ('збереження do elevador...', 'a guardar elevador...'),
    ('при редагуванні виchaveаємо поточний', 'ao editar obtemos o atual'),
    ('не рахуємо себе', 'não contamos a si próprio'),
    ('За цією endereçoою вже зареєстровано ', 'Neste endereço já estão registados '),
    ('elevador', 'elevador'),
    ('Ціна ', 'Preço '),
    ('€/міс підтягнута з сусіднього do elevador. Можна', '€/mês obtido do elevador vizinho. Pode'),
    ('Tipo de accionamento підтягнуто з сусіднього do elevador. Можна de alteraçãoти', 'Tipo de acionamento obtido do elevador vizinho. Pode alterar'),
    ('Tipo de portas підтягнуто з сусіднього do elevador. Можна de alteraçãoти', 'Tipo de portas obtido do elevador vizinho. Pode alterar'),
    ('Службовий', 'De serviço'),
    ('Ескалатор', 'Escada rolante'),
    ('Інший', 'Outro'),
    ('пов.', 'and.'),
    ('2 роки', '2 anos'),
    ('1 рік', '1 ano'),
    ('60 днів ≈ 2 місяці', '60 dias ≈ 2 meses'),
    ('Certificado прострочено!', 'Certificado expirado!'),
    ('До закінчення сертифікату', 'Até ao fim do certificado'),
    ('дн.', 'dias'),
    ('Data сертифікату não especificado. Запросіть inspeção вруч', 'Data do certificado não especificada. Solicite inspeção manualmente'),
    ('Número municipal не можна de alteraçãoти після реєстрації do elevador', 'O número municipal não pode ser alterado após o registo do elevador'),
    ('з ', 'desde '),
    ('автопродовження', 'renovação automática'),
    ('Ficheiro cont', 'Ficheiro con'),
    ('Єдиний формат коду', 'Formato único do código'),
    ('inspection: \'інспекція\'', "inspection: 'inspeção'"),
    ("'інспекція'", "'inspeção'"),
    ("'то'", "'manutenção'"),
    ("'ремонт'", "'reparação'"),
    ("'аварія'", "'avaria'"),
    ("'Щорічна / Periódica'", "'Anual / Periódica'"),
    ('Відправка з PDF ficheiroом:', 'A enviar com ficheiro PDF:'),
    ('Dados relatórioу (JSON):', 'Dados do relatório (JSON):'),
    ('PDF relatório aberto в novosй вкладці', 'Relatório PDF aberto em nova aba'),
    ('Відкрити PDF', 'Abrir PDF'),
    ('PDF ficheiro не прикріплено', 'Ficheiro PDF não anexado'),
    ('Індекс relatórioу не визначено', 'Índice do relatório não definido'),
    ('Tem a certeza que quer eliminar цей relatório?', 'Tem a certeza que quer eliminar este relatório?'),
    ('Erro eliminação relatórioу:', 'Erro ao eliminar relatório:'),
    ('Erro надсилання relatórioу:', 'Erro ao enviar relatório:'),
    ('Reinspecção necessária', 'Reinspeção necessária'),
    ('Erro аналізу PDF', 'Erro na análise do PDF'),
    ('Não foi possível аналізувати PDF', 'Não foi possível analisar o PDF'),

    # === Admin login ===
    ('Перенаправлення...', 'A redirecionar...'),
    ('Перenаправлення', 'Redirecionamento'),
    ('Перенаправлення', 'Redirecionamento'),

    # === Maps simple ===
    ('Rua Шевченка', 'Rua Shevchenko'),
    ('Rua Франка', 'Rua Franka'),
    ('пр. Перемоги', 'Av. Peremogy'),
    ('Rua Лесі Українки', 'Rua Lesi Ukrainky'),
    ('Rua Сагайдачного', 'Rua Sahaidachnoho'),

    # === Maps ===
    ('ROUTING CONTROL - Вікно з rotaом (DRAGGABLE)', 'ROUTING CONTROL - Janela de rota (ARRASTÁVEL)'),
    ('Вікно rotaу - можна перетягувати', 'Janela de rota - arrastável'),
    ('ativa зона для перетягування', 'zona ativa para arrastar'),
    ('Альтернативи rotaу', 'Alternativas de rota'),
    ('Ocultar зайві елементи', 'Ocultar elementos desnecessários'),

    # === Notifications ===
    ('Адмін — Notificações', 'Admin — Notificações'),
    ('Позначити все як прочитане', 'Marcar tudo como lido'),
    ('Непрочитаних', 'Não lidas'),
    ('Цього тижня', 'Esta semana'),
    ('Всі', 'Todas'),

    # === Orcamentos list ===
    ('API_BASE_URL має бути порожнім для relative URLs', 'API_BASE_URL deve estar vazio para URLs relativos'),
    ('Token не encontrado, redirect на login', 'Token não encontrado, redirecionar para login'),
    ('Verificação чи página ativa перед redirect', 'Verificar se a página está ativa antes de redirecionar'),
    ('API повертає {success: true, data: [...], pagination: {...}}', 'API retorna {success: true, data: [...], pagination: {...}}'),

    # === Predictive maintenance ===
    ('Повернутися до головної', 'Voltar ao início'),
    ('ШІ Прогнози на seguinte período', 'Previsões de IA para o próximo período'),
    ('0 капремонтів', '0 grandes renovações'),
    ('Тренди прогнозування', 'Tendências de previsão'),

    # === Profile admin ===
    ('Perfil адміністратора - FestLift', 'Perfil do administrador - FestLift'),
    ('Perfil адміністратора', 'Perfil do administrador'),
    ('QR кодів', 'QR-codes'),
    ('Особиста informação', 'Informação pessoal'),

    # === QR analytics ===
    ('Переendereçoція...', 'A redirecionar...'),

    # === QR batch ===
    ('Пакетне керування - FestLift', 'Gestão em lote - FestLift'),
    ('Sidebar (аналогічний qr-generator.html)', 'Barra lateral (análoga qr-generator.html)'),
    ('Пакетне керування QR-кодами', 'Gestão em lote de QR-codes'),
    ('Пакетне керування', 'Gestão em lote'),
    ('Масове створення з CSV/Excel', 'Criação em massa a partir de CSV/Excel'),

    # === QR generator ===
    ('Генератор QR-кодів - FestLift', 'Gerador de QR-codes - FestLift'),
    ('Генератор QR-кодів', 'Gerador de QR-codes'),
    ('Параметри QR-коду', 'Parâmetros do QR-code'),
    ('Tipo QR-коду *', 'Tipo de QR-code *'),

    # === QR history ===
    ('Історія QR-кодів - FestLift', 'Histórico de QR-codes - FestLift'),
    ('Sidebar (аналогічний', 'Barra lateral (análoga'),
    ('Історія QR-кодів', 'Histórico de QR-codes'),
    ('За semana', 'Por semana'),

    # === QR management ===
    ('Gestão QR-кодами - FestLift', 'Gestão de QR-codes - FestLift'),
    ('Non-critical CDN CSS - завантажується асинхронно', 'Non-critical CDN CSS - carregado de forma assíncrona'),
    ('Кольорові бейджі estadoу', 'Badges coloridos de estado'),
    ('Анімація для de notificações', 'Animação para notificações'),
    ('Gestão QR-кодами', 'Gestão de QR-codes'),

    # === Report template ===
    ('Modelo relatórioу', 'Modelo de relatório'),
    ('Форма relatórioу', 'Formulário do relatório'),
    ('Заголовок relatórioу', 'Título do relatório'),
    ('Data relatórioу', 'Data do relatório'),

    # === Reports ===
    ('Кастомні стилі для relatórioів', 'Estilos personalizados para relatórios'),
    ('Управління relatórioами', 'Gestão de relatórios'),
    ('Seleccione tipo relatórioу', 'Selecione o tipo de relatório'),
    ('Período relatórioу', 'Período do relatório'),

    # === Requests ===
    ('Різні кольори для кожного tipoу pedidos', 'Cores diferentes para cada tipo de pedido'),
    ('Консультація', 'Consulta'),
    ('Список', 'Lista'),
    ('Сітка', 'Grelha'),
    ('Criar o pedido', 'Criar o pedido'),
    ('Створити o pedido', 'Criar o pedido'),

    # === Role manager ===
    ('Gestão ролями', 'Gestão de funções'),
    ('Gestão ролями та правами', 'Gestão de funções e permissões'),
    ('Exportarувати de função', 'Exportar funções'),
    ('Права', 'Permissões'),
    ('UI-елементи', 'Elementos de UI'),

    # === Settings ===
    ('Завантажуємо скрипти динамічно та чекаємо на їх carregamento', 'A carregar scripts dinamicamente e aguardando o carregamento'),
    ('Зберігаємо поlinha виконання', 'A guardar a linha de execução'),
    ('Коли всі скрипти завантажені - запускаємо ініціалізацію', 'Quando todos os scripts estiverem carregados - iniciar a inicialização'),
    ('Чекаємо трохи щоб settingsManager створився', 'Aguardar um pouco para o settingsManager ser criado'),
    ('Функція ініціалізації - викликається після carregamento всіх скриптів', 'Função de inicialização - chamada após o carregamento de todos os scripts'),

    # === Simple nav test ===
    ('Простий teste навігації', 'Teste simples de navegação'),
    ('Простий teste навігації до AI прогнозування', 'Teste simples de navegação para previsão de IA'),
    ('Це імітує меню з сторінки lifts.html без AdminLTE:', 'Isto imita o menu da página lifts.html sem AdminLTE:'),
    ('✅ Клік зареєстровано! Переходимо до:', '✅ Clique registado! A navegar para:'),
    ('Не блокуємо навігацію', 'Não bloquear a navegação'),

    # === Support ===
    ('Informação про систему', 'Informação sobre o sistema'),
    ('Сервер:', 'Servidor:'),
    ('База даних:', 'Base de dados:'),
    ('24 вересня 2025', '24 de setembro de 2025'),
    ('Acessoна 24/7', 'Acessível 24/7'),

    # === Test navigation ===
    ('Teste навігації AI Previsão', 'Teste de navegação de Previsão por IA'),

    # === Client pages ===
    ('Clienteська панель ініціалізована', 'Painel do cliente inicializado'),
    ('Помилка ініціалізації клієнтської панелі:', 'Erro de inicialização do painel cliente:'),
    ('Ініціалізація клієнтської панелі...', 'A inicializar o painel cliente...'),
    ('Erro ao carregar o perfil', 'Erro ao carregar o perfil'),
    ('API indisponível, usando dados locais', 'API indisponível: a usar dados locais'),
    ('A carregar elevadores do cliente da API...', 'A carregar elevadores do cliente da API...'),
    ('Elevadores carregados:', 'Elevadores carregados:'),
    ('Err ao carregar elevadores:', 'Erro ao carregar elevadores:'),
    ('A carregar pedidos do cliente...', 'A carregar pedidos do cliente...'),
    ('Pedidos carregados:', 'Pedidos carregados:'),
    ('Contêiner de pedidos não encontrado', 'Contêiner de pedidos não encontrado'),
    ('WebSocket ligado', 'WebSocket ligado'),
    ('Atualização do estado do pedido:', 'Atualização do estado do pedido:'),
    ('Atualização de disponibilidade dos elevadores:', 'Atualização de disponibilidade dos elevadores:'),
    ('Mensagem de serviço:', 'Mensagem de serviço:'),
    ('Desligado do sistema', 'Desligado do sistema'),
    ('Erro de ligação', 'Erro de ligação'),
    ('Erro de inicialização WebSocket:', 'Erro de inicialização do WebSocket:'),

    # === Dispatcher lifts ===
    ('Клієнт повинен знати, що prazo inspeções закінчується і що FestLift подбає про це.', 'O cliente deve saber que o prazo das inspeções está a terminar e que a FestLift tratará do assunto.'),
    ('Офіційний лист з проханням atribuir дату inspeções.', 'Carta oficial a solicitar a atribuição de uma data de inspeção.'),
    ('Erro парсингу tokenа:', 'Erro a analisar o token:'),
    ('Видаляємо лише inspection backdrop (elevador-модал ще відкритий)', 'A remover apenas o fundo de inspeção (o modal do elevador ainda está aberto)'),
    ('Instalado currentLiftId з форми edição:', 'Instalado currentLiftId do formulário de edição:'),
    ('180 днів для виправлення клауз', '180 dias para correção de cláusulas'),
    ('2 роки для com successoї inspeções', '2 anos para inspeções concluídas com sucesso'),
    ('com sucesso guardado в MongoDB!', 'guardado com sucesso no MongoDB!'),
    ('Геокодування (проксі):', 'Geocodificação (proxy):'),
    ('Geocode не encontrado:', 'Geocode não encontrado:'),
    ('Геокодовано:', 'Geocodificado:'),
    ('Coordenadas визначено!', 'Coordenadas determinadas!'),
    ('Err геокодування:', 'Erro de geocodificação:'),
    ('Обробник геокодування ligado (проксі + авто)', 'Handler de geocodificação ligado (proxy + auto)'),
    ('API повернув не масив:', 'API retornou não-array:'),
    ('Exception при завантаженні de elevadores:', 'Exceção ao carregar elevadores:'),
    ('saveLiftToAPI: збереження do elevador...', 'saveLiftToAPI: a guardar elevador...'),
    ('Показувати по 20 de elevadores на сторінці', 'Mostrar 20 elevadores por página'),
    ('Перехід на сторінку:', 'A navegar para a página:'),
    ('з ', 'desde '),
    ('автопродовження', 'renovação automática'),
    ('Замінити PDF', 'Substituir PDF'),
    ('Err надсилання relatórioу:', 'Erro ao enviar relatório:'),
    ('Visualização relatórioу:', 'Visualização do relatório:'),
    ('Sem relatórios. Cliqueь', 'Sem relatórios. Clique'),
    ('Err аналізу PDF', 'Erro na análise do PDF'),
    ('Não foi possível аналізувати PDF', 'Não foi possível analisar o PDF'),

    # === Tech dashboard ===
    ('Não foi possível otrimati дані користувача', 'Não foi possível obter os dados do utilizador'),
    ('Não foi possível otrimati', 'Não foi possível obter'),
    ('Autoризовано як:', 'Autorizado como:'),
    ('A carregar dados do técnico...', 'A carregar dados do técnico...'),
    ('Dados do técnico carregados', 'Dados do técnico carregados'),
    ('Erro ao carregar dados do técnico:', 'Erro ao carregar dados do técnico:'),
    ('Tabela de tarefas não encontrada', 'Tabela de tarefas não encontrada'),
    ('Tarefas ativas para exibição:', 'Tarefas ativas para exibição:'),
    ('total:', 'total:'),
    ('Abertura dos detalhes da tarefa:', 'Abertura dos detalhes da tarefa:'),
    ('Início de execução da tarefa:', 'Início de execução da tarefa:'),
    ('Conclusão da tarefa:', 'Conclusão da tarefa:'),
    ('Erro ao concluir:', 'Erro ao concluir:'),
    ('Erro ao concluir a tarefa', 'Erro ao concluir a tarefa'),
    ('Adição de nota à tarefa:', 'Adição de nota à tarefa:'),
    ('Mostrar rota para o elevador:', 'Mostrar rota para o elevador:'),
    ('Nota adicionada com sucesso', 'Nota adicionada com sucesso'),
    ('Erro ao adicionar nota:', 'Erro ao adicionar nota:'),
    ('Nota guardada localmente', 'Nota guardada localmente'),
    ('Estado da tarefa atualizado', 'Estado da tarefa atualizado'),
    ('Erro ao atualizar estado:', 'Erro ao atualizar estado:'),
    ('Erro ao atualizar estado da tarefa', 'Erro ao atualizar estado da tarefa'),
    ('User não passado para initTechWebSocket', 'Utilizador não passado para initTechWebSocket'),
    ('ID de utilizador não encontrado:', 'ID de utilizador não encontrado:'),
    ('Ligado ao sistema', 'Ligado ao sistema'),
    ('Nova tarefa:', 'Nova tarefa:'),
    ('Diagnóstico do elevador:', 'Diagnóstico do elevador:'),
    ('WebSocket desligado', 'WebSocket desligado'),
    ('Erro de inicialização WebSocket', 'Erro de inicialização do WebSocket'),
    ('Erro ao carregar os detalhes da tarefa:', 'Erro ao carregar os detalhes da tarefa:'),
    ('Não foi possível carregar os detalhes da tarefa', 'Não foi possível carregar os detalhes da tarefa'),
    ('Não definido', 'Não definido'),
    ('Atribuído', 'Atribuído'),
    ('Adicionar nota', 'Adicionar nota'),
    ('Novas tarefas aparecerão aqui automaticamente', 'Novas tarefas aparecerão aqui automaticamente'),
    ('Sem tarefas ativas', 'Sem tarefas ativas'),
    ('Não foi possível obter as coordenadas do elevador', 'Não foi possível obter as coordenadas do elevador'),
    ('Coordenadas do elevador não encontradas', 'Coordenadas do elevador não encontradas'),

    # === Admin users ===
    ('Não foi possível carregar utilizadores. Verifique a ligação ao servidor.', 'Não foi possível carregar utilizadores. Verifique a ligação ao servidor.'),
    ('Criar novo utilizador:', 'Criar novo utilizador:'),
    ('Erro ao criar utilizador', 'Erro ao criar utilizador'),
    ('Erro ao atualizar utilizador', 'Erro ao atualizar utilizador'),
    ('Utilizador guardado com sucesso', 'Utilizador guardado com sucesso'),
    ('Não foi possível guardar o utilizador', 'Não foi possível guardar o utilizador'),
    ('Utilizador não encontrado', 'Utilizador não encontrado'),
    ('Erro ao alterar estado', 'Erro ao alterar estado'),
    ('Estado do utilizador alterado para', 'Estado do utilizador alterado para'),
    ('Não foi possível alterar o estado do utilizador', 'Não foi possível alterar o estado do utilizador'),
    ('Utilizador eliminado com sucesso', 'Utilizador eliminado com sucesso'),
    ('Não foi possível eliminar o utilizador', 'Não foi possível eliminar o utilizador'),
    ('Utilizador criado!', 'Utilizador criado!'),
    ('deixe vazio para geração automática', 'deixe vazio para geração automática'),

    # === dispatcher dashboard ===
    ('Dispatcher - Painel principal', 'Dispatcher - Painel principal'),
    ('Painel do dispatcher', 'Painel do dispatcher'),
    ('Total de pedidos', 'Total de pedidos'),
    ('Em espera', 'Em espera'),
    ('Técnicos disponíveis', 'Técnicos disponíveis'),
    ('Pedidos urgentes', 'Pedidos urgentes'),
    ('Últimos pedidos', 'Últimos pedidos'),
    ('Ordenar: Mais recentes primeiro', 'Ordenar: Mais recentes primeiro'),

    # === Remaining common words ===
    ('relatórioу', 'relatório'),
    ('relatórioа', 'relatório'),
    ('endereçoою', 'endereço'),
    ('endereçoі', 'endereço'),
    ('endereçoа', 'endereço'),
    ('endereçoу', 'endereço'),
    ('endereço', 'endereço'),
    ('Endereçoу', 'Endereço'),
    ('Endereçoою', 'Endereço'),
    ('técnicoa', 'técnico'),
    ('técnicoа', 'técnico'),
    ('Перевіряємо завантажені скрипти...', 'A verificar scripts carregados...'),
    ('Перевіряємо acessoність класів..', 'A verificar a acessibilidade das classes..'),
    ('Знайдено', 'Encontrado'),
    ('Можна створити екземпляр', 'É possível criar uma instância de'),
    ('Метод ', 'Método '),
    ('є', 'existe'),
    ('відсутній', 'ausente'),
    ('відсутня', 'ausente'),
    ('Err створення екземпляра:', 'Erro ao criar instância:'),
    ('НЕ ЗНАЙДЕНО', 'NÃO ENCONTRADO'),
    ('ЗНАЙДЕНО', 'ENCONTRADO'),
    ('Функція ', 'Função '),
    ('Testeуємо ініціалізацію do sistema...', 'A testar a inicialização do sistema...'),
    ('Викликаємо initPredictiveAnalytics()...', 'A chamar initPredictiveAnalytics()...'),
    ('Resultado ініціалізації:', 'Resultado da inicialização:'),
    ('initPredictiveAnalytics не encontrado', 'initPredictiveAnalytics não encontrado'),
    ('Створюємо testeовий екземпляр do sistema...', 'A criar instância de teste do sistema...'),
    ('Testeовий екземпляр criado', 'Instância de teste criada'),
    ('Err ініціалізації:', 'Erro de inicialização:'),
    ('Testeуємо створення gráficoа...', 'A testar a criação do gráfico...'),
    ('Canvas не encontrado', 'Canvas não encontrado'),
    ('Err створення gráficoа:', 'Erro ao criar gráfico:'),
    ('Завантажуємо testeові AI recomendações...', 'A carregar recomendações de IA de teste...'),
    ('Контейнер рекомендацій não encontrado', 'O contêiner de recomendações não foi encontrado'),
    ('Чудово: Elevadores ', 'Bem: Elevadores '),
    ('працюють оптимально', 'a funcionar de forma ótima'),
    ('Симулюємо роботу оригінальної сторінки...', 'A simular o funcionamento da página original...'),
    ('Симулюємо hash:', 'A simular hash:'),
    ('Hash збігається, активуємо AI таб', 'Hash coincide, a ativar separador de IA'),
    ('Викликаємо activateAIPredictive()...', 'A chamar activateAIPredictive()...'),
    ('Resultado активації:', 'Resultado da ativação:'),
    ('Err активації:', 'Erro de ativação:'),
    ('activateAIPredictive не encontrado', 'activateAIPredictive não encontrado'),
    ('Діагностика розпоchatа автоматично...', 'Diagnóstico iniciado automaticamente...'),

    # Generic remaining
    ('Інспекцій запланов.', 'Inspeções agendadas.'),
    ('JavaScript редирект як backup', 'Redirecionamento JavaScript como backup'),
    ('Chart.js не потребує окремого CSS у версії 4.x', 'Chart.js não necessita de CSS separado na versão 4.x'),
    ('Підchaveаємо оригінальні скрипти', 'A ligar os scripts originais'),
    ('Тут будуть recomendações', 'Aqui estarão as recomendações'),
    ('Testeова зона для gráficoа', 'Zona de teste para o gráfico'),

    # Dispatcher pages
    ('Клієнт повинен знати', 'O cliente deve saber'),
    ('Офіційний лист з проханням', 'Carta oficial a solicitar'),
    ('Err парсингу', 'Erro de análise'),
    ('Instalado currentLiftId', 'Instalado currentLiftId'),
    ('Exception при завантаженні', 'Exceção ao carregar'),
    ('API повернув не масив:', 'API retornou não-array:'),
    ('Показувати по 20', 'Mostrar 20'),
    ('Перехід на сторінку:', 'A navegar para a página:'),
    ('Замінити PDF', 'Substituir PDF'),
    ('Sem relatórios. Cliqueь к', 'Sem relatórios. Clique para'),
    ('Visualização relatórioу:', 'Visualização do relatório:'),

    # Genitive endings on Portuguese words (Ukrainian grammar applied to PT words)
    ('pedidoа', 'pedido'),
    ('pedidoів', 'pedidos'),
    ('clienteа', 'cliente'),
    ('clienteів', 'clientes'),
    ('modeloа', 'modelo'),
    ('modeloів', 'modelos'),
    ('relatórioа', 'relatório'),
    ('técnicoа', 'técnico'),
    ('técnicoa', 'técnico'),
    ('qr-codeів', 'qr-codes'),
    ('таб', 'separador'),
    ('Таб', 'Separador'),

    # Specific remaining stray words
    ('варіантів', 'opções'),
    ('Cliqueь', 'Clique'),
    ('з\'єднання', 'ligação'),
    ('відкритий', 'aberto'),
    ('ще', 'ainda'),
    ('для', 'para'),
    ('щоб', 'para'),
    ('але', 'mas'),
    ('або', 'ou'),
    ('вже', 'já'),
    ('якщо', 'se'),
    ('Якщо', 'Se'),
    ('коли', 'quando'),
    ('також', 'também'),
    ('після', 'após'),
    ('через', 'por'),
    ('буде', 'será'),
    ('будуть', 'serão'),
    ('може', 'pode'),
    ('можна', 'pode-se'),
    ('Можна', 'Pode-se'),
    ('тільки', 'apenas'),
    ('навіть', 'mesmo'),
    ('добре', 'bem'),
    ('погано', 'mal'),
    ('дуже', 'muito'),
    ('тут', 'aqui'),
    ('зараз', 'agora'),

    # Status labels remaining
    ('ТО', 'Manutenção'),
    ('Інше', 'Outro'),
    ('Консультація', 'Consulta'),
    ('Фінансова', 'Financeira'),
    ('Використання', 'Utilização'),

    # Fix broken phrases from first pass
    ('não háо', 'não há'),
    ('Não háо', 'Não há'),
    ('de tarefasать', 'de tarefas'),
    ('de tarefasні', 'de tarefas'),
    ('Não foi possível змінити estado', 'Não foi possível alterar o estado'),
    ('Não foi possível guardar o utilizador', 'Não foi possível guardar o utilizador'),
]

files = sorted(glob.glob('pages/**/*.html', recursive=True))

total_replacements = 0
total_files = 0
files_with_changes = []

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f'ERROR reading {filepath}: {e}')
        continue

    original = content
    replacements = 0

    for uk, pt in TRANSLATIONS2:
        count = content.count(uk)
        if count > 0:
            content = content.replace(uk, pt)
            replacements += count

    if content != original:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            files_with_changes.append((filepath, replacements))
            total_replacements += replacements
            total_files += 1
        except Exception as e:
            print(f'ERROR writing {filepath}: {e}')

print(f'\n{"="*60}')
print(f'ПРОХІД 2: {total_files} файлів, {total_replacements} замін')
print(f'{"="*60}')
for fp, count in files_with_changes:
    print(f'  {count:4d} замін: {fp}')
