# Sidebar Navigation Analysis Report
**Date:** December 10, 2025  
**Analyzed Folders:** pages/admin/, pages/tech/, pages/dispatcher/, pages/client/

---

## Executive Summary

This report analyzes sidebar navigation menus across 59 HTML files in 4 role-based folders. The analysis identifies:
- Common menu patterns per role
- Files with incomplete or inconsistent sidebars
- Path consistency issues (relative vs absolute)
- Recommended canonical menu structures

---

## 1. ADMIN ROLE ANALYSIS

### Statistics
- **Total files with sidebars:** 24 out of 33 HTML files
- **Files with issues:** 13 (54%)

### Most Common Menu Items
| Item | Frequency | Percentage |
|------|-----------|------------|
| Дашборд | 17 | 71% |
| Користувачі | 17 | 71% |
| Налаштування | 17 | 71% |
| Керування QR-кодами | 15 | 63% |
| AI Асистент | 15 | 63% |
| Аналітика | 14 | 58% |
| Аналітика QR-кодів | 12 | 50% |
| Мапа ліфтів | 11 | 46% |
| Історія QR-кодів | 10 | 42% |
| Управління ліфтами | 10 | 42% |

### Files with Sidebar Issues

**Minimal/Incomplete Sidebars (< 10 items):**
1. `analytics-dashboard.html` - Only 6 items
2. `inspection-template.html` - Only 6 items
3. `invoice-template.html` - Only 8 items
4. `orcamentos-list.html` - Only 3 items
5. `notifications.html` - Only 1 item
6. `settings.html` - Only 1 item
7. `predictive-maintenance.html` - Only 5 items

**Missing Common Items:**
- `ai-assistant-full.html` - Missing: Аналітика
- `email-template.html` - Missing: Аналітика, Дашборд, AI Асистент
- `lifts.html` - Missing: Аналітика, Аналітика QR-кодів
- `reports.html` - Missing: Аналітика QR-кодів
- `requests.html` - Missing: Керування QR-кодами, AI Асистент, Аналітика QR-кодів

### Path Consistency Issues

**Inconsistent paths found for 12 menu items:**

1. **Дашборд**
   - 16x: `admin-dashboard.html` (relative)
   - 1x: `/pages/admin/admin-dashboard.html` (absolute)

2. **AI Асистент**
   - 14x: `/pages/ai-assistant-universal.html` (absolute)
   - 1x: `/pages/admin/ai-assistant-full.html` (absolute)

3. **Аналітика**
   - 9x: `unified-analytics.html` (relative)
   - 5x: `analytics.html` (relative)

4. **Аналітика QR-кодів**
   - 6x: `unified-analytics.html#qr-analytics` (anchor link)
   - 5x: `qr-analytics.html` (relative)
   - 1x: `/pages/admin/qr-analytics.html` (absolute)

### Recommended Canonical Admin Sidebar

