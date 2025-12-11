#!/usr/bin/env python3
"""
Quick verification script to check that all sidebars were fixed correctly
"""

import re
from pathlib import Path
from collections import defaultdict

WORKSPACE = Path("/workspaces/deapseak")
PAGES_DIR = WORKSPACE / "pages"

# Expected sections per role
EXPECTED_SECTIONS = {
    "admin": [
        "Дашборд",
        "QR Система",
        "Ліфти",
        "Користувачі",
        "Документи",
        "Аналітика",
        "AI Асистент",
        "Підтримка",
        "Налаштування"
    ],
    "tech": [
        "Дашборд",
        "Мої завдання",
        "Графік робіт",
        "Обслуговування",
        "Інспекції",
        "Звіти",
        "Інструменти",
        "База знань",
        "AI Асистент",
        "Підтримка"
    ],
    "dispatcher": [
        "Дашборд",
        "Моніторинг",
        "Призначення завдань",
        "Техніки",
        "Клієнти",
        "QR Система",
        "Звіти",
        "AI Асистент",
        "Налаштування"
    ],
    "client": [
        "Дашборд",
        "Мої ліфти",
        "Заявки",
        "Історія обслуговування",
        "Рахунки",
        "Документація",
        "AI Прогнозування",
        "Сповіщення",
        "Підтримка",
        "Профіль"
    ]
}

def verify_file(file_path: Path, role: str) -> dict:
    """Verify a single file has correct sidebar"""
    result = {
        "file": file_path.name,
        "has_sidebar": False,
        "uses_absolute_paths": True,
        "missing_sections": [],
        "has_active_state": False
    }
    
    try:
        content = file_path.read_text()
        
        # Check if sidebar exists
        if '<nav class="mt-2">' in content:
            result["has_sidebar"] = True
        
        # Check for absolute paths
        relative_paths = re.findall(r'href="(?!http|/|#)([a-z-]+\.html)"', content)
        if relative_paths:
            result["uses_absolute_paths"] = False
            result["relative_paths"] = relative_paths[:3]  # Show first 3
        
        # Check for expected sections
        expected = EXPECTED_SECTIONS.get(role, [])
        for section in expected:
            if section not in content:
                result["missing_sections"].append(section)
        
        # Check for active state
        if 'class="nav-link active"' in content:
            result["has_active_state"] = True
        
    except Exception as e:
        result["error"] = str(e)
    
    return result

def main():
    print("🔍 Verifying sidebar fixes...\n")
    
    roles = ["admin", "tech", "dispatcher", "client"]
    stats = defaultdict(lambda: {"total": 0, "ok": 0, "issues": 0})
    all_issues = []
    
    for role in roles:
        role_dir = PAGES_DIR / role
        if not role_dir.exists():
            continue
        
        print(f"📁 {role.upper()}")
        print("─" * 60)
        
        html_files = sorted(role_dir.glob("*.html"))
        for file in html_files:
            result = verify_file(file, role)
            stats[role]["total"] += 1
            
            issues = []
            if not result["has_sidebar"]:
                issues.append("❌ No sidebar")
            if not result["uses_absolute_paths"]:
                issues.append("⚠️  Relative paths")
            if result["missing_sections"]:
                issues.append(f"⚠️  Missing: {', '.join(result['missing_sections'][:2])}")
            if not result["has_active_state"]:
                issues.append("⚠️  No active state")
            
            if issues:
                stats[role]["issues"] += 1
                all_issues.append(f"{role}/{file.name}: {', '.join(issues)}")
                print(f"  ⚠️  {file.name}: {', '.join(issues)}")
            else:
                stats[role]["ok"] += 1
                print(f"  ✅ {file.name}")
        
        print()
    
    # Summary
    print("=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    total_files = sum(s["total"] for s in stats.values())
    total_ok = sum(s["ok"] for s in stats.values())
    total_issues = sum(s["issues"] for s in stats.values())
    
    for role in roles:
        if stats[role]["total"] > 0:
            ok_pct = (stats[role]["ok"] / stats[role]["total"]) * 100
            print(f"{role.upper():12} {stats[role]['ok']:2}/{stats[role]['total']:2} OK ({ok_pct:.0f}%)")
    
    print("─" * 60)
    print(f"{'TOTAL':12} {total_ok}/{total_files} OK ({(total_ok/total_files)*100:.0f}%)")
    print()
    
    if total_issues == 0:
        print("✅✅✅ ALL SIDEBARS VERIFIED SUCCESSFULLY! ✅✅✅")
        return 0
    else:
        print(f"⚠️  {total_issues} files have issues:")
        for issue in all_issues[:10]:  # Show first 10
            print(f"  • {issue}")
        return 1

if __name__ == "__main__":
    exit(main())
