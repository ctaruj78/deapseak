"""Pass 24: pages/dispatcher/calendar.html - fix lang + Ukrainian strings."""
from pathlib import Path

TRANSLATIONS = [
    ('<html lang="uk">', '<html lang="pt">'),
    ('<title>Диспетчер — Календар pedidos</title>',
     '<title>Despachante — Calendário de pedidos</title>'),
    ('<h1 class="m-0">Календар pedidos</h1>',
     '<h1 class="m-0">Calendário de pedidos</h1>'),
    ('<li class="breadcrumb-item active">Календар</li>',
     '<li class="breadcrumb-item active">Calendário</li>'),
    ("locale: 'uk',", "locale: 'pt',"),
    ('{ id: 1, title: "Заміна жорсткого диска", date: "2025-09-28", status: "assigned" },',
     '{ id: 1, title: "Substituição do disco rígido", date: "2025-09-28", status: "assigned" },'),
    ('{ id: 2, title: "Встановлення оновлення ПЗ", date: "2025-09-29", status: "in-progress" },',
     '{ id: 2, title: "Instalação de actualização de software", date: "2025-09-29", status: "in-progress" },'),
    ('{ id: 3, title: "Діагностика сервера", date: "2025-09-30", status: "completed" }',
     '{ id: 3, title: "Diagnóstico do servidor", date: "2025-09-30", status: "completed" }'),
]

TARGET = Path("pages/dispatcher/calendar.html")

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
        print(f"\n🎉 Pass 24: {n}/{len(TRANSLATIONS)} replacements in {TARGET}")
    else:
        print(f"⚠️ No changes in {TARGET}")

if __name__ == "__main__":
    main()
