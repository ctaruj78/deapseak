#!/usr/bin/env python3
"""
Automatic Sidebar Replacement Script
Replaces incomplete/broken sidebars with canonical templates across all roles
"""

import os
import re
import shutil
from pathlib import Path
from typing import Optional, Tuple

# Paths
WORKSPACE = Path("/workspaces/deapseak")
TEMPLATES_DIR = WORKSPACE / "templates"
PAGES_DIR = WORKSPACE / "pages"

# Statistics
stats = {
    "fixed": 0,
    "skipped": 0,
    "errors": 0
}

# Color codes
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    BOLD = '\033[1m'
    NC = '\033[0m'

def find_sidebar_bounds(content: str) -> Optional[Tuple[int, int]]:
    """Find start and end positions of sidebar nav section"""
    # Find <nav class="mt-2"> with flexible whitespace
    nav_pattern = r'<nav\s+class="mt-2">'
    matches = list(re.finditer(nav_pattern, content))
    
    if not matches:
        return None
    
    start_pos = matches[0].start()
    start_end = matches[0].end()  # End of opening tag
    
    # Find the closing </nav> after start_pos
    # Count opening and closing tags to find the matching one
    nav_content = content[start_end:]  # Start AFTER the opening tag
    open_count = 1  # We already have one open tag
    
    for match in re.finditer(r'<nav[^>]*>|</nav>', nav_content):
        if match.group().startswith('</nav>'):
            open_count -= 1
            if open_count == 0:
                end_pos = start_end + match.end()
                return (start_pos, end_pos)
        else:
            open_count += 1
    
    return None

def replace_sidebar(file_path: Path, template_path: Path, current_page: str) -> bool:
    """Replace sidebar in file with canonical template"""
    try:
        print(f"{Colors.BLUE}Fixing: {file_path.relative_to(WORKSPACE)}{Colors.NC}")
        
        # Read files
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        with open(template_path, 'r', encoding='utf-8') as f:
            template = f.read()
        
        # Find sidebar bounds
        bounds = find_sidebar_bounds(content)
        if not bounds:
            print(f"{Colors.YELLOW}  ⚠️  No sidebar found - SKIPPED{Colors.NC}")
            stats["skipped"] += 1
            return False
        
        start_pos, end_pos = bounds
        
        # Create backup
        backup_path = file_path.with_suffix('.html.backup')
        shutil.copy2(file_path, backup_path)
        
        # Replace sidebar
        new_content = content[:start_pos] + template.strip() + content[end_pos:]
        
        # Mark current page as active
        if current_page:
            # Find the link to current page and add 'active' class
            pattern = rf'(href="[^"]*{re.escape(current_page)}"[^>]*class="nav-link)(")'
            new_content = re.sub(pattern, r'\1 active\2', new_content)
        
        # Write new content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        # Calculate lines for reporting
        lines_before = content[:start_pos].count('\n') + 1
        lines_after = content[:end_pos].count('\n') + 1
        
        print(f"{Colors.GREEN}  ✓ Fixed (lines {lines_before}-{lines_after}){Colors.NC}")
        stats["fixed"] += 1
        return True
        
    except Exception as e:
        print(f"{Colors.RED}  ✗ Error: {str(e)}{Colors.NC}")
        stats["errors"] += 1
        return False

def main():
    print(f"{Colors.BOLD}🔧 Starting automatic sidebar repair...{Colors.NC}")
    print("━" * 80)
    
    # Define files to fix
    files_to_fix = {
        "admin": [
            ("settings.html", "settings.html"),
            ("profile.html", "profile.html"),
            ("notifications.html", "notifications.html"),
            ("inspection-template.html", "inspection-template.html"),
            ("email-template.html", "email-template.html"),
            ("qr-generator.html", "qr-generator.html"),
            ("qr-batch.html", "qr-batch.html"),
            ("orcamentos-list.html", "orcamentos-list.html"),
            ("analytics-dashboard.html", "analytics-dashboard.html"),
            ("analytics.html", "analytics.html"),
            ("reports.html", "reports.html"),
            ("maps.html", "maps.html"),
            ("requests.html", "requests.html"),
            ("qr-management.html", "qr-management.html"),
            ("qr-analytics.html", "qr-analytics.html"),
            ("qr-history.html", "qr-history.html"),
            ("lifts.html", "lifts.html"),
            ("users.html", "users.html"),
            ("invoice-template.html", "invoice-template.html"),
            ("unified-analytics.html", "unified-analytics.html"),
            ("predictive-maintenance.html", "predictive-maintenance.html"),
        ],
        "tech": [
            ("dashboard.html", "dashboard.html"),
            ("support.html", "support.html"),
            ("checklists.html", "checklists.html"),
            ("manuals.html", "manuals.html"),
            ("reports.html", "reports.html"),
            ("videos.html", "videos.html"),
            ("qr-scanner.html", "qr-scanner.html"),
            ("ar-helper.html", "ar-helper.html"),
            ("knowledge-base.html", "knowledge-base.html"),
        ],
        "dispatcher": [
            ("monitoring.html", "monitoring.html"),
            ("dashboard.html", "dashboard.html"),
            ("assignments.html", "assignments.html"),
            ("clients.html", "clients.html"),
            ("qr-management.html", "qr-management.html"),
            ("technicians.html", "technicians.html"),
        ],
        "client": [
            ("documentation.html", "documentation.html"),
            ("ai-predictions.html", "ai-predictions.html"),
            ("profile.html", "profile.html"),
            ("support.html", "support.html"),
        ],
    }
    
    # Process each role
    for role, files in files_to_fix.items():
        print(f"\n📁 {role.upper()} FILES ({len(files)} files)")
        print("━" * 80)
        
        template_path = TEMPLATES_DIR / f"sidebar-{role}-canonical.html"
        if not template_path.exists():
            print(f"{Colors.RED}✗ Template not found: {template_path}{Colors.NC}")
            stats["errors"] += len(files)
            continue
        
        for filename, current_page in files:
            file_path = PAGES_DIR / role / filename
            if not file_path.exists():
                print(f"{Colors.RED}✗ File not found: {file_path.relative_to(WORKSPACE)}{Colors.NC}")
                stats["errors"] += 1
                continue
            
            replace_sidebar(file_path, template_path, current_page)
    
    # Summary
    print("\n" + "━" * 80)
    print(f"{Colors.BOLD}📊 SUMMARY{Colors.NC}")
    print("━" * 80)
    print(f"{Colors.GREEN}✓ Fixed: {stats['fixed']} files{Colors.NC}")
    print(f"{Colors.YELLOW}⚠ Skipped: {stats['skipped']} files{Colors.NC}")
    print(f"{Colors.RED}✗ Errors: {stats['errors']} files{Colors.NC}")
    print()
    
    if stats["errors"] == 0:
        print(f"{Colors.GREEN}{Colors.BOLD}✓✓✓ ALL SIDEBARS FIXED SUCCESSFULLY! ✓✓✓{Colors.NC}")
        print("\n📝 Next steps:")
        print("  1. Test navigation between pages")
        print("  2. Verify all links work correctly")
        print("  3. Check active state highlighting")
        print("  4. Remove .backup files if everything works:")
        print("     find /workspaces/deapseak/pages -name '*.backup' -delete")
        return 0
    else:
        print(f"{Colors.RED}⚠️  Some files had errors. Check logs above.{Colors.NC}")
        return 1

if __name__ == "__main__":
    exit(main())
