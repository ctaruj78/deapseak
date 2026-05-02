"""Pass 26: pages/maps.html - translate all Ukrainian UI text."""
from pathlib import Path

TRANSLATIONS = [
    ('<html lang="uk">', '<html lang="pt">'),
    ('<title>Мапа ліфтів</title>', '<title>Mapa de elevadores</title>'),
    ('<!-- Навігаційна панель -->', '<!-- Painel de navegação -->'),
    ('<!-- Бічна панель -->', '<!-- Barra lateral -->'),
    ('<p>Дашборд</p>', '<p>Dashboard</p>'),
    ('<p>Ліфти</p>', '<p>Elevadores</p>'),
    ('<p>Мапа ліфтів</p>', '<p>Mapa de elevadores</p>'),
    ('<p>Користувачі</p>', '<p>Utilizadores</p>'),
    ('<p>Звіти</p>', '<p>Relatórios</p>'),
    ('<p>Налаштування</p>', '<p>Configurações</p>'),
    ('<p>Профіль</p>', '<p>Perfil</p>'),
    ('<p>Вийти</p>', '<p>Sair</p>'),
    ('<!-- Контент -->', '<!-- Conteúdo -->'),
    ('<div class="col-sm-6"><h1>Мапа ліфтів</h1></div>',
     '<div class="col-sm-6"><h1>Mapa de elevadores</h1></div>'),
    ('<i class="fas fa-sync-alt"></i> Оновити карту',
     '<i class="fas fa-sync-alt"></i> Actualizar mapa'),
    ('Останнє оновлення: <span id="lastUpdate">зараз</span>',
     'Última actualização: <span id="lastUpdate">agora</span>'),
    ('<label for="addressInput" class="mb-0">Визначити координати по адресі:</label>',
     '<label for="addressInput" class="mb-0">Determinar coordenadas por endereço:</label>'),
    ('placeholder="Введіть адресу..."',
     'placeholder="Introduza o endereço..."'),
    ('<i class="fas fa-search"></i> Пошук',
     '<i class="fas fa-search"></i> Pesquisar'),
    ('<label for="routeToLift">Прокласти маршрут до ліфта:</label>',
     '<label for="routeToLift">Traçar rota para o elevador:</label>'),
    ('<option value="">Оберіть ліфт...</option>',
     '<option value="">Seleccione o elevador...</option>'),
    ('<i class="fas fa-route"></i> Показати маршрут',
     '<i class="fas fa-route"></i> Mostrar rota'),
]

TARGET = Path("pages/maps.html")

def main():
    if not TARGET.exists():
        print(f"❌ File not found: {TARGET}"); return
    content = TARGET.read_text(encoding="utf-8")
    orig = content; n = 0
    for old, new in TRANSLATIONS:
        if old in content:
            content = content.replace(old, new, 1); n += 1
            print(f"✅ {old[:70]}")
    if content != orig:
        TARGET.write_text(content, encoding="utf-8")
        print(f"\n🎉 Pass 26: {n}/{len(TRANSLATIONS)} replacements in {TARGET}")
    else:
        print(f"⚠️ No changes in {TARGET}")

if __name__ == "__main__":
    main()
