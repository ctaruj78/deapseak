#!/usr/bin/env python3
# Pass 8 - tools/qr/ai/support/analytics/kb/settings remaining
import glob

FIXES8 = [
    # === Common artifact patterns ===
    ("diasв", "dias"),
    ("horasам", "horas"),
    ("tipoах", "tipos"),
    ("tipoах", "tipos"),
    ("сeтті", "artigos"),
    ("сeтей", "de artigos"),
    ("осeнні", "recentes"),
    ("Осeнні", "Recentes"),
    ("Осeнній", "Recente"),
    ("Осeньої", "Recente"),
    ("Осeнньої", "Recente"),
    ("зберігаexiste", "guarda"),
    ("маexiste", "tem"),
    ("маexistent", "tem"),
    ("зmasжн", "dependendo"),
    ("configuraçõesми", "configurações"),
    ("configuraçõesм", "configurações"),
    ("усeновки", "de instalação"),
    ("усeновка", "instalação"),
    ("Сьогоdias", "Hoje"),
    ("сьогоdias", "hoje"),

    # === Tools page ===
    ("Autoмобіль", "Automóvel"),
    ("Склад", "Armazém"),
    ("На instalaçãoі", "Em instalação"),
    ("Видати", "Entregar"),
    ("Повернути", "Devolver"),
    ("Осeння verificação", "Última verificação"),
    ("Потребують поповнення", "Necessitam de reposição"),
    ("Todas ferramentas в наявності", "Todas as ferramentas disponíveis"),
    ("Не вistados ferramentas", "Nenhuma ferramenta encontrada"),
    ("Rua, будинок", "Rua, número"),
    ("Наприклад:", "Ex.:"),
    ("наприклад,", "por exemplo,"),
    ("Наприклад,", "Por exemplo,"),

    # === QR management remaining ===
    ("Створення novo do QR-code", "Criar novo QR-code"),
    ("Endereço усeновки", "Endereço de instalação"),
    ("Selecione конкретне atribuição зmasжно від tipoу", "Selecione o atribuição específico dependendo do tipo"),
    ("Pisoи", "Pisos"),
    ("Piso", "Piso"),

    # === AI assistant ===
    ("Говорити", "Falar"),
    ("Прослухати", "Ouvir"),
    ("Підтримуються apenas PDF ficheiroи (максимум 10 MB)", "Apenas ficheiros PDF são suportados (máximo 10 MB)"),
    ("АБО", "OU"),
    ("Всeвте текст relatório inspeções вручну", "Insira o texto do relatório de inspeção manualmente"),
    ("Análiseувати relatório", "Analisar relatório"),
    ("Resultadoи análise", "Resultados da análise"),
    ("Голосовий супровід indisponível!", "Acompanhamento de voz indisponível!"),
    ("бразильську португальську", "o português do Brasil"),
    ("В системі encontrado apenas бразильську португальську (pt-BR).", "O sistema encontrou apenas português do Brasil (pt-BR)."),

    # === Dispatcher support ===
    ("Disponível у робочі horasи", "Disponível em horário laboral"),
    ("Проблема desde elevadorом", "Problema com o elevador"),
    ("Мої осeнні pedidoи", "Os meus pedidos recentes"),
    ("Erro при призначенні технічника", "Erro ao atribuir técnico"),
    ("зберігаexiste atribuição se технік já маexiste 3 ativos tarefas", "guarda a atribuição se o técnico já tem 3 tarefas ativas"),
    ("Pedido на нову функцію filtroації", "Pedido de nova funcionalidade de filtragem"),
    ("filtro по районах місe у da lista de elevadores", "filtro por zona da cidade na lista de elevadores"),
    ("Мої осeнні", "Os meus recentes"),
    ("осeнні pedidoи", "pedidos recentes"),

    # === QR analytics ===
    ("Recentes 90 diasв", "Recentes 90 dias"),
    ("Recentes 365 diasв", "Recentes 365 dias"),
    ("Свій період", "Período personalizado"),
    ("По tipoах", "Por tipo"),
    ("Mapa de calor активності", "Mapa de calor de atividade"),
    ("leituras по do diaх da semana e horasам", "de leituras por dia da semana e hora"),
    ("Розподіл по tipoах", "Distribuição por tipo"),
    ("Estatísticas по tipoах", "Estatísticas por tipo"),
    ("активності leituras", "leituras de atividade"),

    # === Knowledge base ===
    ("Pesquisar у базі знань", "Pesquisar na base de conhecimento"),
    ("базі знань", "na base de conhecimento"),
    ("Шукайте рішення, інструкції", "Pesquisar soluções, instruções"),
    ("Todas сeтті", "Todas as categorias"),
    ("Обрані", "Favoritos"),
    ("Інструкції desde reparaçãoу", "Instruções de reparação"),
    ("24 сeтті", "24 artigos"),
    ("18 сeтей", "18 artigos"),
    ("профілактика", "manutenção preventiva"),
    ("Перегляд відeos відео", "Ver vídeos"),
    ("відео", "vídeo"),
    ("Відео", "Vídeo"),

    # === Settings page ===
    ("Configurações профілю", "Configurações do perfil"),
    ("Gestão вашим особистим профілем e configuraçõesми", "Gerir o seu perfil pessoal e configurações"),
    ("Gestão паролями e configuraçõesми de segurança", "Gerir palavras-passe e configurações de segurança"),
    ("Confirmação пароля", "Confirmação da palavra-passe"),
    ("Двофакторна автентифікація", "Autenticação de dois fatores"),
    ("двофакторна автентифікація", "autenticação de dois fatores"),
    ("Notificações по email", "Notificações por email"),
    ("Configurações de notificações e повідомлень", "Configurações de notificações e mensagens"),
    ("Gestão вашими сповіщеннями", "Gerir as suas notificações"),

    # === More common patterns ===
    ("активності", "de atividade"),
    ("активность", "atividade"),
    ("активністю", "na atividade"),
    ("особистим", "pessoal"),
    ("особистий", "pessoal"),
    ("особисту", "pessoal"),
    ("особисте", "pessoal"),
    ("паролями", "palavras-passe"),
    ("паролем", "palavra-passe"),
    ("паролю", "palavra-passe"),
    ("пароля", "palavra-passe"),
    ("пароль", "palavra-passe"),
    ("особистим профілем", "perfil pessoal"),
    ("профілем", "perfil"),
    ("профілю", "perfil"),
    ("профіль", "perfil"),
    ("профілів", "perfis"),
    ("Налаштування", "Configurações"),
    ("налаштування", "configurações"),
    ("Налаштував", "Configurou"),
    ("налаштував", "configurou"),
    ("Корист", "Utiliz"),
    ("корист", "utiliz"),
    ("Нотатки", "Notas"),
    ("нотатки", "notas"),
    ("Шукайте", "Pesquisar"),
    ("шукайте", "pesquisar"),
    ("Зміст", "Conteúdo"),
    ("зміст", "conteúdo"),
    ("у базі", "na base"),
    ("бази", "base"),
    ("База", "Base"),
    ("база", "base"),
    ("Вантаж", "Carga"),
    ("вантаж", "carga"),
    ("Вантажно", "Capacidade de carga"),
    ("кабіна", "cabine"),
    ("Кабіна", "Cabine"),
    ("Кабіни", "Cabines"),
    ("кабіни", "cabines"),
    ("Кабіну", "Cabine"),
    ("кабіну", "cabine"),
    ("двери", "portas"),
    ("двері", "portas"),
    ("двері", "portas"),
    ("дверей", "portas"),
    ("Двері", "Portas"),
    ("Привід", "Acionamento"),
    ("привід", "acionamento"),
    ("Шахта", "Poço"),
    ("шахта", "poço"),
    ("Шахти", "Poços"),
    ("шахти", "poços"),
    ("Шина", "Guia"),
    ("шина", "guia"),
    ("Трос", "Cabo"),
    ("трос", "cabo"),
    ("Мотор", "Motor"),
    ("мотор", "motor"),
    ("Лебідка", "Guincho"),
    ("лебідка", "guincho"),
    ("Буфер", "Para-choques"),
    ("буфер", "para-choques"),
    ("Обмежувач", "Limitador"),
    ("обмежувач", "limitador"),
    ("Противаги", "Contrapesos"),
    ("противаги", "contrapesos"),
    ("Рейки", "Guias"),
    ("рейки", "guias"),
    ("Гудzip", "Buzina"),
    ("дзвінок", "campainha"),
    ("Дзвінок", "Campainha"),
    ("Вентилятор", "Ventilador"),
    ("вентилятор", "ventilador"),
    ("Освітлення", "Iluminação"),
    ("освітлення", "iluminação"),
    ("Мастило", "Lubrificante"),
    ("мастило", "lubrificante"),
    ("Напрuга", "Tensão"),
    ("напруга", "tensão"),
    ("Ємність", "Capacidade"),
    ("ємність", "capacidade"),
    ("Навантаження", "Carga"),
    ("навантаження", "carga"),
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

    for uk, pt in FIXES8:
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
print(f"PASS 8: {total_files} files changed, {total_replacements} replacements")
print(f"{'='*60}")
for fp, count in files_with_changes:
    print(f"  {count:4d}  {fp}")
