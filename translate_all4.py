#!/usr/bin/env python3
# Pass 4 - remaining UI strings (safe, no ambiguous short words)
import glob

FIXES4 = [
    # === Broken artifacts ===
    ('Позначити як прочиeні', 'Marcar como lidas'),
    ('Позначити як прочитані', 'Marcar como lidas'),
    ('Позначити як прочитане', 'Marcar como lida'),
    ('Позначити всі', 'Marcar todas'),
    ('Вибрано 0 de notificações', 'Selecionadas 0 notificações'),
    ('Вибрано ', 'Selecionadas '),
    ('вибрані notificações', 'as notificações selecionadas'),
    ('Маркер не encontrado', 'Marcador não encontrado'),
    ("Erro z'ligação:", 'Erro de ligação:'),
    ('Erro pedidoу:', 'Erro de pedido:'),
    ('Виправлення...', 'A corrigir...'),
    ('Ви seráте перенаправлені para a página входу', 'Será redirecionado para a página de login'),
    ('Ви seráте', 'Será'),
    ('Спробувати знову', 'Tentar novamente'),
    ('Tente знову', 'Tente novamente'),
    ('Цього do mês', 'Neste mês'),
    ('Цього до mês', 'Neste mês'),
    ('щойно', 'agora mesmo'),
    # masрт artifacts
    ('masрти', 'alertas'),
    ('masртів', 'de alertas'),
    ('masрта', 'alerta'),
    ('masрт', 'alerta'),
    ('masртами', 'alertas'),
    ('Todas masрти', 'Todos os alertas'),
    ('Сeтистика masртів', 'Estatísticas de alertas'),
    ('Критичні masрти', 'Alertas críticos'),
    ('критичних masртів', 'alertas críticos'),
    ('Calendárioний вигляд', 'Vista de calendário'),
    ('Exportar calendárioя', 'Exportar calendário'),
    ('Calendárioня', 'do calendário'),
    # === Predictive maintenance ===
    ('ШІ Прогнози на seguinte período', 'Previsões de IA para o próximo período'),
    ('Desempenho моделей ШІ', 'Desempenho dos modelos de IA'),
    ('моделей ШІ', 'dos modelos de IA'),
    ('ШІ', 'IA'),
    ('Матриця ризиків', 'Matriz de riscos'),
    ('матриці ризиків', 'matriz de riscos'),
    ('Ризик (%)', 'Risco (%)'),
    ('Рівень ризику', 'Nível de risco'),
    ('Рівень', 'Nível'),
    ('Компоненти', 'Componentes'),
    ('Точність:', 'Precisão:'),
    ('Точність', 'Precisão'),
    ('Пріоритет:', 'Prioridade:'),
    ('Пріоритет', 'Prioridade'),
    ('Все в порядку', 'Tudo em ordem'),
    ('Ризик', 'Risco'),
    ('Вік', 'Idade'),
    ('Критичний', 'Crítico'),
    ('Критична', 'Crítica'),
    ('Критичне', 'Crítico'),
    ('КРИТИЧНИЙ', 'CRÍTICO'),
    ('Запуск повного аналізу...', 'A iniciar análise completa...'),
    ('Запуск аналізу...', 'A iniciar análise...'),
    ('Dados експортовано', 'Dados exportados'),
    ('Gráfico експортовано', 'Gráfico exportado'),
    ('Estado компонентів', 'Estado dos componentes'),
    ('Sem dados para матриці', 'Sem dados para a matriz'),
    ('Sistema прогнозування не готова', 'Sistema de previsão não está pronto'),
    # === Profile page ===
    ('Двофакторна аутентифікація', 'Autenticação de dois fatores'),
    ('аутентифікація', 'autenticação'),
    ('Аутентифікація', 'Autenticação'),
    ("Ім'я", 'Nome'),
    ('Прізвиainda', 'Apelido'),
    ('Прізвище', 'Apelido'),
    ('Телефон', 'Telefone'),
    ('Посада', 'Cargo'),
    ('Відділ', 'Departamento'),
    ('Головний administradorістратор', 'Administrador principal'),
    ('Безпека', 'Segurança'),
    ('semпеки', 'de segurança'),
    ('semпека', 'segurança'),
    ('semпечує', 'garante'),
    ('semпечуexiste', 'garante'),
    ('захиaindaні', 'protegidos'),
    ('захиaindaний', 'protegido'),
    ('захиaindaна', 'protegida'),
    ('захиaindaну', 'protegido'),
    ('сьогоdias', 'hoje'),
    ('вчора', 'ontem'),
    ('Ativosсть', 'Atividade'),
    ('ativosсть', 'atividade'),
    ('Поточна сесія', 'Sessão atual'),
    ('Мобільний пристрій', 'Dispositivo móvel'),
    ('Ativos сесії', 'Sessões ativas'),
    ('активні сесії', 'sessões ativas'),
    ('всі активні сесії', 'todas as sessões ativas'),
    ('всі сесії', 'todas as sessões'),
    ('Lisboa, Уpaís', 'Lisboa, Portugal'),
    ('Уpaís', 'País'),
    # === Notifications page ===
    ('Всі сповіщення', 'Todas as notificações'),
    ('Немає нових сповіщень', 'Sem novas notificações'),
    ('Немає сповіщень', 'Sem notificações'),
    ('непрочитані', 'não lidas'),
    ('прочитані', 'lidas'),
    ('позначені', 'marcadas'),
    # === Maps remaining ===
    ('Помилок: ', 'Erros: '),
    ('Total оброbleno: ', 'Total processados: '),
    # === Lifts page remaining ===
    ('Obrigatório · QR gerado automaticamente на сторінці', 'Obrigatório · QR gerado automaticamente na página'),
    ('Solicite inspeção вруч', 'Solicite inspeção manualmente'),
    ('Soliciteando', 'A solicitar'),
    # === Common Ukrainian words ===
    ('тимчасово', 'temporariamente'),
    ('тимчасовий', 'temporário'),
    ('тимчасова', 'temporária'),
    ('тимчасового', 'temporário'),
    ('аналізу', 'análise'),
    ('аналізом', 'análise'),
    ('аналіз', 'análise'),
    ('Аналіз', 'Análise'),
    ('відображення', 'apresentação'),
    ('Відображення', 'Apresentação'),
    ('відображати', 'apresentar'),
    ('Відображати', 'Apresentar'),
    ('відображується', 'é apresentado'),
    ('підключення', 'ligação'),
    ('підключитися', 'ligar-se'),
    ('підключений', 'ligado'),
    ('підключена', 'ligada'),
    ('підключено', 'ligado'),
    ('відключений', 'desligado'),
    ('відключена', 'desligada'),
    ('відключено', 'desligado'),
    ('відключитися', 'desligar-se'),
    ('виправлення', 'correção'),
    ('Виправлення', 'Correção'),
    ('виправити', 'corrigir'),
    ('Виправити', 'Corrigir'),
    ('виправлено', 'corrigido'),
    ('Виправлено', 'Corrigido'),
    ('оновлення сторінки', 'atualização da página'),
    ('оновити сторінку', 'atualizar a página'),
    ('Місто', 'Cidade'),
    ('Область', 'Distrito'),
    ('Країна', 'País'),
    ('Про себе', 'Sobre mim'),
    ('Дата народження', 'Data de nascimento'),
    ('Стать', 'Género'),
    ('Особисті дані', 'Dados pessoais'),
    ('Облікові дані', 'Credenciais'),
    ('Новий пароль', 'Nova palavra-passe'),
    ('Старий пароль', 'Palavra-passe antiga'),
    ('Підтвердити пароль', 'Confirmar palavra-passe'),
    ('Підтвердження пароля', 'Confirmar palavra-passe'),
    ('Завершено', 'Concluído'),
    ('завершено', 'concluído'),
    ('завершений', 'concluído'),
    ('завершена', 'concluída'),
    ('завершити', 'concluir'),
    ('Завершити', 'Concluir'),
    ('розпочато', 'iniciado'),
    ('розпочати', 'iniciar'),
    ('Розпочати', 'Iniciar'),
    ('Виконавець', 'Executor'),
    ('виконавця', 'executor'),
    ('тощо', 'etc.'),
    ('т.д.', 'etc.'),
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

    for uk, pt in FIXES4:
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
print(f'PASS 4: {total_files} files changed, {total_replacements} replacements')
print(f'{"="*60}')
for fp, count in files_with_changes:
    print(f'  {count:4d}  {fp}')
