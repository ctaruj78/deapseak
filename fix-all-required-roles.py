#!/usr/bin/env python3
"""
КРИТИЧНЕ ВИПРАВЛЕННЯ: Додавання data-required-role до ВСІХ сторінок системи
"""

import re
from pathlib import Path

PAGES_DIR = Path('/workspaces/deapseak/pages')

ROLES = {
    'admin': 'admin',
    'dispatcher': 'dispatcher',
    'tech': 'tech',
    'client': 'client'
}

# Файли які НЕ потребують data-required-role (публічні, templates, modals)
EXCLUDE_FILES = [
    'login.html',
    'register.html',
    'forgot-password.html',
    'reset-password.html',
    'task-map.html',  # fullscreen map
    'email-template.html',  # template
    'invoice-template.html',  # template
    'report-template.html',  # template
    'view-lift-modal.html',  # modal
    'simple-nav-test.html',  # test
    'test-navigation.html',  # test
    'maps-simple.html',  # fullscreen
]

def add_required_role(file_path, role):
    """Додати data-required-role до <body> тегу"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Перевірити чи вже є data-required-role
    if f'data-required-role="{role}"' in content:
        return False, "✅ Вже має правильний role"
    
    # Перевірити чи є ІНШИЙ role (помилка!)
    if 'data-required-role=' in content:
        # Витягти існуючий role
        existing = re.search(r'data-required-role="([^"]*)"', content)
        if existing:
            return False, f"⚠️ Має НЕПРАВИЛЬНИЙ role: {existing.group(1)}"
    
    # Створити backup
    backup_path = f"{file_path}.backup-role-fix"
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Pattern: <body ...> БЕЗ data-required-role
    patterns = [
        # <body class="..." >
        (r'<body\s+class="([^"]*)">', r'<body class="\1" data-required-role="' + role + '">'),
        # <body>
        (r'<body>', r'<body data-required-role="' + role + '">'),
        # <body id="..." >
        (r'<body\s+id="([^"]*)">', r'<body id="\1" data-required-role="' + role + '">'),
    ]
    
    new_content = content
    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, new_content)
        if new_content != content:
            break
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, "✅ data-required-role додано"
    else:
        return False, "⚠️ Не вдалося знайти <body> тег"

def main():
    print("🚨 КРИТИЧНЕ ВИПРАВЛЕННЯ: data-required-role для ВСІХ РОЛЕЙ\n")
    print("=" * 70)
    
    total_fixed = 0
    total_skipped = 0
    total_errors = 0
    
    for role_dir, role in ROLES.items():
        role_path = PAGES_DIR / role_dir
        
        if not role_path.exists():
            print(f"\n⚠️ {role_dir}/ не існує - пропущено")
            continue
        
        print(f"\n📁 {role_dir.upper()} (role={role}):")
        print("-" * 70)
        
        html_files = list(role_path.glob('*.html'))
        
        for file_path in sorted(html_files):
            fname = file_path.name
            
            # Пропустити excluded файли
            if fname in EXCLUDE_FILES:
                print(f"  ⏭️ {fname} - пропущено (excluded)")
                total_skipped += 1
                continue
            
            success, message = add_required_role(file_path, role)
            
            if success:
                print(f"  ✅ {fname} - {message}")
                total_fixed += 1
            elif "Вже має" in message:
                print(f"  ✓ {fname} - {message}")
                total_skipped += 1
            elif "НЕПРАВИЛЬНИЙ" in message:
                print(f"  🚨 {fname} - {message}")
                total_errors += 1
            else:
                print(f"  ⚠️ {fname} - {message}")
                total_errors += 1
    
    print("\n" + "=" * 70)
    print(f"\n📊 ЗАГАЛЬНИЙ ПІДСУМОК:")
    print(f"   ✅ Виправлено: {total_fixed}")
    print(f"   ✓ Пропущено (вже ОК): {total_skipped}")
    print(f"   ⚠️ Помилки: {total_errors}")
    print(f"   📝 Всього оброблено: {total_fixed + total_skipped + total_errors}")
    
    if total_fixed > 0:
        print(f"\n🎉 Готово! {total_fixed} файлів виправлено.")
        print(f"💾 Backups збережено: *.backup-role-fix")
    
    if total_errors > 0:
        print(f"\n⚠️ УВАГА: {total_errors} файлів з помилками - потребують ручної перевірки!")

if __name__ == '__main__':
    main()