```html
<ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
    <!-- Dashboard -->
    <li class="nav-item">
        <a href="admin-dashboard.html" class="nav-link">
            <i class="nav-icon fas fa-tachometer-alt"></i>
            <p>Дашборд</p>
        </a>
    </li>

    <!-- QR System Menu -->
    <li class="nav-item">
        <a href="#" class="nav-link">
            <i class="nav-icon fas fa-qrcode"></i>
            <p>
                QR Система
                <i class="right fas fa-angle-left"></i>
            </p>
        </a>
        <ul class="nav nav-treeview">
            <li class="nav-item">
                <a href="qr-management.html" class="nav-link">
                    <i class="fas fa-cog nav-icon"></i>
                    <p>Керування QR-кодами</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="unified-analytics.html#qr-analytics" class="nav-link">
                    <i class="fas fa-chart-line nav-icon"></i>
                    <p>Аналітика QR-кодів</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="qr-history.html" class="nav-link">
                    <i class="fas fa-history nav-icon"></i>
                    <p>Історія QR-кодів</p>
                </a>
            </li>
        </ul>
    </li>

    <!-- Lifts Menu -->
    <li class="nav-item">
        <a href="#" class="nav-link">
            <i class="nav-icon fas fa-elevator"></i>
            <p>
                Ліфти
                <i class="right fas fa-angle-left"></i>
            </p>
        </a>
        <ul class="nav nav-treeview">
            <li class="nav-item">
                <a href="lifts.html" class="nav-link">
                    <i class="fas fa-list nav-icon"></i>
                    <p>Управління ліфтами</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="requests.html" class="nav-link">
                    <i class="fas fa-clipboard-list nav-icon"></i>
                    <p>Заявки на обслуговування</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="maps.html" class="nav-link">
                    <i class="fas fa-map-marked-alt nav-icon"></i>
                    <p>Мапа ліфтів</p>
                </a>
            </li>
        </ul>
    </li>

    <!-- Users -->
    <li class="nav-item">
        <a href="users.html" class="nav-link">
            <i class="nav-icon fas fa-users"></i>
            <p>Користувачі</p>
        </a>
    </li>

    <!-- Analytics -->
    <li class="nav-item">
        <a href="unified-analytics.html" class="nav-link">
            <i class="nav-icon fas fa-chart-line"></i>
            <p>Аналітика</p>
        </a>
    </li>

    <!-- Predictive Analytics -->
    <li class="nav-item">
        <a href="predictive-maintenance.html" class="nav-link">
            <i class="nav-icon fas fa-brain"></i>
            <p>AI Прогнозування</p>
        </a>
    </li>

    <!-- Support Menu -->
    <li class="nav-item">
        <a href="#" class="nav-link">
            <i class="nav-icon fas fa-headset"></i>
            <p>
                Підтримка
                <i class="right fas fa-angle-left"></i>
            </p>
        </a>
        <ul class="nav nav-treeview">
            <li class="nav-item">
                <a href="support.html" class="nav-link">
                    <i class="fas fa-ticket-alt nav-icon"></i>
                    <p>Технічна підтримка</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="notifications.html" class="nav-link">
                    <i class="fas fa-bell nav-icon"></i>
                    <p>Сповіщення</p>
                </a>
            </li>
        </ul>
    </li>

    <!-- AI Assistant -->
    <li class="nav-item">
        <a href="/pages/ai-assistant-universal.html" class="nav-link">
            <i class="nav-icon fas fa-robot"></i>
            <p>AI Асистент</p>
        </a>
    </li>

    <!-- Documents Menu -->
    <li class="nav-item">
        <a href="#" class="nav-link">
            <i class="nav-icon fas fa-file-alt"></i>
            <p>
                Документи
                <i class="right fas fa-angle-left"></i>
            </p>
        </a>
        <ul class="nav nav-treeview">
            <li class="nav-item">
                <a href="email-template.html" class="nav-link">
                    <i class="fas fa-envelope nav-icon"></i>
                    <p>Шаблони Email</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="invoice-template.html" class="nav-link">
                    <i class="fas fa-file-invoice nav-icon"></i>
                    <p>Шаблони рахунків</p>
                </a>
            </li>
        </ul>
    </li>

    <!-- Settings -->
    <li class="nav-item">
        <a href="settings.html" class="nav-link">
            <i class="nav-icon fas fa-cog"></i>
            <p>Налаштування</p>
        </a>
    </li>

    <!-- Profile -->
    <li class="nav-item">
        <a href="profile.html" class="nav-link">
            <i class="nav-icon fas fa-user"></i>
            <p>Профіль</p>
        </a>
    </li>
</ul>
```

---

## 2. TECH ROLE ANALYSIS

### Statistics
- **Total files with sidebars:** 15 out of 18 HTML files
- **Files with issues:** 9 (60%)

