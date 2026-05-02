#!/usr/bin/env python3
# Pass 5 - QR pages, profile, support, remaining
import glob

FIXES5 = [
    # === QR-code text normalization ===
    ("QR-кодів", "de QR-codes"),
    ("QR-коду", "do QR-code"),
    ("QR-код", "QR-code"),
    ("QR кодів", "de QR-codes"),
    ("QR коду", "do QR-code"),
    ("QR код", "QR-code"),

    # === Broken 'Останні' artifact (та→e) ===
    ("Осeнні", "Recentes"),

    # === Broken artifact patterns ===
    ("Переendereçoція", "Redirecionamento"),
    ("separadorлиці", "da tabela"),
    ("Вигляд separadorлиці", "Vista de tabela"),
    ("Вигляд сітки", "Vista de grelha"),
    ("Беdesde групи", "Sem grupo"),
    ("череdesde", "através de"),
    ("череdes", "através de"),
    ("Споchatку оберіть tipo", "Selecione primeiro o tipo"),
    ("Споchatку", "Em primeiro lugar"),
    ("Чекаexiste", "À espera de"),
    ("поверeexiste", "devolve"),
    ("Пиeння de segurança", "Questão de segurança"),
    ("Usunення неcorretamenteстей", "Resolução de problemas"),
    ("Усунення неcorretamenteстей", "Resolução de problemas"),
    ("Покраaindaння rapidamenteсті", "Melhoria de desempenho"),
    ("Поantes deньо налаштовані", "Pré-configurados"),
    ("Exportarувати", "Exportar"),
    ("Exportarовано", "Exportados"),
    ("Modeloи", "Modelos"),
    ("Serediasй", "Médio"),
    ("Сереdiasй", "Médio"),
    ("Horaовий пояс", "Fuso horário"),
    ("horaовий пояс", "fuso horário"),
    ("Приоритет:", "Prioridade:"),
    ("Синхронізаціexisteю", "sincronização"),
    ("синхронізаціexisteю", "sincronização"),
    ("синхронізуються entre", "sincronizam entre"),
    ("Проблема desde синхронізації", "Problema de sincronização"),
    ("Autoматично", "Automático"),

    # === Analytics page ===
    ("Період аналітики:", "Período de análise:"),
    ("аналітики", "análise"),
    ("Власний період", "Período personalizado"),
    ("По do diaх", "Por dia"),
    ("По da semanaх", "Por semana"),
    ("По do mêsх", "Por mês"),
    ("Групування:", "Agrupamento:"),
    ("Групування", "Agrupamento"),
    ("Щоденна активність", "Atividade diária"),
    ("Унікальних de utilizadores", "Utilizadores únicos"),
    ("Локацій", "Localizações"),
    ("Tipoів пристроїв", "Tipos de dispositivos"),
    ("Пристрої", "Dispositivos"),
    ("пристроїв", "dispositivos"),
    ("пристроями", "dispositivos"),
    ("пристрою", "dispositivo"),
    ("Для локацій", "Para localizações"),
    ("Gráfico leituras по do diaх", "Gráfico de leituras por dia"),
    ("Top dias за leituraми", "Dias com mais leituras"),

    # === QR Batch ===
    ("Масове створення", "Criação em massa"),
    ("Exportar QR-кодів", "Exportar QR-codes"),
    ("A carregar dados у різних формаeх", "A carregar dados em vários formatos"),
    ("Группові ações", "Ações em grupo"),
    ("Масове atualização estadoів", "Atualização em massa de estados"),
    ("Керувати", "Gerir"),
    ("Переглянути логи", "Ver registos"),
    ("Переглянути", "Visualizar"),
    ("Перетягніть ficheiro сюди ou", "Arraste o ficheiro aqui ou"),
    ("Suportados формати: CSV, XLSX", "Formatos suportados: CSV, XLSX"),
    ("Обрати ficheiro", "Selecionar ficheiro"),
    ("Verificação даних", "Verificação de dados"),
    ("Tipo QR-кодів за замовчуванням", "Tipo de QR-code predefinido"),
    ("за замовчуванням", "predefinido"),
    ("Pendente активації", "Pendente de ativação"),
    ("Adicionar до групи", "Adicionar ao grupo"),
    ("Переregistoати існуючі", "Sobrescrever existentes"),
    ("Concluído до імпорту", "Pronto para importar"),
    ("para імпорту", "para importar"),
    ("на запуск...", "para iniciar..."),
    ("Імпорт", "Importação"),

    # === QR Management ===
    ("Працюючих de elevadores", "Elevadores em funcionamento"),
    ("Зупинені", "Parados"),
    ("Filtro по місту...", "Filtrar por cidade..."),
    ("Imprimir вибрані", "Imprimir selecionados"),
    ("Imprimir всі", "Imprimir todos"),
    ("Lista QR-кодів", "Lista de QR-codes"),
    ("Режим visualizaçãoу", "Modo de visualização"),
    ("Кількість колонок", "Quantidade de colunas"),
    ("Quantidade колонок", "Quantidade de colunas"),
    ("кол.", "col."),
    ("вибрано", "selecionados"),
    ("Eliminar вибрані", "Eliminar selecionados"),
    ("Exportarувати", "Exportar"),
    ("Вибрати всі", "Selecionar todos"),
    ("ID коду", "ID do código"),
    ("Сканувань", "Leituras"),
    ("Criado QR код", "QR-code criado"),
    ("Criado QR-code", "QR-code criado"),
    ("Створення novo QR-коду", "Criar novo QR-code"),

    # === Profile page ===
    ("15 січня 2023", "15 de janeiro de 2023"),
    ("Добрий - всі do sistema protegidos", "Bom - todos os sistemas protegidos"),
    ("заgarante додатковий рівень de segurança para вашого облікового registo",
     "garante um nível adicional de segurança para o seu registo"),
    ("Chrome на Windows", "Chrome no Windows"),
    ("Safari на iPhone", "Safari no iPhone"),
    ("Будинок №15, кв. 23", "Edifício nº15, apto. 23"),
    ("Системна informação", "Informação do sistema"),
    ("База даних", "Base de dados"),
    ("Utilização диска", "Utilização de disco"),
    ("Оперативна пам\'ять", "Memória RAM"),
    ("Оперативна пам'ять", "Memória RAM"),
    ("Швидкі ações administradorістратора", "Ações rápidas de administrador"),
    ("Резервне копіювання", "Cópia de segurança"),
    ("Осeнні резервні копії", "Cópias de segurança recentes"),
    ("Gráfico активності", "Gráfico de atividade"),
    ("Осeнні ações", "Ações recentes"),
    ("щомісячний relatório", "relatório mensal"),
    ("Configurações інтерфейсу", "Configurações de interface"),
    ("Світла", "Clara"),
    ("Темна", "Escura"),
    ("Українська", "Ucraniano"),
    ("Виведені desde do sistema", "Removido do sistema"),
    ("виведені desde do sistema", "removido do sistema"),
    ("Será виведені", "Será removido"),

    # === Support page ===
    ("Відповідь протягом 2 horas", "Resposta em 2 horas"),
    ("Telefone гарячої лінії", "Linha de apoio telefónico"),
    ("Цілодобово para критичних випадків", "24h para casos críticos"),
    ("Acessoний в робочі horasи", "Disponível em horário laboral"),
    ("Діагностика do sistema", "Diagnóstico do sistema"),
    ("Створити резервну копію", "Criar cópia de segurança"),
    ("Assunto pedidoу *", "Assunto do pedido *"),
    ("Assunto pedidoу", "Assunto do pedido"),
    ("Pedido на функцію", "Pedido de funcionalidade"),
    ("Relatório про помилку", "Relatório de erro"),
    ("Проблема продуктивності", "Problema de desempenho"),
    ("Do sistema логи (опціонально)", "Registos do sistema (opcional)"),
    ("Do sistema логи", "Registos do sistema"),
    ("Dados QR-кодів не синхронізуються entre пристроями",
     "Dados dos QR-codes não sincronizam entre dispositivos"),
    ("23 вересня 2025", "23 de setembro de 2025"),
    ("Вирішено", "Resolvido"),
    ("Usunення неcorretamenteстей", "Resolução de problemas"),
    ("Поширені проблеми e їх вирішення", "Problemas comuns e as suas soluções"),
    ("Оптимізація продуктивності", "Otimização de desempenho"),

    # === Predictive maintenance remaining ===
    ("IA Прогнози на seguinte período", "Previsões de IA para o próximo período"),
    ("Confirmar всі", "Confirmar todos"),
    ("Críticos alertas", "Alertas críticos"),
    ("Критичні alertas", "Alertas críticos"),
    ("Сeтистика de alertas", "Estatísticas de alertas"),
    ("Оптимізований gráfico Manutenção", "Gráfico otimizado de manutenção"),
    ("Оптимізований gráfico", "Gráfico otimizado"),
    ("Алерт confirmado", "Alerta confirmado"),
    ("${age}р", "${age}a"),
    ("Рек.", "Rec."),
    ("Приоритет:", "Prioridade:"),
    ("Приоритет", "Prioridade"),

    # === General remaining ===
    ("аналітики", "análise"),
    ("аналітика", "análise"),
    ("Аналітики", "Análise"),
    ("Аналітика", "Análise"),
    ("Пристрій", "Dispositivo"),
    ("пристрій", "dispositivo"),
    ("кодів", "códigos"),
    ("коду", "código"),
    ("скануванн", "leitura"),
    ("Скануванн", "Leitura"),
    ("Імпорт ", "Importação "),
    ("імпорт ", "importação "),
    ("Локація", "Localização"),
    ("локація", "localização"),
    ("локацій", "localizações"),
    ("Локацій", "Localizações"),
    ("формат", "formato"),
    ("Формат", "Formato"),
    ("Групи", "Grupos"),
    ("групи", "grupos"),
    ("групу", "grupo"),
    ("Групу", "Grupo"),
    ("Налаштovan", "Configurado"),
    ("налаштован", "configurado"),
    ("Вибрати", "Selecionar"),
    ("вибрати", "selecionar"),
    ("оберіть", "selecione"),
    ("Оберіть", "Selecione"),
    ("зберегти", "guardar"),
    ("Зберегти", "Guardar"),
    ("зберігати", "guardar"),
    ("зберігається", "é guardado"),
    ("збережено", "guardado"),
    ("не синхронізуються", "não sincronizam"),
    ("синхронізація", "sincronização"),
    ("Синхронізація", "Sincronização"),
    ("продуктивності", "desempenho"),
    ("продуктивність", "desempenho"),
    ("Продуктивності", "Desempenho"),
    ("Продуктивність", "Desempenho"),
    ("Шаблоны", "Modelos"),
    ("шаблоны", "modelos"),
    ("шаблон", "modelo"),
    ("Шаблон", "Modelo"),
    ("шаблони", "modelos"),
    ("Шаблони", "Modelos"),
]

files = sorted(glob.glob("pages/**/*.html", recursive=True))
total_replacements = 0
total_files = 0
files_with_changes = []

for filepath in files:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"ERROR reading {filepath}: {e}")
        continue

    original = content
    replacements = 0

    for uk, pt in FIXES5:
        count = content.count(uk)
        if count > 0:
            content = content.replace(uk, pt)
            replacements += count

    if content != original:
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            files_with_changes.append((filepath, replacements))
            total_replacements += replacements
            total_files += 1
        except Exception as e:
            print(f"ERROR writing {filepath}: {e}")

print(f"\n{'='*60}")
print(f"PASS 5: {total_files} files changed, {total_replacements} replacements")
print(f"{'='*60}")
for fp, count in files_with_changes:
    print(f"  {count:4d}  {fp}")
