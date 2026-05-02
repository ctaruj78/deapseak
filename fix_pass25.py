"""Pass 25: pages/index.html - translate all Ukrainian text."""
from pathlib import Path

TRANSLATIONS = [
    ('<html lang="uk">', '<html lang="pt">'),
    ('<title>Головна | LiftMaster Pro</title>',
     '<title>Início | FestLift</title>'),
    ('<a class="nav-link" href="admin/admin-dashboard.html"><i class="fas fa-tachometer-alt"></i> Адмін-панель</a>',
     '<a class="nav-link" href="admin/admin-dashboard.html"><i class="fas fa-tachometer-alt"></i> Painel admin</a>'),
    ('<a class="nav-link" href="client/dashboard.html"><i class="fas fa-user"></i> Клієнт</a>',
     '<a class="nav-link" href="client/dashboard.html"><i class="fas fa-user"></i> Cliente</a>'),
    ('<h1>Ласкаво просимо до LiftMaster Pro!</h1>',
     '<h1>Bem-vindo ao FestLift!</h1>'),
    ('<p>Виберіть панель для роботи:</p>',
     '<p>Seleccione o painel de trabalho:</p>'),
    ('<a href="admin/admin-dashboard.html" class="btn btn-primary btn-block"><i class="fas fa-tools"></i> Адмін-панель</a>',
     '<a href="admin/admin-dashboard.html" class="btn btn-primary btn-block"><i class="fas fa-tools"></i> Painel admin</a>'),
    ('<a href="client/dashboard.html" class="btn btn-success btn-block"><i class="fas fa-user"></i> Клієнтська панель</a>',
     '<a href="client/dashboard.html" class="btn btn-success btn-block"><i class="fas fa-user"></i> Painel do cliente</a>'),
    ('<strong>&copy; 2025 LiftMaster Pro.</strong> Всі права захищені.',
     '<strong>&copy; 2026 FestLift.</strong> Todos os direitos reservados.'),
]

TARGET = Path("pages/index.html")

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
        print(f"\n🎉 Pass 25: {n}/{len(TRANSLATIONS)} replacements in {TARGET}")
    else:
        print(f"⚠️ No changes in {TARGET}")

if __name__ == "__main__":
    main()
