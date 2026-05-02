#!/usr/bin/env python3
# Pass 7 - monitoring, clients, schedule, inspections, tech tools/reports
import glob

FIXES7 = [
    # === кліexiste* artifact fixes (клієнт with fragment) ===
    ("кліexisteнeми", "por clientes"),
    ("кліexisteнe", "cliente"),
    ("кліexisteнтів", "de clientes"),
    ("кліexisteнті", "los clientes"),
    ("кліexisteнт", "cliente"),
    ("кліexisteнтах", "nos clientes"),

    # === Separadorлиця artifact (таблиця with таб→separador) ===
    ("Separadorлиця", "Tabela"),
    ("separadorлиця", "tabela"),

    # === поdій/поações artifacts (подій with дій→ações) ===
    ("поactions", "eventos"),
    ("поdій", "eventos"),
    ("поações", "trabalhos"),

    # === 'Техde' from 'Технічна' ===
    ("Техde manutenção", "Manutenção técnica"),
    ("Técnico огляд", "Inspeção técnica"),
    ("Técnico і", "Técnico e"),

    # === Monitoring ===
    ("у реальному horaі", "em tempo real"),
    ("Técnicoів online", "Técnicos online"),
    ("Ativos робіт", "Trabalhos ativos"),
    ("0с", "0s"),
    ("Tempo médio відгуку", "Tempo médio de resposta"),
    ("Аварійних випадків", "Ocorrências de emergência"),
    ("Disponíveisсть do sistema", "Disponibilidade do sistema"),
    ("Disponíveisсть", "Disponibilidade"),
    ("Centroувати", "Centralizar"),
    ("Теплова mapa", "Mapa de calor"),
    ("monitorizaçãoу", "monitorização"),
    ("активних", "ativos"),
    ("Очистити", "Limpar"),
    ("Трансляція", "Transmissão"),
    ("Exportar логів", "Exportar registos"),
    ("Exportar логи", "Exportar registos"),

    # === Clients ===
    ("Gestão кліexisteнeми", "Gestão de clientes"),
    ("Estado кліexisteнe", "Estado do cliente"),
    ("Tipo кліexisteнe", "Tipo de cliente"),
    ("Pesquisar кліexisteнтів", "Pesquisar clientes"),
    ("Total кліexisteнтів", "Total de clientes"),
    ("Ativos кліexisteнтів", "Clientes ativos"),
    ("Lista кліexisteнті", "Lista de clientes"),
    ("Adicionar кліexisteнe", "Adicionar cliente"),
    ("Médio рейтинг", "Avaliação média"),
    ("Картки", "Cartões"),
    ("Призупинені", "Suspensos"),
    ("Бізнес", "Empresa"),
    ("Фізичні особи", "Particulares"),
    ("Державні", "Público"),

    # === Tech reports ===
    ("Total relatórioів", "Total de relatórios"),
    ("Zgenerovano", "Gerados"),
    ("Zgenerovani", "Gerados"),
    ("Згенеровано", "Gerados"),
    ("Очікують", "Aguardam"),
    ("Todas relatórioи", "Todos os relatórios"),
    ("Щоденні", "Diários"),
    ("Щоденний relatório", "Relatório diário"),
    ("Тижневі", "Semanais"),
    ("Тижневий relatório", "Relatório semanal"),
    ("Місячні", "Mensais"),
    ("Цього do ano", "Deste ano"),
    ("Шукайте relatórioи...", "Pesquisar relatórios..."),
    ("Disponíveis relatórioи", "Relatórios disponíveis"),
    ("Підсумок роботи за semana", "Resumo de trabalho da semana"),
    ("Relatório про виконані tarefas за dia", "Relatório de tarefas concluídas no dia"),

    # === Schedule ===
    ("Calendário роботи", "Calendário de trabalho"),
    ("Na цьому тижні", "Esta semana"),
    ("Na цьому", "Nesta"),
    ("Legenda calendárioу", "Legenda do calendário"),
    ("Técde manutenção", "Manutenção técnica"),
    ("Аварійні роботи", "Trabalhos de emergência"),
    ("Calendário поações", "Calendário de trabalhos"),
    ("Lista поdій", "Lista de trabalhos"),
    ("Lista поdações", "Lista de trabalhos"),
    ("Поdação", "Trabalho"),
    ("Поdações", "Trabalhos"),
    ("Configurações calendárioу", "Configurações do calendário"),
    ("Робочий gráfico", "Horário de trabalho"),
    ("Гнучкий gráfico", "Horário flexível"),
    ("Змінний gráfico", "Horário por turnos"),
    ("Індивідуальний", "Personalizado"),
    ("За 30 minutos", "Em 30 minutos"),

    # === Inspections ===
    ("Завершені", "Concluídas"),
    ("Протерміnovaні", "Em atraso"),
    ("Технічна", "Técnica"),
    ("Технічний", "Técnico"),
    ("Технічні", "Técnicos"),
    ("Технічного", "Técnico"),
    ("Технічної", "Técnica"),
    ("Технічну", "Técnica"),
    ("Технічне", "Técnico"),
    ("Періодична", "Periódica"),
    ("Аварійна", "Emergência"),
    ("Аварійні", "De emergência"),
    ("Nova інспекція", "Nova inspeção"),
    ("Importação чек-лисe", "Importar lista de verificação"),
    ("чек-листи", "listas de verificação"),
    ("чек-лист", "lista de verificação"),
    ("чек-лис", "lista de verificação"),
    ("Estadoдартні чек-листи", "Listas de verificação padrão"),
    ("Padrão чек-лист de verificação систем de segurança", "Lista de verificação padrão dos sistemas de segurança"),
    ("Повна verificação técnico сeну", "Verificação técnica completa do estado"),
    ("Щорічна інспекція", "Inspeção anual"),
    ("para щорічної планової", "para a inspeção anual planeada"),

    # === QR batch more ===
    ("Активувати", "Ativar"),
    ("активувати", "ativar"),
    ("Деактивувати", "Desativar"),
    ("деактивувати", "desativar"),
    ("Параметр:", "Parâmetro:"),
    ("Застосувати дію", "Aplicar ação"),
    ("Застосувати", "Aplicar"),
    ("застосувати", "aplicar"),
    ("Ação será застосована до", "A ação será aplicada a"),
    ("Formato експорту:", "Formato de exportação:"),
    ("Діапазон даних:", "Intervalo de dados:"),
    ("Вибрані filtroом", "Selecionados pelo filtro"),
    ("За датою створення", "Por data de criação"),

    # === dispatcher reports remaining ===
    ("Data по:", "Data até:"),
    ("Застосувати період", "Aplicar período"),
    ("Percentagem завершення", "Percentagem de conclusão"),
    ("Відповіdiasсть SLA", "Cumprimento de SLA"),
    ("Ескалації", "Escaladas"),

    # === Common remaining ===
    ("Щоденний", "Diário"),
    ("щоденний", "diário"),
    ("Щоденна", "Diária"),
    ("щоденна", "diária"),
    ("Тижневий", "Semanal"),
    ("тижневий", "semanal"),
    ("Тижнева", "Semanal"),
    ("тижнева", "semanal"),
    ("Місячний", "Mensal"),
    ("місячний", "mensal"),
    ("Місячна", "Mensal"),
    ("місячна", "mensal"),
    ("Щорічний", "Anual"),
    ("щорічний", "anual"),
    ("Щорічна", "Anual"),
    ("щорічна", "anual"),
    ("Квартальний", "Trimestral"),
    ("квартальний", "trimestral"),
    ("Кварtal", "Trimestre"),
    ("кварtal", "trimestre"),
    ("кварeл", "trimestre"),
    ("Кварeл", "Trimestre"),
    ("Робота", "Trabalho"),
    ("робота", "trabalho"),
    ("Роботи", "Trabalhos"),
    ("роботи", "trabalhos"),
    ("Робочий", "De trabalho"),
    ("робочий", "de trabalho"),
    ("роботою", "trabalho"),
    ("роботою", "trabalho"),
    ("Перевірка", "Verificação"),
    ("перевірка", "verificação"),
    ("Перевірки", "Verificações"),
    ("перевірки", "verificações"),
    ("Перевірити", "Verificar"),
    ("перевірити", "verificar"),
    ("Перевірено", "Verificado"),
    ("перевірено", "verificado"),
    ("Інспекція", "Inspeção"),
    ("інспекція", "inspeção"),
    ("Інспекції", "Inspeções"),
    ("інспекції", "inspeções"),
    ("Інспекцій", "Inspeções"),
    ("інспекцій", "inspeções"),
    ("Огляд", "Inspeção"),
    ("огляд", "inspeção"),
    ("Оглядів", "Inspeções"),
    ("Ремонт", "Reparação"),
    ("ремонт", "reparação"),
    ("Ремонтів", "Reparações"),
    ("ремонтів", "reparações"),
    ("Ремонтний", "De reparação"),
    ("ремонтний", "de reparação"),
    ("Обслуговування", "Manutenção"),
    ("обслуговування", "manutenção"),
    ("Налагодження", "Configuração"),
    ("налагодження", "configuração"),
    ("Заміна", "Substituição"),
    ("заміна", "substituição"),
    ("Заміни", "Substituições"),
    ("заміни", "substituições"),
    ("Діагностика", "Diagnóstico"),
    ("діагностика", "diagnóstico"),
    ("Несправність", "Avaria"),
    ("несправність", "avaria"),
    ("Несправності", "Avarias"),
    ("несправності", "avarias"),
    ("Аварія", "Emergência"),
    ("аварія", "emergência"),
    ("Аварії", "Emergências"),
    ("аварії", "emergências"),
    ("Аварійна", "De emergência"),
    ("аварійна", "de emergência"),
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

    for uk, pt in FIXES7:
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
print(f"PASS 7: {total_files} files changed, {total_replacements} replacements")
print(f"{'='*60}")
for fp, count in files_with_changes:
    print(f"  {count:4d}  {fp}")