### Most Common Menu Items
| Item | Frequency | Percentage |
|------|-----------|------------|
| Розклад | 12 | 80% |
| Завдання | 11 | 73% |
| Інструменти | 11 | 73% |
| База знань | 11 | 73% |
| Головна | 10 | 67% |
| AR помічник | 8 | 53% |
| Звіти | 8 | 53% |
| Огляди/Інспекції | 5 | 33% |
| Підтримка | 5 | 33% |

### Files with Sidebar Issues

**Minimal/Incomplete Sidebars:**
1. `ai-assistant.html` - Only 6 items, missing Інструменти, База знань, Завдання
2. `dashboard.html` - Only 5 items, missing Інструменти, База знань, Завдання
3. `ar-helper.html` - Only 6 items, missing Звіти
4. `checklists.html` - Only 6 items, missing AR помічник, Звіти
5. `manuals.html` - Only 6 items, missing AR помічник, Звіти
6. `qr-scanner.html` - Only 6 items, different structure
7. `manutencao.html` - Only 7 items
8. `videos.html` - Only 6 items

### Path Consistency Issues

**Inconsistent paths found for 3 menu items:**

1. **Дашборд**
   - 2x: `dashboard.html` (relative)
   - 1x: `/pages/tech/dashboard.html` (absolute)

2. **Звіти**
   - 7x: `reports.html` (relative)
   - 1x: `../../pages/tech/reports.html` (parent relative)

3. **Ліфти**
   - 1x: `lifts.html` (relative)
   - 1x: `../../pages/tech/lifts.html` (parent relative)

### Recommended Canonical Tech Sidebar

```html
<ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
    <!-- Dashboard -->
    <li class="nav-item">
        <a href="dashboard.html" class="nav-link">
            <i class="nav-icon fas fa-tachometer-alt"></i>
            <p>Головна</p>
        </a>
    </li>

    <!-- Tasks -->
    <li class="nav-item">
        <a href="tasks.html" class="nav-link">
            <i class="nav-icon fas fa-tasks"></i>
            <p>Завдання</p>
        </a>
    </li>

    <!-- Schedule -->
    <li class="nav-item">
        <a href="schedule.html" class="nav-link">
            <i class="nav-icon fas fa-calendar-alt"></i>
            <p>Розклад</p>
        </a>
    </li>

    <!-- Inspections -->
    <li class="nav-item">
        <a href="inspections.html" class="nav-link">
            <i class="nav-icon fas fa-clipboard-check"></i>
            <p>Огляди</p>
        </a>
    </li>

    <!-- AR Helper -->
    <li class="nav-item">
        <a href="ar-helper.html" class="nav-link">
            <i class="nav-icon fas fa-cube"></i>
            <p>AR помічник</p>
        </a>
    </li>

    <!-- Tools -->
    <li class="nav-item">
        <a href="tools.html" class="nav-link">
            <i class="nav-icon fas fa-tools"></i>
            <p>Інструменти</p>
        </a>
    </li>

    <!-- Reports -->
    <li class="nav-item">
        <a href="reports.html" class="nav-link">
            <i class="nav-icon fas fa-chart-bar"></i>
            <p>Звіти</p>
        </a>
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
                <a href="knowledge-base.html" class="nav-link">
                    <i class="far fa-circle nav-icon"></i>
                    <p>Статті</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="manuals.html" class="nav-link">
                    <i class="far fa-circle nav-icon"></i>
                    <p>Посібники</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="videos.html" class="nav-link">
                    <i class="far fa-circle nav-icon"></i>
                    <p>Відео</p>
                </a>
            </li>
            <li class="nav-item">
                <a href="checklists.html" class="nav-link">
                    <i class="far fa-circle nav-icon"></i>
                    <p>Чек-листи</p>
                </a>
            </li>
        </ul>
    </li>

    <!-- QR Scanner -->
    <li class="nav-item">
        <a href="qr-scanner.html" class="nav-link">
            <i class="nav-icon fas fa-qrcode"></i>
            <p>QR Сканер</p>
        </a>
    </li>

    <!-- AI Assistant -->
    <li class="nav-item">
        <a href="/pages/ai-assistant-universal.html" class="nav-link">
            <i class="nav-icon fas fa-robot"></i>
            <p>AI Асистент</p>
        </a>
    </li>

    <!-- Support -->
    <li class="nav-item">
        <a href="support.html" class="nav-link">
            <i class="nav-icon fas fa-headset"></i>
            <p>Підтримка</p>
        </a>
    </li>

    <!-- Profile -->
    <li class="nav-item">
        <a href="profile.html" class="nav-link">
            <i class="nav-icon fas fa-user"></i>
            <p>Профіль</p>
        </a>
    </li>
</ul>
```

