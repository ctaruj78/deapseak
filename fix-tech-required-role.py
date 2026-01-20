#!/usr/bin/env python3
"""
Скрипт для додавання data-required-role="tech" до всіх tech сторінок
"""

import re
from pathlib import Path

TECH_DIR = Path('/workspaces/deapseak/pages/tech')

def add_required_role(file_path):
    """Додати data-required-role="tech" до <body> тегу"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Створити backup
    backup_path = f"{file_path}.backup-role-fix"
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Regex для знаходження <body> без data-required-role
    # Шукаємо <body class="..." > БЕЗ data-required-role
    
    # Pattern 1: <body class="hold-transition sidebar-mini layout-fixed">
    pattern1 = r'<body class="([^"]*)">'
    
    # Перевірити чи вже є data-required-role
    if 'data-required-role' in content:
        return False, "✅ Вже має data-required-role"
    
    # Замінити <body class="..."> на <body class="..." data-required-role="tech">
    new_content = re.sub(
        pattern1,
        r'<body class="\1" data-required-role="tech">',
        content
    )
    
    # Якщо змін не було (немає тегу <body class="...">)
    if new_content == content:
        # Спробувати простий <body>
        pattern2 = r'<body>'
        new_content = re.sub(
            pattern2,
            r'<body data-required-role="tech">',
            content
        )
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, "✅ data-required-role додано"
    else:
        return False, "⚠️ Не вдалося знайти <body> тег"

def main():
    print("🔧 ДОДАВАННЯ data-required-role='tech' ДО ВСІХ TECH СТОРІНОК\n")
    
    # Всі HTML файли в pages/tech/
    html_files = list(TECH_DIR.glob('*.html'))
    
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for file_path in sorted(html_files):
        fname = file_path.name
        
        # Пропустити task-map.html (fullscreen, без AdminLTE)
        if fname == 'task-map.html':
            print(f"⏭️ {fname} - пропущено (fullscreen map)")
            skip_count += 1
            continue
        
        success, message = add_required_role(file_path)
        
        if success:
            print(f"✅ {fname} - {message}")
            success_count += 1
        elif "Вже має" in message:
            print(f"✓ {fname} - {message}")
            skip_count += 1
        else:
            print(f"⚠️ {fname} - {message}")
            error_count += 1
    
    print(f"\n📊 ПІДСУМОК:")
    print(f"   Виправлено: {success_count}")
    print(f"   Пропущено: {skip_count}")
    print(f"   Помилки: {error_count}")
    print(f"   Всього: {len(html_files)}")
    
    if success_count > 0:
        print(f"\n✅ Готово! {success_count} файлів оновлено.")
        print(f"💾 Backups: *.backup-role-fix")

if __name__ == '__main__':
    main()
