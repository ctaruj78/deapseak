"""Pass 28: pages/dispatcher/inspections.html - lang + remaining Ukrainian."""
from pathlib import Path

TRANSLATIONS = [
    ('<html lang="uk">', '<html lang="pt">'),
    # mixed remaining
    ('<option value="overdue">Прострочено</option>',
     '<option value="overdue">Atrasado</option>'),
    ('<h3 class="card-title"><i class="fas fa-list mr-2"></i>Список інспекцій</h3>',
     '<h3 class="card-title"><i class="fas fa-list mr-2"></i>Lista de inspecções</h3>'),
    ("tbody.innerHTML = '<tr><td colspan=\"8\" class=\"text-center text-muted py-4\">Інспекцій не encontrado</td></tr>';",
     "tbody.innerHTML = '<tr><td colspan=\"8\" class=\"text-center text-muted py-4\">Nenhuma inspecção encontrada</td></tr>';"),
]

TARGET = Path("pages/dispatcher/inspections.html")

def main():
    if not TARGET.exists():
        print(f"❌ File not found: {TARGET}"); return
    content = TARGET.read_text(encoding="utf-8")
    orig = content; n = 0
    for old, new in TRANSLATIONS:
        if old in content:
            content = content.replace(old, new, 1); n += 1
            print(f"✅ {old[:70]}")
        else:
            print(f"⚠️  NOT FOUND: {old[:70]}")
    if content != orig:
        TARGET.write_text(content, encoding="utf-8")
        print(f"\n🎉 Pass 28: {n}/{len(TRANSLATIONS)} replacements in {TARGET}")
    else:
        print(f"⚠️ No changes in {TARGET}")

if __name__ == "__main__":
    main()