---

## 3. DISPATCHER ROLE ANALYSIS

### Statistics
- **Total files with sidebars:** 9 out of 13 HTML files
- **Files with issues:** 6 (67%)

### Most Common Menu Items
| Item | Frequency | Percentage |
|------|-----------|------------|
| Звіти | 8 | 89% |
| Призначення | 7 | 78% |
| Моніторинг | 7 | 78% |
| Техніки | 7 | 78% |
| Головна панель | 6 | 67% |
| Налаштування | 5 | 56% |
| Клієнти | 4 | 44% |
| AI Асистент | 2 | 22% |

### Files with Sidebar Issues

1. `ai-assistant.html` - Only 6 items, missing Головна панель, Призначення, Техніки
2. `assignments.html` - Missing Налаштування
3. `clients.html` - Missing Головна панель
4. `monitoring.html` - Missing Налаштування
5. `qr-management.html` - Missing Головна панель, Призначення, Техніки
6. `reports.html` - Missing Налаштування

### Path Consistency Issues

**Inconsistent paths found for 3 menu items:**

1. **Звіти**
   - 7x: `reports.html` (relative)
   - 1x: `../../pages/dispatcher/reports.html` (parent relative)

2. **Дашборд**
   - 1x: `dashboard.html` (relative)
   - 1x: `/pages/dispatcher/dashboard.html` (absolute)

3. **Ліфти**
   - 1x: `lifts.html` (relative)
   - 1x: `../../pages/dispatcher/lifts.html` (parent relative)

### Recommended Canonical Dispatcher Sidebar

```html
<ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
    <!-- Dashboard -->
    <li class="nav-item">
        <a href="dashboard.html" class="nav-link">
            <i class="nav-icon fas fa-tachometer-alt"></i>
            <p>Головна панель</p>
        </a>
    </li>

    <!-- Assignments -->
    <li class="nav-item">
        <a href="assignments.html" class="nav-link">
            <i class="nav-icon fas fa-tasks"></i>
            <p>Призначення</p>
        </a>
    </li>

    <!-- Monitoring -->
    <li class="nav-item">
        <a href="monitoring.html" class="nav-link">
            <i class="nav-icon fas fa-desktop"></i>
            <p>Моніторинг</p>
        </a>
    </li>

    <!-- Reports -->
    <li class="nav-item">
        <a href="reports.html" class="nav-link">
            <i class="nav-icon fas fa-chart-bar"></i>
            <p>Звіти</p>
        </a>
    </li>

    <!-- Technicians -->
    <li class="nav-item">
        <a href="technicians.html" class="nav-link">
            <i class="nav-icon fas fa-users"></i>
            <p>Техніки</p>
        </a>
    </li>

    <!-- Clients -->
    <li class="nav-item">
        <a href="clients.html" class="nav-link">
            <i class="nav-icon fas fa-building"></i>
            <p>Клієнти</p>
        </a>
    </li>

    <!-- Calendar -->
    <li class="nav-item">
        <a href="calendar.html" class="nav-link">
            <i class="nav-icon fas fa-calendar-alt"></i>
            <p>Календар</p>
        </a>
    </li>

    <!-- QR System Menu -->
    <li class="nav-item">
        <a href="#" class="nav-link">
            <i class="nav-icon fas fa-qrcode"></i>
            <p>
                QR Система
                <i class="right fas fa-angle-left"></i>
            </p>
        </a>
        <ul class="nav nav-treeview">
            <li class="nav-item">
                <a href="qr-management.html" class="nav-link">
                    <i class="far fa-circle nav-icon"></i>
                    <p>Управління QR-кодами</p>
                </a>
            </li>
        </ul>
    </li>

    <!-- AI Assistant -->
    <li class="nav-item">
        <a href="/pages/ai-assistant-universal.html" class="nav-link">
            <i class="nav-icon fas fa-robot"></i>
            <p>AI Асистент</p>
        </a>
    </li>

    <!-- Notifications -->
    <li class="nav-item">
        <a href="notifications.html" class="nav-link">
            <i class="nav-icon fas fa-bell"></i>
            <p>Сповіщення</p>
        </a>
    </li>

    <!-- Settings -->
    <li class="nav-item">
        <a href="settings.html" class="nav-link">
            <i class="nav-icon fas fa-cog"></i>
            <p>Налаштування</p>
        </a>
    </li>

    <!-- Profile -->
    <li class="nav-item">
        <a href="profile.html" class="nav-link">
            <i class="nav-icon fas fa-user"></i>
            <p>Профіль</p>
        </a>
    </li>
</ul>
```

