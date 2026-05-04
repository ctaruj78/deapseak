#!/usr/bin/env python3
"""
Translate all remaining Ukrainian UI strings to Portuguese across the entire project.
Run once: python3 translate-to-portuguese.py
"""

import os
import re

# ============================================================
# TRANSLATION DICTIONARY  (Ukrainian → Portuguese)
# Ordered from longest/most-specific to shortest to avoid
# partial replacements.
# ============================================================
TRANSLATIONS = [
    # ── Lift status labels ──────────────────────────────────
    ("Аварійний стан", "Estado de emergência"),
    ("Аварійний", "Emergência"),
    ("Обслуговування", "Manutenção"),
    ("Неактивний", "Inativo"),
    ("Активний", "Ativo"),
    ("Ремонт", "Reparação"),

    # ── Lift type labels ────────────────────────────────────
    ("Пасажирський", "Passageiro"),
    ("Пасажиромісткість", "Capacidade"),
    ("Вантажний", "Carga"),
    ("Лікарняний", "Hospitalar"),
    ("Панорамний", "Panorâmico"),
    ("Безмашинний", "Sem casa de máquinas"),
    ("Службовий", "Serviço"),
    ("Інший", "Outro"),

    # ── Common UI words ─────────────────────────────────────
    ("Не вказано", "Não especificado"),
    ("Деталі", "Detalhes"),
    ("Редагувати", "Editar"),
    ("Видалити", "Eliminar"),
    ("Переглянути деталі", "Ver detalhes"),
    ("Переглянути", "Ver"),
    ("Зберегти", "Guardar"),
    ("Скасувати", "Cancelar"),
    ("Закрити", "Fechar"),
    ("Додати", "Adicionar"),
    ("Пошук", "Pesquisa"),
    ("Фільтр", "Filtro"),
    ("Завантажити", "Descarregar"),
    ("Завантаження", "A carregar"),
    ("Оновити", "Atualizar"),
    ("Підтвердити", "Confirmar"),
    ("Так", "Sim"),
    ("Ні", "Não"),
    ("Усі", "Todos"),
    ("Всі", "Todos"),
    ("Експорт", "Exportar"),
    ("Імпорт", "Importar"),
    ("Звіт", "Relatório"),
    ("Звіти", "Relatórios"),
    ("Статус", "Estado"),
    ("Тип", "Tipo"),
    ("Адреса", "Endereço"),
    ("Бренд", "Marca"),
    ("Модель", "Modelo"),
    ("Клієнт", "Cliente"),
    ("Швидкість", "Velocidade"),
    ("Широта", "Latitude"),
    ("Довгота", "Longitude"),

    # ── Field names ─────────────────────────────────────────
    ("Муніципальний номер", "Número municipal"),
    ("Серійний номер", "Número de série"),
    ("Тип ліфта", "Tipo de elevador"),
    ("Поштовий код", "Código postal"),
    ("Ім'я клієнта", "Nome do cliente"),
    ("Email клієнта", "Email do cliente"),
    ("Телефон клієнта", "Telefone do cliente"),
    ("Призначений технік", "Técnico atribuído"),
    ("Останнє ТО", "Última manutenção"),
    ("Наступне ТО", "Próxima manutenção"),
    ("Частота ТО (міс.)", "Frequência de manutenção (meses)"),

    # ── Validation messages ─────────────────────────────────
    ("є обов'язковим", "é obrigatório"),
    ("Некоректний формат email клієнта", "Formato de email inválido"),
    ("Некоректний формат телефону", "Formato de telefone inválido"),
    ("Некоректний формат поштового коду", "Formato de código postal inválido"),
    ("Некоректне значення широти (-90 до 90)", "Valor de latitude inválido (-90 a 90)"),
    ("Некоректне значення довготи (-180 до 180)", "Valor de longitude inválido (-180 a 180)"),
    ("Швидкість повинна бути від 0.1 до 10 м/с", "A velocidade deve estar entre 0.1 e 10 m/s"),
    ("Заповніть всі обов'язкові поля", "Preencha todos os campos obrigatórios"),
    ("Заповніть обов'язкові поля", "Preencha os campos obrigatórios"),
    ("Обов'язкове поле", "Campo obrigatório"),

    # ── QR manager strings ──────────────────────────────────
    ("● Активний", "● Ativo"),
    ("○ Неактивний", "○ Inativo"),
    ("QR-код успішно згенеровано!", "QR code gerado com sucesso!"),
    ("Заповніть форму для створення QR-коду", "Preencha o formulário para criar o QR code"),

    # ── Lift actions / buttons ──────────────────────────────
    ("Додати ліфт", "Adicionar elevador"),
    ("Ліфт видалено", "Elevador eliminado"),
    ("Ліфт успішно додано", "Elevador adicionado com sucesso"),
    ("Генерація QR кодів", "Gerar QR codes"),
    ("Переходимо до генератора QR кодів...", "A abrir o gerador de QR codes..."),
    ("Ви впевнені, що хочете видалити цей ліфт?", "Tem a certeza que pretende eliminar este elevador?"),
    ("Видалити ліфт", "Eliminar elevador"),
    ("Редагування ліфта", "Editar elevador"),
    ("Форма додавання нового ліфта", "Formulário para adicionar novo elevador"),
    ("Дані ліфтів завантажено успішно", "Dados dos elevadores carregados com sucesso"),
    ("Дані експортовано успішно!", "Dados exportados com sucesso!"),
    ("Підготовка файлу для завантаження...", "A preparar ficheiro para descarregar..."),
    ("Всі ліфти в нормальному стані", "Todos os elevadores em estado normal"),
    ("Потрібне ТО", "Manutenção necessária"),
    ("На ТО", "Em manutenção"),
    ("ТО завершено", "Manutenção concluída"),
    ("Аварійний виклик", "Chamada de emergência"),
    ("Новий ліфт додано", "Novo elevador adicionado"),
    ("Функція редагування в розробці", "Função de edição em desenvolvimento"),
    ("Місткість:", "Capacidade:"),
    ("осіб", "pessoas"),

    # ── Map / geolocation ───────────────────────────────────
    ("Розташування ліфта", "Localização do elevador"),
    ("Геолокація не підтримується вашим браузером", "Geolocalização não suportada pelo seu browser"),
    ("Отримання...", "A obter..."),
    ("Координати успішно отримані!", "Coordenadas obtidas com sucesso!"),
    ("Не вдалось отримати координати: ", "Não foi possível obter coordenadas: "),
    ("Введіть адресу для пошуку координат", "Introduza um endereço para pesquisar coordenadas"),
    ("Адресу не знайдено. Уточніть назву вулиці та поштовий код.", "Endereço não encontrado. Verifique o nome da rua e o código postal."),
    ("Координати визначено:", "Coordenadas definidas:"),
    ("Координати встановлено:", "Coordenadas estabelecidas:"),
    ("Знайдено кілька адрес — оберіть правильну", "Encontrados vários endereços — seleccione o correto"),
    ("Помилка геокодування. Перевірте з'єднання.", "Erro de geocodificação. Verifique a ligação."),
    ("Карта оновлена", "Mapa atualizado"),
    ("Карта відцентрована", "Mapa centrado"),
    ("Фільтри застосовано", "Filtros aplicados"),
    ("Фільтри очищено", "Filtros limpos"),
    ("Оптимізація маршрутів...", "A otimizar rotas..."),
    ("Маршрути оптимізовано", "Rotas otimizadas"),

    # ── User management ─────────────────────────────────────
    ("Додати користувача", "Adicionar utilizador"),
    ("Редагувати користувача", "Editar utilizador"),
    ("Перегляд деталей користувача:", "Ver detalhes do utilizador:"),
    ("Змінити статус користувача?", "Alterar estado do utilizador?"),
    ("Статус змінено для користувача:", "Estado alterado para o utilizador:"),
    ("Користувач збережений", "Utilizador guardado"),
    ("Заповніть всі обов'язкові поля", "Preencha todos os campos obrigatórios"),
    ("Експорт списку користувачів", "Exportar lista de utilizadores"),

    # ── Technician management ───────────────────────────────
    ("Додавання нового техніка", "Adicionar novo técnico"),
    ("Призначення завдання техніку:", "Atribuir tarefa ao técnico:"),
    ("Перегляд деталей техніка:", "Ver detalhes do técnico:"),
    ("Дзвінок техніку:", "Ligar ao técnico:"),
    ("Редагування даних техніка:", "Editar dados do técnico:"),
    ("Масове сповіщення техніків", "Notificação em massa para técnicos"),
    ("Генерація робочого розкладу", "Gerar horário de trabalho"),
    ("Звіт про продуктивність техніків", "Relatório de desempenho dos técnicos"),
    ("Планування навчання для техніків", "Planear formação para técnicos"),
    ("На завданні", "Em tarefa"),
    ("В дорозі", "A caminho"),

    # ── Task / assignment management ────────────────────────
    ("Створення нового завдання", "Criar nova tarefa"),
    ("Редагування завдання:", "Editar tarefa:"),
    ("Перегляд деталей завдання:", "Ver detalhes da tarefa:"),
    ("Призначення техніка", "Atribuir técnico"),
    ("Призначення завдання техніку:", "Atribuir tarefa ao técnico:"),
    ("Зв'язок з технікою по завданню:", "Contactar técnico da tarefa:"),
    ("Зв'язок з технікою:", "Contactar técnico:"),
    ("Завдання автоматично розподілені", "Tarefas distribuídas automaticamente"),
    ("Автоматичний розподіл завдань...", "Distribuição automática de tarefas..."),
    ("Завдання призначено техніку", "Tarefa atribuída ao técnico"),
    ("Позначити завдання як завершене?", "Marcar tarefa como concluída?"),
    ("завершено", "concluída"),
    ("ЗАВЕРШЕНО", "CONCLUÍDO"),
    ("Прогрес: 100%", "Progresso: 100%"),
    ("Аварійний виклик відправлено! Диспетчер буде повідомлений.", "Chamada de emergência enviada! O dispatcher será notificado."),
    ("Перепризначення техніка:", "Reatribuir técnico:"),
    ("Масове призначення завдань", "Atribuição em massa de tarefas"),
    ("Генерація розкладу на день", "Gerar agenda do dia"),
    ("Планування технічного обслуговування", "Planear manutenção técnica"),
    ("Створення аварійного виклику", "Criar chamada de emergência"),

    # ── Analytics / reports ─────────────────────────────────
    ("Пн", "Seg"),
    ("Вт", "Ter"),
    ("Ср", "Qua"),
    ("Чт", "Qui"),
    ("Пт", "Sex"),
    ("Сб", "Sáb"),
    ("Нд", "Dom"),
    ("Пасажирські", "Passageiro"),
    ("Вантажні", "Carga"),
    ("Лікарняні", "Hospitalar"),
    ("Службові", "Serviço"),
    ("Виконані завдання", "Tarefas concluídas"),
    ("Аварійні виклики", "Chamadas de emergência"),
    ("Планове ТО", "Manutenção planeada"),
    ("Аварійний ремонт", "Reparação de emergência"),
    ("Діагностика", "Diagnóstico"),
    ("Встановлення QR", "Instalação QR"),
    ("Кількість ТО", "Quantidade de manutenções"),
    ("Дані аналітики оновлено", "Dados de análise atualizados"),
    ("Аналітика", "Análise"),
    ("Оновлення аналітики за", "Atualização de análise para"),
    ("днів...", "dias..."),
    ("Підготовка звіту для експорту...", "A preparar relatório para exportar..."),
    ("Звіт успішно експортовано!", "Relatório exportado com sucesso!"),
    ("Експорт звіту в форматі", "Exportar relatório no formato"),
    ("розпочато...", "iniciado..."),
    ("Створення звіту за період", "A criar relatório para o período"),
    ("Генерація звіту", "A gerar relatório"),
    ("Користувацький звіт готовий до завантаження!", "Relatório personalizado pronto para descarregar!"),
    ("Налаштування звітів збережено!", "Definições de relatórios guardadas!"),
    ("Оновлення даних за обраний період...", "A atualizar dados para o período selecionado..."),
    ("Успіх", "Sucesso"),

    # ── Client-related ──────────────────────────────────────
    ("Клієнта знайдено:", "Cliente encontrado:"),
    ("Невказано", "Não especificado"),
    ("Помилка обробки форми:", "Erro ao processar formulário:"),
    ("Заповніть муніципальний номер для ліфта", "Preencha o número municipal do elevador"),
    ("це обов'язкове поле", "é um campo obrigatório"),

    # ── Settings ────────────────────────────────────────────
    ("Загальні налаштування збережено", "Definições gerais guardadas"),
    ("Скинути всі загальні налаштування до значень за замовчуванням?", "Repor todas as definições gerais para os valores predefinidos?"),
    ("Налаштування збережено", "Definições guardadas"),
    ("Налаштування", "Definições"),

    # ── Generic errors / success ────────────────────────────
    ("успішно", "com sucesso"),
    ("Помилка", "Erro"),
    ("Увага", "Atenção"),
    ("Попередження", "Aviso"),

    # ── Months ──────────────────────────────────────────────
    ("Січень", "Janeiro"),
    ("Лютий", "Fevereiro"),
    ("Березень", "Março"),
    ("Квітень", "Abril"),
    ("Травень", "Maio"),
    ("Червень", "Junho"),
    ("Липень", "Julho"),
    ("Серпень", "Agosto"),
    ("Вересень", "Setembro"),
    ("Жовтень", "Outubro"),
    ("Листопад", "Novembro"),
    ("Грудень", "Dezembro"),
    ("Січ", "Jan"),
    ("Лют", "Fev"),
    ("Бер", "Mar"),
    ("Квіт", "Abr"),
    ("Тра", "Mai"),
    ("Чер", "Jun"),
    ("Лип", "Jul"),
    ("Сер", "Ago"),
    ("Вер", "Set"),
    ("Жов", "Out"),
    ("Лис", "Nov"),
    ("Гру", "Dez"),

    # ── Predictive maintenance ───────────────────────────────
    ("відмов очікується", "falhas esperadas"),
    ("Двигун", "Motor"),
    ("Гальма", "Travões"),
    ("Прогноз витрат", "Previsão de custos"),
    ("Фактичні витрати", "Custos reais"),
    ("Фактичні gastos", "Custos reais"),
    ("Низький ризик", "Baixo risco"),
    ("Середній ризик", "Risco médio"),
    ("Високий ризик", "Alto risco"),
    ("знос", "desgaste"),
    ("Перевищення допустимої вібрації двигуна", "Vibração do motor acima do limite"),
    ("Перевищення", "Excesso"),
    ("вібрації", "de vibração"),

    # ── Support ──────────────────────────────────────────────
    ("Ваш номер pedido:", "O seu número de pedido:"),
    ("Aguarde resposta на вашу endereço email.", "Aguarde resposta no seu email."),
    ("Criar pedido до技術ої підтримки", "Criar pedido de suporte técnico"),
    ("Criar pedido до tecnicamenteї підтримки", "Criar pedido de suporte técnico"),

    # ── Assignments ─────────────────────────────────────────
    ("хоча б одну o pedido", "pelo menos um pedido"),
    ("Iniciar роботу над ціexisteю заявкою?", "Iniciar trabalho neste pedido?"),
    ("Concluir цю o pedido?", "Concluir este pedido?"),
    ("Atribuído диспетчером", "Atribuído pelo dispatcher"),
    ("Concluído диспетчером", "Concluído pelo dispatcher"),
    ("Дедлайн продовжено!", "Prazo prolongado!"),
    ("Nova data:", "Nova data:"),
    ("Переatribuição pedidos", "Reatribuição de pedidos"),
    ("Переatribuído e продовжено дедлайн:", "Reatribuído e prazo prolongado:"),
    ("продовжено дедлайн:", "prazo prolongado:"),
    ("Дати Manutenção atualizado автоматично.", "Datas de Manutenção atualizadas automaticamente."),

    # ── Inspections ──────────────────────────────────────────
    ("Периодична verificação", "Verificação periódica"),
    ("Registoів не encontrado", "Nenhum registo encontrado"),
    ("Registoи від", "Registos de"),
    ("Інша", "Outro"),

    # ── Mixed half-translated strings ────────────────────────
    ("Planove manutenção técnica", "Manutenção técnica planeada"),
    ("відмов очікується", "falhas esperadas"),
    ("застосовано до", "aplicado a"),
    ("neste endereço", "neste endereço"),

    # ── Predictive maintenance (half-translated leftovers) ───
    ("відмов очікуexisteться", "falhas esperadas"),
    ("відмов очікується", "falhas esperadas"),
    ("очікується", "esperadas"),
    ("капreparaçãoів", "reparações maiores"),
    ("Прогноdesde витрат", "Previsão de custos"),
    ("Baixo ризик", "Baixo risco"),
    ("Médio ризик", "Risco médio"),
    ("Alto ризик", "Alto risco"),

    # ── Support pages ────────────────────────────────────────
    ("Ваш número pedido:", "O seu número de pedido:"),
    ("Це pode зайняти кілька minutos.", "Isto pode demorar alguns minutos."),
    ("Criar cópia de segurança do sistema? Це pode зайняти кілька minutos.", "Criar cópia de segurança do sistema? Isto pode demorar alguns minutos."),

    # ── Assignments leftovers ─────────────────────────────────
    ("Não há прострочених", "Não há pedidos em atraso"),
    ("Todos os pedidos в нормальному estadoі.", "Todos os pedidos estão em estado normal."),
    ("Переatribuído e продоjáно дедлайн:", "Reatribuído e prazo prolongado:"),
    ("продоjáно дедлайн:", "prazo prolongado:"),
    ("на +", "em +"),
    ("Переatribuição pedidos", "Reatribuição de pedidos"),
    ("Iniciar роботу над ціexisteю заявкою?", "Iniciar trabalho neste pedido?"),
    ("Concluir цю o pedido?", "Concluir este pedido?"),
    ("Atribuído диспетчером", "Atribuído pelo dispatcher"),
    ("Concluído диспетчером", "Concluído pelo dispatcher"),
    ("Erro adição comentárioя", "Erro ao adicionar comentário"),
    ("тому", "atrás"),

    # ── Notifications/admin leftovers ─────────────────────────
    ("Tem a certeza que quer eliminar це notificações?", "Tem a certeza que quer eliminar estas notificações?"),
    ("Tem a certeza que quer eliminar цей elevador? Цю дію не pode-se cancelar.", "Tem a certeza que quer eliminar este elevador? Esta ação não pode ser cancelada."),
    ("Tem a certeza que quer eliminar цей documento?", "Tem a certeza que quer eliminar este documento?"),
    ("dias тому", "dias atrás"),
    ("Deаявок не encontrado", "Nenhum pedido encontrado"),

    # ── Tech tasks ─────────────────────────────────────────────
    ("Tem a certeza que quer concluir це tarefas?", "Tem a certeza que quer concluir estas tarefas?"),
    ("Tem a certeza que quer concluir esta tarefas?", "Tem a certeza que quer concluir esta tarefa?"),

    # ── assets/modules/tasks.html ─────────────────────────────
    ("Розпочинаємо виконання завдання #", "A iniciar execução da tarefa #"),
    ("Продовжуємо виконання завдання #", "A retomar execução da tarefa #"),
    ("Призупинено виконання завдання #", "Execução pausada da tarefa #"),
    ("Завдання #", "Tarefa #"),
    ("com sucesso concluída!", "concluída com sucesso!"),
    ("Перегляд деталей завдання #", "Ver detalhes da tarefa #"),
    ("Detalhes завдання #", "Detalhes da tarefa #"),
    ("Тут будуть відображатися:", "Aqui serão apresentados:"),
    ("Повний опис завдання", "Descrição completa da tarefa"),
    ("Технічні характеристики", "Características técnicas"),
    ("Історія виконання", "Histórico de execução"),
    ("Файли та документи", "Ficheiros e documentos"),
    ("Коментарі", "Comentários"),
    ("Формування аварійного виклику...", "A criar chamada de emergência..."),
    ("Emergência виклик відправлено! Диспетчер буде повідомлений.", "Chamada de emergência enviada! O dispatcher será notificado."),
    ("ЗАВЕРШЕНО", "CONCLUÍDO"),

    # ── assets/modules/task-map.html ─────────────────────────
    ("Estado завдання", "Estado da tarefa"),
    ("Технік", "Técnico"),
    ("Tipo завдання", "Tipo de tarefa"),
    ("Filtroи застосовано", "Filtros aplicados"),
    ("Filtroи очищено", "Filtros limpos"),
    ("A gerar relatório маршрутів", "A gerar relatório de rotas"),
    ("Exportar карти", "Exportar mapa"),
    ("concluída", "concluída"),
    ("Зв'язок з технікою: ", "Contactar técnico: "),
    ("Зв\\'язок з технікою: ", "Contactar técnico: "),

    # ── assets/modules/maps.html ──────────────────────────────
    ("Estado ліфтів", "Estado dos elevadores"),
    ("Район", "Zona"),
    ("Modelo ліфта", "Modelo do elevador"),

    # ── assets/modules/assignments.html ──────────────────────
    ("Завдання", "Tarefa"),
    ("Пріоритет", "Prioridade"),
    ("Коментар", "Comentário"),
    ("Призначити", "Atribuir"),
    ("Зв'язок з технікою по завданню: ", "Contactar técnico da tarefa: "),
    ("Зв\\'язок з технікою по завданню: ", "Contactar técnico da tarefa: "),
    ("призначено техніку", "atribuída ao técnico"),
    ("Виберіть техніка", "Selecione um técnico"),

    # ── assets/modules/analytics.html ─────────────────────────
    ("Період", "Período"),
    ("Tipo ліфта", "Tipo de elevador"),
    ("QR сканування", "Leitura QR"),
    ("Relatório com sucesso експортовано!", "Relatório exportado com sucesso!"),

    # ── assets/modules/reports.html ───────────────────────────
    ("Період експорту:", "Período de exportação:"),
    ("Формат файлу:", "Formato do ficheiro:"),
    ("Автоматичний експорт:", "Exportação automática:"),
    ("Щомісячний експорт", "Exportação mensal"),
    ("Email для розсилки:", "Email de envio:"),
    ("Включати в звіт:", "Incluir no relatório:"),
    ("Завдання", "Tarefas"),
    ("Ліфти", "Elevadores"),
    ("QR коди", "Códigos QR"),
    ("Emergência ремонт", "Reparação de emergência"),
    ("Exportar звіту в форматі", "Exportar relatório no formato"),
    ("iniciado...", "iniciado..."),
    ("Relatório com sucesso експортовано!", "Relatório exportado com sucesso!"),
    ("Оберіть період для експорту", "Selecione o período de exportação"),

    # ── assets/modules/lifts.html ─────────────────────────────
    ("QR згенеровано", "QR gerado"),
    ("Perегляд деталей ліфта: ", "Ver detalhes do elevador: "),
    ("Перегляд деталей ліфта: ", "Ver detalhes do elevador: "),
    ("Eliminar ліфт ", "Eliminar elevador "),

    # ── assets/modules/lift-management.html ──────────────────
    ("Modelo ліфта", "Modelo do elevador"),
    ("Tipo ліфта", "Tipo de elevador"),
    ("Поштовий індекс", "Código postal"),
    ("Вантажопідйомність (pessoas)", "Capacidade (pessoas)"),
    ("Velocidade (м/с)", "Velocidade (m/s)"),
    ("Назва клієнта", "Nome do cliente"),
    ("Erro завантаження даних ліфтів", "Erro ao carregar dados dos elevadores"),
    ("Todos ліфти в нормальному стані", "Todos os elevadores em estado normal"),
    ("Заповніть всі обов\\'язкові поля", "Preencha todos os campos obrigatórios"),
    ("Detalhes ліфта:", "Detalhes do elevador:"),

    # ── assets/modules/qr-generator.html ─────────────────────
    ("Ліфт", "Elevador"),
    ("Tipo QR-коду", "Tipo de QR code"),
    ("Опис QR-коду", "Descrição do QR code"),
    ("Додатковий опис або примітки...", "Descrição adicional ou notas..."),
    ("Розмір QR-коду", "Tamanho do QR code"),
    ("Формат файлу", "Formato do ficheiro"),
    ("Кількість копій", "Número de cópias"),
    ("Ліфт:", "Elevador:"),
    ("Генерування...", "A gerar..."),

    # ── assets/modules/users.html ─────────────────────────────
    ("Pesquisa користувачів...", "Pesquisar utilizadores..."),
    ("Ім'я", "Nome"),
    ("Роль", "Função"),
    ("Телефон", "Telefone"),
    ("Пароль", "Palavra-passe"),
    ("Підтвердження паролю", "Confirmar palavra-passe"),
    ("Estado змінено для користувача: ", "Estado alterado para o utilizador: "),
    ("Filtroація по ролі: ", "Filtrar por função: "),
    ("статусу: ", "estado: "),
    ("Exportar списку користувачів", "Exportar lista de utilizadores"),

    # ── assets/modules/settings.html ─────────────────────────
    ("Назва компанії", "Nome da empresa"),
    ("Email компанії", "Email da empresa"),
    ("Телефон", "Telefone"),
    ("Часовий пояс", "Fuso horário"),
    ("Мова системи", "Idioma do sistema"),
    ("QR-коди", "Códigos QR"),
    ("Увімкнути QR-коди", "Ativar códigos QR"),
    ("Мобільний додаток", "Aplicação móvel"),
    ("Мобільний доступ", "Acesso móvel"),
    ("Сповіщення", "Notificações"),
    ("Email сповіщення", "Notificações por email"),
    ("SMS сповіщення", "Notificações por SMS"),
    ("SMS повідомлення", "Mensagens SMS"),
    ("Збір статистики", "Recolha de estatísticas"),
    ("API доступ", "Acesso API"),
    ("Зовнішній API", "API externo"),
    ("Час сесії (хвилини)", "Tempo de sessão (minutos)"),
    ("Максимум спроб входу", "Máximo de tentativas de início de sessão"),
    ("Двофакторна автентифікація", "Autenticação de dois fatores"),
    ("Увімкнути 2FA", "Ativar 2FA"),
    ("Логування дій", "Registo de ações"),
    ("Журнал активності", "Registo de atividade"),
    ("IP блокування", "Bloqueio de IP"),
    ("Блокувати підозрілі IP", "Bloquear IPs suspeitos"),
    ("Definições скинуто", "Definições repostas"),
    ("Definições функцій збережено", "Definições de funcionalidades guardadas"),
    ("Definições безпеки збережено", "Definições de segurança guardadas"),
    ("Створення бекапу бази даних...", "A criar cópia de segurança da base de dados..."),
    ("Бекап створено com sucesso", "Cópia de segurança criada com sucesso"),
    ("Оптимізація бази даних...", "A otimizar base de dados..."),
    ("База даних оптимізована", "Base de dados otimizada"),
    ("Перегляд детальної статистики бази даних", "Ver estatísticas detalhadas da base de dados"),
    ("Перевірка оновлень...", "A verificar atualizações..."),
    ("Система використовує найновішу версію", "O sistema está atualizado"),
    ("Перезапустити систему? Todos користувачі будуть відключені.", "Reiniciar o sistema? Todos os utilizadores serão desligados."),
    ("Система перезапускається...", "O sistema está a reiniciar..."),
    ("Definições експортовано", "Definições exportadas"),
    ("Виберіть файл для імпорту налаштувань", "Selecione um ficheiro para importar definições"),

    # ── assets/modules/qr-scanner.html ───────────────────────
    ("Код QR (якщо камера не працює)", "Código QR (se a câmara não funcionar)"),
    ("Введіть код QR...", "Introduza o código QR..."),
    ("Камера запущена. Наведіть на QR-код ліфта.", "Câmara iniciada. Aponte para o QR code do elevador."),
    ("Перемикання на ", "A mudar para câmara "),
    (" камеру", ""),
    ("Будь ласка, введіть код QR", "Por favor, introduza o código QR"),
    ("QR-код com sucesso відсканований!", "QR code lido com sucesso!"),
    ("Розпочато виконання завдання для ", "Execução de tarefa iniciada para "),
    ("Відкриття форми звіту про проблему для ", "A abrir formulário de problema para "),
    ("Перегляд історії обслуговування для ", "Ver histórico de manutenção de "),
    ("Оновлення історії сканувань...", "A atualizar histórico de leituras..."),

    # ── assets/modules/monitoring.html ───────────────────────
    ("Завершені завдання", "Tarefas concluídas"),
    ("Оновлення активності...", "A atualizar atividade..."),
    ("Дані оновлено", "Dados atualizados"),
    ("Exportar журналу активності", "Exportar registo de atividade"),
    ("Позначити сповіщення як вирішене?", "Marcar notificação como resolvida?"),
    ("Сповіщення вирішено: ", "Notificação resolvida: "),
    ("Зв'язок з технікою: ", "Contactar técnico: "),

    # ── assets/modules/technicians.html ──────────────────────
    ("Масове оповіщення техніків", "Notificação em massa para técnicos"),
    ("Relatório про продуктивність техніків", "Relatório de desempenho dos técnicos"),

    # ── app.js UI strings ─────────────────────────────────────
    ("Доступ заборонено", "Acesso negado"),
    ("Erro сервера", "Erro do servidor"),
    ("Користувач", "Utilizador"),
    ("Сесія закінчилася. Будь ласка, увійдіть знову.", "A sessão expirou. Por favor, inicie sessão novamente."),
    ("Збереження...", "A guardar..."),
    ("Дані com sucesso збережено", "Dados guardados com sucesso"),
    ("Erro збереження: ", "Erro ao guardar: "),
    ("Вихід успішний", "Sessão terminada com sucesso"),
    ("Сталася неочікувана помилка", "Ocorreu um erro inesperado"),
    ("Erro виконання операції", "Erro ao executar operação"),

    # ── auth.js UI strings ────────────────────────────────────
    ("Технік", "Técnico"),
    ("Диспетчер", "Dispatcher"),
    ("Адміністратор", "Administrador"),
    ("Адміністратор Системи", "Administrador do Sistema"),
    ("Адміністратор системи", "Administrador do sistema"),

    # ── ai_interface.js UI strings ────────────────────────────
    ("Статистика системи", "Estatísticas do sistema"),
    ("Ліфтів", "Elevadores"),
    ("Активних заявок", "Pedidos ativos"),
    ("Техніків онлайн", "Técnicos online"),
    ("Час роботи", "Tempo de funcionamento"),
    ("Активні заявки", "Pedidos ativos"),
    ("Todos заявки", "Todos os pedidos"),
    ("Мої призначення", "As minhas atribuições"),
    ("Застосувати", "Aplicar"),
    ("Відхилити", "Rejeitar"),
    ("Рекомендацію застосовано!", "Recomendação aplicada!"),
    ("Erro застосування рекомендації", "Erro ao aplicar recomendação"),
    ("Віджет ", "Widget "),
    (" в розробці", " em desenvolvimento"),
    ("Erro завантаження віджета", "Erro ao carregar widget"),

    # ── charts ───────────────────────────────────────────────
    ("Ціна", "Preço"),
    ("Дохід", "Receita"),
    ("Histórico дохід", "Receita histórica"),
    ("Прогноз доходу", "Previsão de receita"),
    ("Довірчий інтервал", "Intervalo de confiança"),
    ("Ймовірність відмови (%)", "Probabilidade de falha (%)"),
    ("Час простою (години)", "Tempo de inatividade (horas)"),
    ("Доступність", "Disponibilidade"),
    ("Продуктивність", "Desempenho"),
    ("Якість", "Qualidade"),
    ("Загальний OEE", "OEE total"),
    ("Фактичні показники", "Indicadores reais"),
    ("Цільові показники", "Indicadores objetivo"),
    ("Витрати на техобслуговування", "Custos de manutenção"),
    ("Бюджет", "Orçamento"),
    ("обладнання", "equipamentos"),
    ("годин", "horas"),

    # ── Status labels extra ─────────────────────────────────
    ("На ремонті", "Em reparação"),
    ("Потребує уваги", "Requer atenção"),
    ("Поламаний", "Avariado"),
    ("Не працює", "Fora de serviço"),
    ("Поза обслуговуванням", "Fora de serviço"),
    ("out-of-service", "out-of-service"),  # keep key

    # ── Error / empty messages ───────────────────────────────
    ("API недоступне", "API indisponível"),
    ("Немає даних", "Sem dados"),
    ("Немає інформації", "Sem informação"),
    ("Дані відсутні", "Sem dados"),
    ("Записів ще немає", "Sem registos ainda"),
    ("Записів не знайдено", "Nenhum registo encontrado"),
    ("Нічого не знайдено", "Nada encontrado"),
    ("Elevador не знайдено", "Elevador não encontrado"),
    ("Erro завантаження даних", "Erro ao carregar dados"),
    ("Контракт ще не завантажено адміністратором", "Contrato ainda não carregado pelo administrador"),
    ("Endereço не вказана", "Endereço não especificado"),
    ("Endereço não вказано", "Endereço não especificado"),
    ("Невідома дата", "Data desconhecida"),
    ("Невідомо", "Desconhecido"),
    ("Невідомий", "Desconhecido"),

    # ── Lift detail field labels ─────────────────────────────
    ("Муніципальний №:", "N.º Municipal:"),
    ("Кількість поверхів:", "Número de pisos:"),
    ("Кількість поверхів", "Número de pisos"),
    ("Частота інспекцій:", "Frequência de inspeções:"),
    ("Частота інспекцій", "Frequência de inspeções"),
    ("Код домофону:", "Código do intercomunicador:"),
    ("Код домофону", "Código do intercomunicador"),
    ("Tipo приводу:", "Tipo de acionamento:"),
    ("Tipo дверей:", "Tipo de porta:"),
    ("м/с", "m/s"),
    ("кг", "kg"),
    ("осіб", "pessoas"),

    # ── Report / inspection labels ───────────────────────────
    ("Інспекція", "Inspeção"),
    ("Інспекції", "Inspeções"),
    ("Emergência виклик", "Chamada de emergência"),
    ("Виконано", "Concluído"),
    ("Не пройдено", "Reprovado"),
    ("PDF прикріплено", "PDF anexado"),
    ("Переслати по Email", "Reencaminhar por email"),
    ("Роздрукувати", "Imprimir"),
    ("Переглянути PDF", "Ver PDF"),
    ("Завантажити PDF", "Descarregar PDF"),

    # ── Badge / status text ──────────────────────────────────
    ("Виконаний", "Concluído"),
    ("Виконана", "Concluída"),
    ("Відкритий", "Aberto"),
    ("Відкрита", "Aberta"),
    ("В роботі", "Em progresso"),
    ("Призначений", "Atribuído"),
    ("Призначена", "Atribuída"),
    ("Скасований", "Cancelado"),
    ("Скасована", "Cancelada"),
    ("Очікує", "Pendente"),
    ("Завершений", "Concluído"),
    ("Завершена", "Concluída"),
    ("Закритий", "Fechado"),
    ("Новий", "Novo"),
    ("Нова", "Nova"),
    ("Терміново", "Urgente"),
    ("Висока", "Alta"),
    ("Середня", "Média"),
    ("Низька", "Baixa"),
    ("Висок", "Alt"),

    # ── Form field labels / table headers ─────────────────────
    ("Назва", "Nome"),
    ("Опис", "Descrição"),
    ("Дата", "Data"),
    ("Дати", "Datas"),
    ("Початок", "Início"),
    ("Кінець", "Fim"),
    ("Вартість", "Custo"),
    ("Вартість, €", "Custo, €"),
    ("Тривалість", "Duração"),
    ("Пріоритет", "Prioridade"),
    ("Призначений технік", "Técnico atribuído"),
    ("Призначений техніку", "Atribuído ao técnico"),
    ("Технік", "Técnico"),
    ("Техніки", "Técnicos"),
    ("Клієнти", "Clientes"),
    ("Запит", "Pedido"),
    ("Запити", "Pedidos"),
    ("Заявка", "Pedido"),
    ("Заявки", "Pedidos"),
    ("Телефон", "Telefone"),
    ("Email", "Email"),
    ("Ім'я", "Nome"),
    ("Прізвище", "Apelido"),
    ("Компанія", "Empresa"),
    ("Роль", "Função"),
    ("Пароль", "Senha"),
    ("Підтвердження паролю", "Confirmar senha"),
    ("Дата народження", "Data de nascimento"),
    ("Стать", "Sexo"),

    # ── Action buttons / messages ─────────────────────────────
    ("Відправити", "Enviar"),
    ("Надіслати", "Enviar"),
    ("Прикріпити", "Anexar"),
    ("Прикріплені файли", "Ficheiros anexados"),
    ("Фото", "Fotografia"),
    ("Відео", "Vídeo"),
    ("Вибрати файл", "Selecionar ficheiro"),
    ("Файл не вибрано", "Nenhum ficheiro selecionado"),
    ("Перетягніть файл сюди", "Arraste o ficheiro para aqui"),
    ("Обрати", "Selecionar"),
    ("Застосувати", "Aplicar"),
    ("Скинути", "Repor"),
    ("Назад", "Voltar"),
    ("Далі", "Seguinte"),
    ("Готово", "Pronto"),
    ("Завершити", "Concluir"),
    ("Почати", "Iniciar"),
    ("Відкрити", "Abrir"),
    ("Друкувати", "Imprimir"),
    ("Копіювати", "Copiar"),
    ("Переміщення", "Mover"),

    # ── Notifications / toasts ────────────────────────────────
    ("Дані збережено", "Dados guardados"),
    ("Дані оновлено", "Dados atualizados"),
    ("Дані видалено", "Dados eliminados"),
    ("Дані завантажено", "Dados carregados"),
    ("Помилка збереження", "Erro ao guardar"),
    ("Помилка завантаження", "Erro ao carregar"),
    ("Помилка видалення", "Erro ao eliminar"),
    ("Помилка відправки", "Erro ao enviar"),
    ("Успішно збережено", "Guardado com sucesso"),
    ("Успішно оновлено", "Atualizado com sucesso"),
    ("Успішно видалено", "Eliminado com sucesso"),
    ("Успішно відправлено", "Enviado com sucesso"),
    ("Будь ласка, заповніть усі поля", "Por favor, preencha todos os campos"),
    ("Будь ласка", "Por favor"),

    # ── Dashboard / stats ─────────────────────────────────────
    ("Всього ліфтів", "Total de elevadores"),
    ("Активних ліфтів", "Elevadores ativos"),
    ("Відкритих запитів", "Pedidos em aberto"),
    ("Завершених запитів", "Pedidos concluídos"),
    ("Нових запитів", "Novos pedidos"),
    ("Сьогодні", "Hoje"),
    ("Цього тижня", "Esta semana"),
    ("Цього місяця", "Este mês"),
    ("За останній рік", "No último ano"),
    ("Немає сповіщень", "Sem notificações"),
    ("Переглянути всі", "Ver todos"),
    ("Показати більше", "Mostrar mais"),
    ("Завантажити більше", "Carregar mais"),
    ("Оновлення", "Atualização"),

    # ── Time / calendar ───────────────────────────────────────
    ("хвилин тому", "minutos atrás"),
    ("годин тому", "horas atrás"),
    ("день тому", "dia atrás"),
    ("днів тому", "dias atrás"),
    ("щойно", "agora mesmo"),
    ("Сьогодні", "Hoje"),
    ("Вчора", "Ontem"),
    ("Завтра", "Amanhã"),

    # ── Misc ─────────────────────────────────────────────────
    ("Ліфт №", "Elevador N.º"),
    # ── Predictive maintenance mixed strings ─────────────────
    ("Планове manutenção técnica", "Manutenção técnica planeada"),
    ("Sistema виявила підвиaindaний ризик відмови caboів у do elevadorх сeрше 12 років", "O sistema detetou risco elevado de falha dos cabos em elevadores com mais de 12 anos"),
    ("Recomenda-se впровадити превентивне Manutenção para 3 de elevadores високого ризику", "Recomenda-se implementar manutenção preventiva em 3 elevadores de alto risco"),
    ("Системи de segurança", "Sistemas de segurança"),
    ("Перевиaindaння допустимої de vibração двигуна", "Vibração do motor acima do limite admissível"),
    ("Наближаexisteться prazo плаnovo Manutenção", "A aproximar-se o prazo de manutenção planeada"),
    # ── Frequency abbreviation ────────────────────────────────
    (" міс.", " meses"),
    # ── Assignments Swal ──────────────────────────────────────
    ("Дедлайн продоjáно!", "Prazo prolongado!"),
    ("дедлайн", "prazo"),
    ("Não foi possível atualizar дедлайн", "Não foi possível atualizar o prazo"),
    # ── QR export ─────────────────────────────────────────────
    ("para експорту", "para exportação"),
    # ── TypeLabels with typos ─────────────────────────────────
    ("Inspекція", "Inspeção"),
    ("Agoтифікація", "Certificação"),
    # ── Admin maps confirm ─────────────────────────────────────
    ("Це виправить coordenadas ВСІХ de elevadores desde неправильними ou ausentesми координаeми.", "Isto irá corrigir coordenadas de TODOS os elevadores com coordenadas incorretas ou ausentes."),
    ("Clique Cancel para correção лише de elevadores беdesde координат.", "Clique em Cancelar para corrigir apenas os elevadores sem coordenadas."),
    ("apenas порожні", "apenas os sem coordenadas"),
    # ── Admin notifications ────────────────────────────────────
    ("Motivo відхилення (необов,язково):", "Motivo da rejeição (opcional):"),
    # ── Admin requests status ─────────────────────────────────
    ("Виконана", "Concluída"),
    ("Скасована", "Cancelada"),
    ("Орсаменто", "Orçamento"),
    # ── Admin lifts confirm ───────────────────────────────────
    ("Adicionar ainda один relatório?", "Adicionar mais um relatório?"),
    # ── Invoice template ──────────────────────────────────────
    ("Орçаменто не encontrado", "Orçamento não encontrado"),
    ("Орçаменто", "Orçamento"),
    # ── Misc 'emergency' check ────────────────────────────────
    ("аварі", "avari"),  # kept as value check in .includes()

    # ── Predictive maintenance sensor messages ────────────────
    ("Crítico desgaste caboів", "Desgaste crítico dos cabos"),
    ("Recomenda-se substituição filtroів", "Recomenda-se a substituição dos filtros"),

    # ── QR bulk-delete confirm modal ──────────────────────────
    ("Ви açõesсно бажаexisteте <b>eliminar</b> <span id=\"bulkDeleteCount\">0</span> вибраних de QR-codes? Цю дію не pode-se cancelar.", "Tem a certeza de que deseja <b>eliminar</b> <span id=\"bulkDeleteCount\">0</span> QR codes selecionados? Esta ação não pode ser cancelada."),

    # ── Notifications type labels ─────────────────────────────
    ("Pedido на eliminação", "Pedido de eliminação"),

    # ── Reports error ─────────────────────────────────────────
    ("Erro генерації relatório", "Erro ao gerar relatório"),

    # ── Tech tasks prompts ────────────────────────────────────
    ("Erro поchatку trabalhos", "Erro ao iniciar trabalho"),
    ("Opишіть виконану роботу:", "Descreva o trabalho realizado:"),
    ("Опишіть виконану роботу:", "Descreva o trabalho realizado:"),
    ("Trabalho concluído згідно desde regulamentoом. Todas неcorretamenteсті усунуто.", "Trabalho concluído de acordo com os regulamentos. Todas as irregularidades foram corrigidas."),

    # ── Tech task-map errors ──────────────────────────────────
    ("Elevador не encontrado", "Elevador não encontrado"),
    ("A geolocalização не підтримуexisteться вашим браузером", "A geolocalização não é suportada pelo seu navegador"),
    ("📍 Ваша позиція", "📍 A sua posição"),

    # ── Tech QR-scanner errors ────────────────────────────────
    ("Não foi possível отримати lista disponíveis камер. Verifique дозволи камери у вашому браузері.", "Não foi possível obter a lista de câmeras disponíveis. Verifique as permissões da câmera no seu navegador."),
    ("Não foi possível запустити para leitura.", "Não foi possível iniciar a leitura."),
    ("Não foi possível обробити відскаnovaний QR-code. Tente ainda раз.", "Não foi possível processar o QR code lido. Tente novamente."),
    ("Não foi possível reconhecer QR-code у carregadoму ficheiroі. Verifique, що ficheiro містить чіткий QR-code.", "Não foi possível reconhecer o QR code no ficheiro carregado. Verifique se o ficheiro contém um QR code nítido."),
    ("Não foi possível обробити введені dados. Verifique formato dados і tente ainda раз.", "Não foi possível processar os dados introduzidos. Verifique o formato dos dados e tente novamente."),
    ("Створення tarefas", "Criação de tarefas"),
    ("Atéдання relatório", "Relatório atualizado"),

    # ── lift-utils.js ─────────────────────────────────────────
    ("Ім'я клієнта", "Nome do cliente"),
    ("Capacidade повинна бути від 1 до 50 pessoas", "A capacidade deve estar entre 1 e 50 pessoas"),
    ("Velocidade повинна бути від 0.1 до 10 м/с", "A velocidade deve estar entre 0,1 e 10 m/s"),

    # ── QR modal comment ──────────────────────────────────────
    ("Модальне confirmação em massa eliminação", "Modal de confirmação de eliminação em massa"),

    # ── maps language comment ─────────────────────────────────
    ("Виutilizовуexisteмо англійську, бо українська не підтримуexisteться", "Utilizamos inglês porque o ucraniano não é suportado"),

    # ── tech/reports dummy data ───────────────────────────────
    ("Mensal relatório вересень 2025", "Relatório mensal setembro 2025"),
    ("Utilizувацький", "Personalizado"),

    # ── client/requests demo user ─────────────────────────────
    ("firstName: 'Олена', lastName: 'Шевченко'", "firstName: 'Cliente', lastName: 'Demo'"),

    # ── admin/requests dummy names ────────────────────────────
    ("'Сидоров П.П.'", "'Técnico Demo'"),
    ("'Козлов А.А.'", "'Técnico B'"),
    ("'Петров І.В.'", "'Técnico A'"),

    # ── invoice-template throw ────────────────────────────────
    ("'Орçаменто не encontrado'", "'Orçamento não encontrado'"),


    ("Ліфт зупинився між поверхами", "Elevador parado entre andares"),
    ("Планове технічне обслуговування", "Manutenção técnica planeada"),
    ("Заміна кнопок виклику", "Substituição de botões de chamada"),
    ("Не призначено", "Não atribuído"),
    ("Аварія", "Avaria"),
    ("ТО", "Manutenção"),
    ("Термінова", "Urgente"),
    ("Звичайна", "Normal"),
    ("Зв'язатися", "Contactar"),
    ("Генерація звіту маршрутів", "Gerar relatório de rotas"),
    ("Експорт карти", "Exportar mapa"),
    ("Онлайн", "Online"),
    ("Офлайн", "Offline"),
    ("Зайнятий", "Ocupado"),
    ("Критичний", "Crítico"),
    ("Працює", "Em funcionamento"),
    ("Потребує ТО", "Necessita manutenção"),
    ("Перевіряю інтеграції", "A verificar integrações"),
    ("Виправлено", "Corrigido"),
    ("Проблеми", "Problemas"),
    ("Обмежено", "Limitado"),
    ("Місяці", "Meses"),
    ("роки", "anos"),
    ("рік", "ano"),
]

