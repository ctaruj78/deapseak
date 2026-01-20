#!/usr/bin/env python3
import re
import os

files = [
    "pages/client/dashboard.html",
    "pages/client/history.html",
    "pages/client/invoices.html",
    "pages/client/my-lifts.html",
    "pages/client/notifications.html",
    "pages/client/profile.html",
    "pages/client/requests.html",
    "pages/client/settings.html",
    "pages/admin/lifts.html",
    "pages/admin/qr-management.html"
]

print("🗑️  ВИДАЛЕННЯ INLINE AI WIDGETS (Python)")
print("=" * 60)
print()

for filepath in files:
    if not os.path.exists(filepath):
        print(f"⚠️  {filepath} - не знайдено")
        continue
    
    print(f"📄 {filepath}")
    
    # Читаємо файл
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_length = len(content)
    
    # Backup
    with open(f"{filepath}.backup-final", 'w', encoding='utf-8') as f:
        f.write(content)
    
    # 1. Видалити <link> на ai-assistant.css
    content = re.sub(r'\s*<link rel="stylesheet" href="/assets/css/ai-assistant\.css">\s*\n', '', content)
    
    # 2. Видалити весь блок від ai-assistant-fab до кінця його script
    # Шукаємо блок: <div id="ai-assistant-fab" ... </script> (який закриває fab js)
    pattern = r'<div id="ai-assistant-fab".*?const modal = document\.getElementById\(\'ai-assistant-modal\'\);.*?</script>'
    content = re.sub(pattern, '', content, flags=re.DOTALL)
    
    # 3. Видалити залишкові пусті рядки
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    # Записуємо назад
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    new_length = len(content)
    removed = original_length - new_length
    
    # Перевірка
    if 'ai-assistant-fab' in content:
        print(f"   ⚠️  Залишились згадки ai-assistant-fab")
    else:
        print(f"   ✅ Widget видалено ({removed} символів)")
    print()

print("=" * 60)
print("✅ Очищення завершено!")