---

## 4. CLIENT ROLE ANALYSIS

### Statistics
- **Total files with sidebars:** 11 out of 12 HTML files
- **Files with issues:** 4 (36%)
- **Best consistency among all roles!**

### Most Common Menu Items
| Item | Frequency | Percentage |
|------|-----------|------------|
| Мої ліфти | 9 | 82% |
| Рахунки | 9 | 82% |
| Історія | 9 | 82% |
| Підтримка | 9 | 82% |
| Мої заявки | 8 | 73% |
| Сповіщення | 8 | 73% |
| Профіль | 8 | 73% |
| Головна/Дашборд | 7 | 64% |
| AI Асистент | 2 | 18% |

### Files with Sidebar Issues

1. `ai-assistant.html` - Only 6 items, missing Рахунки, Історія, Профіль
2. `ai-predictions.html` - Only 6 items, missing Сповіщення, Головна, Мої заявки
3. `dashboard.html` - Missing Головна (has 10 items but uses different text)
4. `documentation.html` - Only 4 items, missing Рахунки, Історія, Профіль

### Path Consistency Issues

**None!** All client role paths are consistent (all use absolute paths starting with `/pages/client/`)

### Recommended Canonical Client Sidebar

```html
<ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
    <!-- Dashboard -->
    <li class="nav-item">
        <a href="/pages/client/dashboard.html" class="nav-link">
            <i class="nav-icon fas fa-tachometer-alt"></i>
            <p>Дашборд</p>
        </a>
    </li>

    <!-- My Lifts -->
    <li class="nav-item">
        <a href="/pages/client/my-lifts.html" class="nav-link">
            <i class="nav-icon fas fa-elevator"></i>
            <p>Мої ліфти</p>
        </a>
    </li>

    <!-- AI Predictions -->
    <li class="nav-item">
        <a href="/pages/client/ai-predictions.html" class="nav-link">
            <i class="nav-icon fas fa-brain"></i>
            <p>AI Прогнозування</p>
        </a>
    </li>

    <!-- Requests -->
    <li class="nav-item">
        <a href="/pages/client/requests.html" class="nav-link">
            <i class="nav-icon fas fa-tasks"></i>
            <p>Мої заявки</p>
        </a>
    </li>

    <!-- Invoices -->
    <li class="nav-item">
        <a href="/pages/client/invoices.html" class="nav-link">
            <i class="nav-icon fas fa-file-invoice"></i>
            <p>Рахунки</p>
        </a>
    </li>

    <!-- History -->
    <li class="nav-item">
        <a href="/pages/client/history.html" class="nav-link">
            <i class="nav-icon fas fa-history"></i>
            <p>Історія</p>
        </a>
    </li>

    <!-- Documentation -->
    <li class="nav-item">
        <a href="/pages/client/documentation.html" class="nav-link">
            <i class="nav-icon fas fa-book"></i>
            <p>Документація</p>
        </a>
    </li>

    <!-- AI Assistant -->
    <li class="nav-item">
        <a href="/pages/ai-assistant-universal.html" class="nav-link">
            <i class="nav-icon fas fa-robot"></i>
            <p>AI Асистент</p>
        </a>
    </li>

    <!-- Notifications -->
    <li class="nav-item">
        <a href="/pages/client/notifications.html" class="nav-link">
            <i class="nav-icon fas fa-bell"></i>
            <p>Сповіщення</p>
        </a>
    </li>

    <!-- Support -->
    <li class="nav-item">
        <a href="/pages/client/support.html" class="nav-link">
            <i class="nav-icon fas fa-headset"></i>
            <p>Підтримка</p>
        </a>
    </li>

    <!-- Profile -->
    <li class="nav-item">
        <a href="/pages/client/profile.html" class="nav-link">
            <i class="nav-icon fas fa-user"></i>
            <p>Профіль</p>
        </a>
    </li>

    <!-- Settings -->
    <li class="nav-item">
        <a href="/pages/client/settings.html" class="nav-link">
            <i class="nav-icon fas fa-cog"></i>
            <p>Налаштування</p>
        </a>
    </li>
</ul>
```

