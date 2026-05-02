"""Third pass: domain-specific and file-specific translations for lifts.html and others."""
import re
from pathlib import Path

TRANSLATIONS = [
    # Elevator types
    ('Пасажирський', 'Passageiro'),
    ('пасажирський', 'passageiro'),
    ('Вантажний', 'Mercadorias'),
    ('вантажний', 'mercadorias'),
    ('Лікарняний', 'Hospitalar'),
    ('лікарняний', 'hospitalar'),
    ('Панорамний', 'Panorâmico'),
    ('панорамний', 'panorâmico'),
    ('Спеціальний', 'Especial'),
    ('спеціальний', 'especial'),
    # Elevator status (remaining)
    ('Працює', 'A funcionar'),
    ('працює', 'a funcionar'),
    ('Поламаний', 'Avariado'),
    ('поламаний', 'avariado'),
    ('Тимчасово вимкнений', 'Temporariamente desactivado'),
    ('В обслуговуванні', 'Em manutenção'),
    ('в обслуговуванні', 'em manutenção'),
    ('Неактивних', 'Inactivos'),
    ('неактивних', 'inactivos'),
    # Table headers & labels
    ('Муніципальний №', 'Nº Municipal'),
    ('Об\'єкт', 'Instalação'),
    ('об\'єкт', 'instalação'),
    ('Останнє ТО', 'Última manutenção'),
    ('Наступне ТО', 'Próxima manutenção'),
    ('Дії', 'Ações'),
    ('дії', 'ações'),
    ('Ідентифікація', 'Identificação'),
    ('Деталі', 'Detalhes'),
    ('деталі', 'detalhes'),
    # Hybrid filter labels (Portuguese noun + украïнська ending)
    ('Activo фільтр:', 'Filtro activo:'),
    ('Filtro по estadoу', 'Filtro por estado'),
    ('Filtro по tipoу', 'Filtro por tipo'),
    ('Всі tipoи', 'Todos os tipos'),
    ('A mostrar', 'A mostrar'),  # no-op
    # Elevator-specific fields
    ('К-ть elevadores у будівлі', 'Nº de elevadores no edifício'),
    ('Скільки elevadores у будівлі', 'Quantos elevadores no edifício'),
    ('Загальна quantidade elevadores', 'Total de elevadores'),
    ('Активних elevadores', 'Elevadores activos'),
    ('Неактивних elevadores', 'Elevadores inactivos'),
    ('Ідентифікатор elevadorа', 'Identificador do elevador'),
    ('Повна endereço', 'Endereço completo'),
    ('Поштовий код', 'Código postal'),
    ('Поштовий індекс', 'Código postal'),
    ('К-ть поверхів', 'Nº de andares'),
    ('Кількість поверхів', 'Número de andares'),
    ('Рік виробництва', 'Ano de fabrico'),
    # Buttons and tooltips
    ('Виконати пошук', 'Executar pesquisa'),
    ('Розгорнути', 'Maximizar'),
    ('Згорнути', 'Minimizar'),
    ('Деталі запиту', 'Detalhes do pedido'),
    # Search placeholders
    ('по моделі, адресі', 'por modelo, endereço'),
    ('Пошук по', 'Pesquisar por'),
    ('пошук по', 'pesquisar por'),
    # Status messages
    ('Виконується пошук', 'A pesquisar'),
    ('Завантаження даних', 'A carregar dados'),
    ('Завантаження списку', 'A carregar lista'),
    ('ручне введення', 'introdução manual'),
    ('Домофон', 'Interfone'),
    ('майбутній автопошук', 'pesquisa automática futura'),
    ('Підтягуватиметься за адресою з реєстру камер', 'Será preenchido pelo endereço a partir do registo de câmeras'),
    ('Поки — ручне введення. Пізніше буде автоматично підтягуватись за адресою.', 'Por agora — introdução manual. Futuramente será preenchido automaticamente pelo endereço.'),
    # General remaining mixed
    ('Детальніше', 'Mais detalhes'),
    ('детальніше', 'mais detalhes'),
    ('Місяць', 'Mês'),
    ('Рік', 'Ano'),
    ('Номер камери / реєстру DGRM', 'Número de câmara / registo DGRM'),
    ('Використовується для', 'É utilizado para'),
    ('Знайти на карті', 'Encontrar no mapa'),
    ('Моя localização', 'A minha localização'),
    ('Код entradaу', 'Código de entrada'),
    ('Ім\'я та прізвище', 'Nome e apelido'),
    ('Новий пароль', 'Nova palavra-passe'),
    ('Підтвердити пароль', 'Confirmar palavra-passe'),
    ('Поточний пароль', 'Palavra-passe actual'),
    ('Змінити пароль', 'Alterar palavra-passe'),
    ('Зміна пароля', 'Alteração de palavra-passe'),
    # More status / message strings
    ('нову заявку', 'novo pedido'),
    ('нова заявка', 'novo pedido'),
    ('нові заявки', 'novos pedidos'),
    ('нових заявок', 'novos pedidos'),
    ('не вказана', 'não especificado'),
    ('не вказано', 'não especificado'),
    ('Не задано', 'Não definido'),
    ('не задано', 'não definido'),
    ('Не обрано', 'Não selecionado'),
    ('не обрано', 'não selecionado'),
    ('Не доступно', 'Não disponível'),
    ('не доступно', 'não disponível'),
    ('Не підтримується', 'Não suportado'),
    ('Дозволено', 'Permitido'),
    ('Заборонено', 'Proibido'),
    ('заборонено', 'proibido'),
    ('Перевантаження', 'Sobrecarga'),
    ('перевантаження', 'sobrecarga'),
    # Tech tasks panel specific
    ('Прийняти', 'Aceitar'),
    ('прийняти', 'aceitar'),
    ('Відмовитись', 'Recusar'),
    ('відмовитись', 'recusar'),
    ('Підтвердити виконання', 'Confirmar execução'),
    ('Звіт про роботу', 'Relatório de trabalho'),
    ('Фото до', 'Foto antes'),
    ('Фото після', 'Foto após'),
    ('Перевірено технік', 'Verificado pelo técnico'),
    ('Підпис клієнта', 'Assinatura do cliente'),
    ('Час виїзду', 'Hora de saída'),
    ('Час прибуття', 'Hora de chegada'),
    ('Час завершення', 'Hora de conclusão'),
    ('Тривалість роботи', 'Duração do trabalho'),
    ('Витрачений час', 'Tempo despendido'),
    ('Виїхав', 'Saiu'),
    ('Прибув', 'Chegou'),
    # Requests page specific
    ('Тип заявки', 'Tipo de pedido'),
    ('Відкриті', 'Abertos'),
    ('В процесі', 'Em processo'),
    ('Нові', 'Novos'),
    ('Відклад', 'Adiado'),
    ('Повторна перевірка', 'Verificação repetida'),
    ('Перелік заявок', 'Lista de pedidos'),
    ('Всі заявки', 'Todos os pedidos'),
    ('Нова заявка', 'Novo pedido'),
    ('Клієнтська заявка', 'Pedido de cliente'),
    ('Технічна проблема', 'Problema técnico'),
    ('Планове обслуговування', 'Manutenção planeada'),
    ('Аварійний виклик', 'Chamada de emergência'),
    # QR-specific
    ('Сканувати', 'Digitalizar'),
    ('сканувати', 'digitalizar'),
    ('Сканування', 'Leitura'),
    ('сканування', 'leitura'),
    ('Код', 'Código'),
    ('Місцезнаходження', 'Localização'),
    ('місцезнаходження', 'localização'),
    # Analytics
    ('Доходи', 'Receitas'),
    ('доходи', 'receitas'),
    ('Витрати', 'Gastos'),
    ('витрати', 'gastos'),
    ('Прибуток', 'Lucro'),
    ('прибуток', 'lucro'),
    ('Рентабельність', 'Rentabilidade'),
    ('рентабельність', 'rentabilidade'),
    ('Виконані роботи', 'Trabalhos concluídos'),
    ('Незакриті заявки', 'Pedidos abertos'),
    ('Середній час', 'Tempo médio'),
    ('середній час', 'tempo médio'),
    ('Найближчі', 'Próximos'),
    ('найближчі', 'próximos'),
    ('Топ', 'Top'),
    ('Ефективність', 'Eficiência'),
    ('ефективність', 'eficiência'),
    ('Продуктивність', 'Desempenho'),
    ('продуктивність', 'desempenho'),
    # Users page
    ('Роль користувача', 'Função do utilizador'),
    ('Новий користувач', 'Novo utilizador'),
    ('Список користувачів', 'Lista de utilizadores'),
    ('Деталі користувача', 'Detalhes do utilizador'),
    ('Активний користувач', 'Utilizador activo'),
    ('Заблокований', 'Bloqueado'),
    ('заблокований', 'bloqueado'),
    ('Остання активність', 'Última actividade'),
    ('Кількість входів', 'Número de acessos'),
    ('Блокувати', 'Bloquear'),
    ('блокувати', 'bloquear'),
    ('Розблокувати', 'Desbloquear'),
    ('розблокувати', 'desbloquear'),
    ('Скинути пароль', 'Repor palavra-passe'),
    # Notifications page
    ('Тип сповіщення', 'Tipo de notificação'),
    ('Для кого', 'Para'),
    ('Терміново', 'Urgente'),
    ('терміново', 'urgente'),
    ('Повідомити', 'Notificar'),
    ('повідомити', 'notificar'),
    ('Відправлено', 'Enviado'),
    ('відправлено', 'enviado'),
    ('Шаблон', 'Modelo'),
    ('шаблон', 'modelo'),
    # Misc remaining
    ('Детальний', 'Detalhado'),
    ('детальний', 'detalhado'),
    ('Повний', 'Completo'),
    ('повний', 'completo'),
    ('Короткий', 'Resumido'),
    ('короткий', 'resumido'),
    ('Розширений', 'Avançado'),
    ('розширений', 'avançado'),
    ('Стандартний', 'Padrão'),
    ('стандартний', 'padrão'),
    ('Старий', 'Antigo'),
    ('старий', 'antigo'),
    ('Новий', 'Novo'),
    ('новий', 'novo'),
    ('Перший', 'Primeiro'),
    ('Останній', 'Último'),
    ('Далі', 'Seguinte'),
    ('Назад', 'Anterior'),
    ('Вгору', 'Para cima'),
    ('Вниз', 'Para baixo'),
    ('Зліва', 'Da esquerda'),
    ('Справа', 'Da direita'),
    ('Центр', 'Centro'),
    ('Розмір', 'Tamanho'),
    ('розмір', 'tamanho'),
    # ('ще', 'mais'),  # too short, risky
    ('Більше', 'Mais'),
    ('більше', 'mais'),
    ('Менше', 'Menos'),
    ('менше', 'menos'),
    # Sentence-level corrections for remaining hybrids
    ('A mostrar <span id="showingCount">0</span> з <span id="totalCount">0</span> registos',
     'A mostrar <span id="showingCount">0</span> de <span id="totalCount">0</span> registos'),
    ('elevadorа з обслуговування', 'do elevador da manutenção'),
    ('Сервіс', 'Serviço'),
    ('сервіс', 'serviço'),
    ('Помилки', 'Erros'),
    ('помилки', 'erros'),
    ('Переваги', 'Vantagens'),
    ('переваги', 'vantagens'),
    ('Попередній', 'Anterior'),
    ('Наступний', 'Seguinte'),
    ('наступний', 'seguinte'),
]

# Remove exact duplicates
seen = set()
DEDUP = []
for old, new in TRANSLATIONS:
    if old not in seen:
        seen.add(old)
        DEDUP.append((old, new))

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

base = Path('/workspaces/deapseak/pages')
for panel in ['admin', 'dispatcher', 'tech']:
    changed = skipped = 0
    for f in sorted((base / panel).glob('*.html')):
        if process_file(f):
            changed += 1
        else:
            skipped += 1
    print(f'{panel}: {changed} files updated, {skipped} unchanged')
print('Done.')
