#!/usr/bin/env python3
"""
Скрипт для додавання повноцінного sidebar меню до всіх tech сторінок
"""

import re
from pathlib import Path

# CANONICAL SIDEBAR з dashboard.html
CANONICAL_SIDEBAR = '''        <aside class="main-sidebar sidebar-dark-primary elevation-4">
            <!-- Brand Logo -->
            <a href="dashboard.html" class="brand-link">
                <i class="brand-image fas fa-tools"></i>
                <span class="brand-text font-weight-light">Технік</span>
            </a>

            <!-- Sidebar -->
            <div class="sidebar">
                <!-- CANONICAL TECH SIDEBAR - Copy this to all tech pages -->
<nav class="mt-2">
    <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
        <!-- Dashboard -->
        <li class="nav-item">
            <a href="/pages/tech/dashboard.html" class="nav-link">
                <i class="nav-icon fas fa-tachometer-alt"></i>
                <p>Дашборд</p>
            </a>
        </li>

        <!-- Tasks -->
        <li class="nav-item">
            <a href="/pages/tech/tasks.html" class="nav-link">
                <i class="nav-icon fas fa-clipboard-list"></i>
                <p>Мої завдання</p>
            </a>
        </li>

        <!-- Schedule -->
        <li class="nav-item">
            <a href="/pages/tech/schedule.html" class="nav-link">
                <i class="nav-icon fas fa-calendar-alt"></i>
                <p>Розклад</p>
            </a>
        </li>

        <!-- Maintenance -->
        <li class="nav-item">
            <a href="/pages/tech/manutencao.html" class="nav-link">
                <i class="nav-icon fas fa-wrench"></i>
                <p>Manutenção</p>
            </a>
        </li>

        <!-- Inspections -->
        <li class="nav-item">
            <a href="/pages/tech/inspections.html" class="nav-link">
                <i class="nav-icon fas fa-clipboard-check"></i>
                <p>Інспекції</p>
            </a>
        </li>

        <!-- Reports -->
        <li class="nav-item">
            <a href="/pages/tech/reports.html" class="nav-link">
                <i class="nav-icon fas fa-file-alt"></i>
                <p>Звіти робіт</p>
            </a>
        </li>

        <!-- Tools & Resources -->
        <li class="nav-item">
            <a href="#" class="nav-link">
                <i class="nav-icon fas fa-toolbox"></i>
                <p>
                    Інструменти
                    <i class="right fas fa-angle-left"></i>
                </p>
            </a>
            <ul class="nav nav-treeview">
                <li class="nav-item">
                    <a href="/pages/tech/qr-scanner.html" class="nav-link">
                        <i class="fas fa-qrcode nav-icon"></i>
                        <p>QR Сканер</p>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/pages/tech/ar-helper.html" class="nav-link">
                        <i class="fas fa-cube nav-icon"></i>
                        <p>AR Helper</p>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/pages/tech/tools.html" class="nav-link">
                        <i class="fas fa-tools nav-icon"></i>
                        <p>Калькулятори</p>
                    </a>
                </li>
            </ul>
        </li>

        <!-- Knowledge Base -->
        <li class="nav-item">
            <a href="#" class="nav-link">
                <i class="nav-icon fas fa-book"></i>
                <p>
                    База знань
                    <i class="right fas fa-angle-left"></i>
                </p>
            </a>
            <ul class="nav nav-treeview">
                <li class="nav-item">
                    <a href="/pages/tech/knowledge-base.html" class="nav-link">
                        <i class="fas fa-bookmark nav-icon"></i>
                        <p>Довідник</p>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/pages/tech/manuals.html" class="nav-link">
                        <i class="fas fa-book-open nav-icon"></i>
                        <p>Інструкції</p>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/pages/tech/checklists.html" class="nav-link">
                        <i class="fas fa-tasks nav-icon"></i>
                        <p>Чеклісти</p>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/pages/tech/videos.html" class="nav-link">
                        <i class="fas fa-video nav-icon"></i>
                        <p>Відео</p>
                    </a>
                </li>
            </ul>
        </li>

        <li class="nav-item">
            <a href="/pages/ai-assistant/ai-assistant.html" class="nav-link">
                <i class="nav-icon fas fa-magic"></i>
                <p>AI Асистент</p>
                <span class="badge badge-success right">Новинка</span>
            </a>
        </li>

        <!-- Support -->
        <li class="nav-item">
            <a href="/pages/tech/support.html" class="nav-link">
                <i class="nav-icon fas fa-headset"></i>
                <p>Suporte</p>
            </a>
        </li>
    </ul>
</nav>
            </div>
        </aside>'''

# Файли для оновлення (без AI Асистента в меню)
FILES_TO_UPDATE = [
    'inspections.html',
    'manutencao.html',
    'notifications.html',
    'profile.html',
    'schedule.html',
    'task-map.html',
    'tasks.html',
    'tools.html'
]

def update_sidebar(file_path):
    """Замінити старий sidebar на CANONICAL"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Створити backup
    backup_path = f"{file_path}.backup-sidebar-fix"
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Regex для знаходження старого sidebar
    # Шукаємо від <aside class="main-sidebar до </aside> (включно)
    pattern = r'<aside class="main-sidebar[^>]*>.*?</aside>'
    
    # Якщо є старий sidebar - замінити
    if re.search(pattern, content, re.DOTALL):
        new_content = re.sub(pattern, CANONICAL_SIDEBAR, content, flags=re.DOTALL)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        return True, "✅ Sidebar замінено"
    else:
        return False, "⚠️ Sidebar не знайдено"

def main():
    print("🔧 ВИПРАВЛЕННЯ TECH SIDEBARS\n")
    
    tech_dir = Path('/workspaces/deapseak/pages/tech')
    
    for filename in FILES_TO_UPDATE:
        file_path = tech_dir / filename
        
        if not file_path.exists():
            print(f"❌ {filename} - файл не існує")
            continue
        
        success, message = update_sidebar(file_path)
        
        if success:
            print(f"✅ {filename} - {message}")
        else:
            print(f"⚠️ {filename} - {message}")
    
    print("\n✅ Готово! Всі sidebar оновлені.")

if __name__ == '__main__':
    main()