---

## 5. SUMMARY AND RECOMMENDATIONS

### Overall Statistics

| Role | Total Files | Files with Sidebars | Files with Issues | Issue Rate |
|------|-------------|---------------------|-------------------|------------|
| Admin | 33 | 24 (73%) | 13 | 54% |
| Tech | 18 | 15 (83%) | 9 | 60% |
| Dispatcher | 13 | 9 (69%) | 6 | 67% |
| Client | 12 | 11 (92%) | 4 | 36% |
| **TOTAL** | **76** | **59 (78%)** | **32** | **54%** |

### Key Findings

1. **Client role has the best consistency** (36% issue rate, all paths consistent)
2. **Dispatcher role has the most issues** (67% issue rate)
3. **Path inconsistencies are prevalent in Admin and Tech roles**
4. **32 files (54%) need sidebar fixes**

### Critical Path Issues

**Admin Role:**
- Mix of relative (`admin-dashboard.html`) and absolute (`/pages/admin/admin-dashboard.html`) paths
- Two different AI Assistant paths: `/pages/ai-assistant-universal.html` vs `/pages/admin/ai-assistant-full.html`
- Analytics accessed via two different pages: `unified-analytics.html` vs `analytics.html`

**Tech Role:**
- Some files use parent relative paths (`../../pages/tech/reports.html`)
- Inconsistent QR scanner paths

**Dispatcher Role:**
- Similar parent relative path issues

### Recommended Actions

#### Priority 1: Fix Minimal Sidebars (High Priority)
Files with < 5 menu items should be updated immediately:
- `pages/admin/notifications.html` (1 item)
- `pages/admin/settings.html` (1 item)
- `pages/admin/orcamentos-list.html` (3 items)
- `pages/client/documentation.html` (4 items)

#### Priority 2: Standardize Paths (Medium Priority)
- **Admin:** Use relative paths for same-folder files (`admin-dashboard.html` not `/pages/admin/admin-dashboard.html`)
- **Tech:** Remove parent relative paths (`../../pages/tech/`)
- **Dispatcher:** Remove parent relative paths
- **All:** Use absolute path `/pages/ai-assistant-universal.html` for AI Assistant

#### Priority 3: Add Missing Common Items (Medium Priority)
- Add missing menu items to files based on canonical structures above
- Ensure all files have at least 8-10 core menu items

#### Priority 4: Consolidate Analytics (Low Priority - Admin only)
- Decide on single analytics page: `unified-analytics.html` (recommended)
- Update all references consistently

