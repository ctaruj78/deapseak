#!/usr/bin/env python3
"""
Виправлення ВСІХ документацій з правильними шляхами AI Assistant
"""
import os
import re

# ПРАВИЛЬНІ шляхи (після аудиту):
CORRECT_PATH = "/pages/ai-assistant/ai-assistant.html"

# Файли для виправлення
docs_to_fix = [
    "README.md",
    "QUICK-REFERENCE.md",
    "WIDGET-CLEANUP-REPORT-20260120.md",
    "AI-ASSISTANT-CLEANUP-PLAN.md",
    "DB-CONNECTION-AUDIT-2026-01-04.md",
    "CLAUSE-TEXT-FIX-COMPLETE.md",
    "AI-KNOWLEDGE-BASE-INTEGRATION.md",
    "AI-UNIVERSAL-PAGE-REPORT.md",
    "AI-ASSISTANT-FULL-RESTORED.md",
    "AI-KNOWLEDGE-UPDATE-REPORT.md",
    "GEMINI-INTEGRATION-SUCCESS.md",
    "AI-ASSISTANT-DEEP-ANALYSIS-RESTORED.md",
    "AI-ASSISTANT-READY.md",
    "SIDEBAR-ANALYSIS-REPORT.md"
]

print("📝 ВИПРАВЛЕННЯ ДОКУМЕНТАЦІЇ З ПРАВИЛЬНИМИ ШЛЯХАМИ")
print("=" * 70)
print()
print(f"✅ ПРАВИЛЬНИЙ ШЛЯХ: {CORRECT_PATH}")
print("❌ НЕПРАВИЛЬНІ ШЛЯХИ:")
print("   - /pages/admin/ai-assistant-full.html")
print("   - /pages/tech/ai-assistant.html")
print("   - /pages/dispatcher/ai-assistant.html")
print("   - /pages/client/ai-assistant.html")
print()
print("=" * 70)
print()

total_changes = 0

for filename in docs_to_fix:
    if not os.path.exists(filename):
        continue
    
    print(f"📄 {filename}")
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changes_in_file = 0
    
    # Заміни
    replacements = [
        (r'/pages/admin/ai-assistant-full\.html', CORRECT_PATH),
        (r'/pages/tech/ai-assistant\.html', CORRECT_PATH),
        (r'/pages/dispatcher/ai-assistant\.html', CORRECT_PATH),
        (r'/pages/client/ai-assistant\.html', CORRECT_PATH),
        (r'pages/admin/ai-assistant-full\.html', 'pages/ai-assistant/ai-assistant.html'),
        (r'pages/tech/ai-assistant\.html', 'pages/ai-assistant/ai-assistant.html'),
        (r'pages/dispatcher/ai-assistant\.html', 'pages/ai-assistant/ai-assistant.html'),
        (r'pages/client/ai-assistant\.html', 'pages/ai-assistant/ai-assistant.html'),
        # Також виправити згадки про "окремі сторінки для кожної ролі"
        (r'Admin версія.*?ai-assistant', 'Універсальна AI сторінка'),
        (r'Tech версія.*?ai-assistant', 'Універсальна AI сторінка'),
        (r'Диспетчер версія.*?ai-assistant', 'Універсальна AI сторінка'),
        (r'Клієнт версія.*?ai-assistant', 'Універсальна AI сторінка'),
    ]
    
    for pattern, replacement in replacements:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            changes_in_file += (content.count(pattern))
            content = new_content
    
    if content != original:
        # Backup
        with open(f"{filename}.backup-path-fix", 'w', encoding='utf-8') as f:
            f.write(original)
        
        # Записати виправлений
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"   ✅ Виправлено {changes_in_file} згадок")
        total_changes += changes_in_file
    else:
        print(f"   ℹ️  Змін не потрібно")
    print()

print("=" * 70)
print(f"✅ Всього виправлено: {total_changes} згадок у {len([f for f in docs_to_fix if os.path.exists(f)])} файлах")
print()
print("🎯 ПІДСУМОК ПРАВИЛЬНОЇ СТРУКТУРИ:")
print("─────────────────────────────────────────────────────────")
print(f"   Всі ролі → {CORRECT_PATH}")
print("   Доступ: через меню (sidebar) кожної ролі")
print("   Inline widgets: ВИДАЛЕНІ повністю ✅")
print("=" * 70)