# ── Files / dirs to process ────────────────────────────────
INCLUDE_DIRS = [
    "/workspaces/deapseak/assets/js",
    "/workspaces/deapseak/assets/modules",
    "/workspaces/deapseak/pages",
    "/workspaces/deapseak/index.html",
]

# Files/dirs to skip entirely
SKIP_PATTERNS = [
    "ai-assistant", "knowledge-manager", "knowledge", "ar-helper",
    "ar-checklist", "voice", "VOICE", "backup", "archive",
    "node_modules", ".git", "qr-manager-backup",
    "assets/plugins",  # 3rd-party libraries – do not touch
    "ai-diagnostics",  # internal debug page
    # AI / legal knowledge files that are intentionally multilingual
    "regulations", "inspection-report-parser",
]

EXTENSIONS = {".js", ".html"}

# ──────────────────────────────────────────────────────────

def should_skip(path):
    for p in SKIP_PATTERNS:
        if p in path:
            return True
    return False

def collect_files():
    files = []
    for d in INCLUDE_DIRS:
        if os.path.isfile(d):
            ext = os.path.splitext(d)[1]
            if ext in EXTENSIONS and not should_skip(d):
                files.append(d)
            continue
        for root, dirs, fnames in os.walk(d):
            # prune dirs
            dirs[:] = [dd for dd in dirs if not should_skip(os.path.join(root, dd))]
            for fn in fnames:
                ext = os.path.splitext(fn)[1]
                if ext not in EXTENSIONS:
                    continue
                fp = os.path.join(root, fn)
                if should_skip(fp):
                    continue
                files.append(fp)
    return files


def is_in_code_comment(line, pos):
    """Return True if position is inside a // line comment."""
    comment = line.find("//")
    return comment != -1 and pos > comment


def translate_file(filepath, translations):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"  ⚠️  Cannot read {filepath}: {e}")
        return 0

    original = content
    count = 0
    for ua, pt in translations:
        if ua in content:
            content = content.replace(ua, pt)
            count += content.count(pt) - original.count(pt) + content.count(pt) - original.count(pt)
            # simpler: just track if replacement happened
    
    if content != original:
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            return 1
        except Exception as e:
            print(f"  ⚠️  Cannot write {filepath}: {e}")
            return 0
    return 0


def main():
    files = collect_files()
    print(f"🔍 Found {len(files)} files to process")
    
    changed = 0
    for fp in sorted(files):
        n = translate_file(fp, TRANSLATIONS)
        if n:
            changed += 1
            short = fp.replace("/workspaces/deapseak/", "")
            print(f"  ✅ {short}")
    
    print(f"\n🎉 Done! Translated {changed}/{len(files)} files.")


if __name__ == "__main__":
    main()