### Files Requiring Immediate Attention

**Admin (13 files):**
```
analytics-dashboard.html
inspection-template.html  
invoice-template.html
orcamentos-list.html
notifications.html
settings.html
predictive-maintenance.html
ai-assistant-full.html
email-template.html
lifts.html
reports.html
requests.html
qr-batch.html
```

**Tech (9 files):**
```
ai-assistant.html
dashboard.html
ar-helper.html
checklists.html
manuals.html
qr-scanner.html
manutencao.html
videos.html
tasks.html
```

**Dispatcher (6 files):**
```
ai-assistant.html
assignments.html
clients.html
monitoring.html
qr-management.html
reports.html
```

**Client (4 files):**
```
ai-assistant.html
ai-predictions.html
dashboard.html
documentation.html
```

---

## 6. IMPLEMENTATION GUIDE

### Step 1: Create Canonical Sidebar Components

Create reusable sidebar components for each role:
- `/components/sidebars/admin-sidebar.html`
- `/components/sidebars/tech-sidebar.html`
- `/components/sidebars/dispatcher-sidebar.html`
- `/components/sidebars/client-sidebar.html`

### Step 2: Batch Update Files

Use the canonical structures provided above to update files in batches:
1. Start with minimal sidebar files (Priority 1)
2. Fix path inconsistencies (Priority 2)
3. Add missing items (Priority 3)

### Step 3: Validation

After updates, validate:
- All menu items are accessible
- Paths work correctly
- Active states work on each page
- No broken links

### Step 4: Maintain Consistency

Going forward:
- Use canonical sidebar for all new pages
- Review sidebar in PR reviews
- Document any intentional deviations

---

## Appendix A: Complete File List by Role

### Admin Files (24 with sidebars / 33 total)
- admin-dashboard.html ✓
- ai-assistant-full.html ⚠️
- analytics-dashboard.html ⚠️
- analytics.html ✓
- email-template.html ⚠️
- inspection-template.html ⚠️
- invoice-template.html ⚠️
- lifts.html ⚠️
- maps.html ✓
- notifications.html ⚠️
- orcamentos-list.html ⚠️
- predictive-maintenance.html ⚠️
- profile.html ✓
- qr-analytics.html ✓
- qr-batch.html ⚠️
- qr-generator.html ✓
- qr-history.html ✓
- qr-management.html ✓
- reports.html ⚠️
- requests.html ⚠️
- settings.html ⚠️
- support.html ✓
- unified-analytics.html ✓
- users.html ✓

### Tech Files (15 with sidebars / 18 total)
- ai-assistant.html ⚠️
- ar-helper.html ⚠️
- checklists.html ⚠️
- dashboard.html ⚠️
- inspections.html ✓
- knowledge-base.html ✓
- manuals.html ⚠️
- manutencao.html ⚠️
- qr-scanner.html ⚠️
- reports.html ✓
- schedule.html ✓
- support.html ✓
- tasks.html ⚠️
- tools.html ✓
- videos.html ⚠️

### Dispatcher Files (9 with sidebars / 13 total)
- ai-assistant.html ⚠️
- assignments.html ⚠️
- clients.html ⚠️
- dashboard.html ✓
- monitoring.html ⚠️
- qr-management.html ⚠️
- reports.html ⚠️
- settings.html ✓
- technicians.html ✓

### Client Files (11 with sidebars / 12 total)
- ai-assistant.html ⚠️
- ai-predictions.html ⚠️
- dashboard.html ⚠️
- documentation.html ⚠️
- history.html ✓
- invoices.html ✓
- my-lifts.html ✓
- notifications.html ✓
- profile.html ✓
- requests.html ✓
- support.html ✓

Legend:
- ✓ = Sidebar is complete and consistent
- ⚠️ = Sidebar needs attention (missing items, inconsistent paths, or too minimal)

---

**End of Report**
