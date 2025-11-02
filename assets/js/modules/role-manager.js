class RoleManager {
    constructor() {
        this.roles = {
            admin: {
                permissions: [
                    'users:create', 'users:read', 'users:update', 'users:delete',
                    'lifts:create', 'lifts:read', 'lifts:update', 'lifts:delete',
                    'requests:create', 'requests:read', 'requests:update', 'requests:delete',
                    'reports:generate', 'reports:view', 'reports:export',
                    'system:configure', 'system:backup', 'system:restore',
                    'financial:view', 'financial:manage',
                    'ai:full-access', 'calendar:full-access'
                ],
                uiElements: [
                    '#admin-menu', '#user-management', '#system-settings',
                    '#financial-reports', '#backup-section', '#ai-control-panel'
                ]
            },
            tech: {
                permissions: [
                    'lifts:read', 'lifts:update:assigned',
                    'requests:create', 'requests:read', 'requests:update:assigned',
                    'reports:generate:assigned', 'reports:view:assigned',
                    'calendar:view', 'calendar:edit:personal',
                    'ai:limited-access', 'ar:access'
                ],
                uiElements: [
                    '#tech-menu', '#my-tasks', '#schedule-view',
                    '#ar-helper', '#tech-reports'
                ],
                restrictions: [
                    '!users:*', '!financial:*', '!system:*'
                ]
            },
            client: {
                permissions: [
                    'lifts:read:owned', 
                    'requests:create', 'requests:read:owned', 'requests:update:owned',
                    'reports:view:owned',
                    'calendar:view:personal'
                ],
                uiElements: [
                    '#client-menu', '#my-lifts', '#my-requests',
                    '#billing-info', '#support-section'
                ],
                restrictions: [
                    '!users:*', '!lifts:create', '!lifts:delete',
                    '!financial:*', '!system:*', '!ai:*'
                ]
            },
            dispatcher: {
                permissions: [
                    'lifts:read', 'lifts:update',
                    'requests:create', 'requests:read', 'requests:update',
                    'reports:generate:operational', 'reports:view:operational',
                    'calendar:view', 'calendar:edit:operational',
                    'ai:limited-access'
                ],
                uiElements: [
                    '#dispatcher-menu', '#request-assignment', '#monitoring-dashboard',
                    '#operational-reports', '#dispatch-calendar'
                ],
                restrictions: [
                    '!users:*', '!financial:*', '!system:*'
                ]
            }
        };
        
        this.init();
    }

    init() {
        this.applyRoleBasedUI();
        this.setupPermissionChecking();
        this.logRoleActivity();
    }

    getCurrentUserRole() {
        return authManager.currentUser?.role || 'guest';
    }

    hasPermission(permission) {
        const role = this.getCurrentUserRole();
        const roleConfig = this.roles[role];
        
        if (!roleConfig) return false;

        // Check restrictions first
        if (roleConfig.restrictions) {
            for (const restriction of roleConfig.restrictions) {
                if (this.matchesPermission(restriction, permission)) {
                    return false;
                }
            }
        }

        // Check allowed permissions
        return roleConfig.permissions.some(allowedPermission => 
            this.matchesPermission(allowedPermission, permission)
        );
    }

    matchesPermission(pattern, permission) {
        if (pattern.startsWith('!')) {
            pattern = pattern.substring(1);
        }

        const patternParts = pattern.split(':');
        const permissionParts = permission.split(':');

        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i] === '*') continue;
            if (permissionParts[i] !== patternParts[i]) return false;
        }

        return true;
    }

    applyRoleBasedUI() {
        const role = this.getCurrentUserRole();
        const roleConfig = this.roles[role];
        
        if (!roleConfig) return;

        // Show/hide UI elements based on role
        roleConfig.uiElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el.style.display = 'block');
        });

        // Hide elements from other roles
        Object.keys(this.roles).forEach(otherRole => {
            if (otherRole !== role) {
                this.roles[otherRole].uiElements.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => el.style.display = 'none');
                });
            }
        });

        // Apply role-specific CSS class
        document.body.className = document.body.className.replace(/\brole-\w+/g, '');
        document.body.classList.add(`role-${role}`);
    }

    setupPermissionChecking() {
        // Intercept actions and check permissions
        const originalFetch = window.fetch;
        window.fetch = async (url, options) => {
            if (options && options.headers && options.headers['X-Required-Permission']) {
                const requiredPermission = options.headers['X-Required-Permission'];
                if (!this.hasPermission(requiredPermission)) {
                    throw new Error(`Permission denied: ${requiredPermission}`);
                }
            }
            return originalFetch(url, options);
        };

        // Add permission checking to button clicks
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-required-permission]');
            if (button) {
                const requiredPermission = button.dataset.requiredPermission;
                if (!this.hasPermission(requiredPermission)) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showPermissionDeniedMessage(requiredPermission);
                }
            }
        });
    }

    showPermissionDeniedMessage(permission) {
        CommonUtils.showNotification(
            `Недостатньо прав для виконання цієї дії. Потрібно дозвіл: ${permission}`,
            'error'
        );
    }

    logRoleActivity() {
        const user = authManager.currentUser;
        if (user) {
            // logger.log(`Користувач ${user.username} (${user.role}) увійшов у систему`);
            
            // Log role-specific activity
            setInterval(() => {
                this.logCurrentActivity();
            }, 300000); // Log every 5 minutes
        }
    }

    logCurrentActivity() {
        const activeElement = document.activeElement;
        const currentView = window.location.pathname;
        
        // logger.log(`Активність: ${currentView}, фокус на: ${activeElement.tagName}`);
    }

    // Role-specific data filtering
    async filterDataByRole(data, dataType) {
        const role = this.getCurrentUserRole();
        
        switch (dataType) {
            case 'users':
                return this.filterUsers(data, role);
            case 'lifts':
                return this.filterLifts(data, role);
            case 'requests':
                return this.filterRequests(data, role);
            case 'reports':
                return this.filterReports(data, role);
            default:
                return data;
        }
    }

    filterUsers(users, role) {
        if (role === 'admin') {
            return users; // Admins see all users
        } else if (role === 'tech') {
            return users.filter(user => 
                user.role === 'tech' || user.role === 'dispatcher'
            );
        }
        return []; // Others don't see users
    }

    filterLifts(lifts, role) {
        const user = authManager.currentUser;
        
        if (role === 'admin' || role === 'dispatcher') {
            return lifts; // See all lifts
        } else if (role === 'tech') {
            return lifts.filter(lift => 
                lift.technician === user.username
            );
        } else if (role === 'client') {
            return lifts.filter(lift => 
                lift.client === user.username
            );
        }
        return [];
    }

    filterRequests(requests, role) {
        const user = authManager.currentUser;
        
        if (role === 'admin' || role === 'dispatcher') {
            return requests; // See all requests
        } else if (role === 'tech') {
            return requests.filter(request => 
                request.assignedTo === user.username
            );
        } else if (role === 'client') {
            return requests.filter(request => 
                request.client === user.username
            );
        }
        return [];
    }

    // Role-based feature access
    getAvailableFeatures() {
        const role = this.getCurrentUserRole();
        const features = {
            aiAssistant: this.hasPermission('ai:full-access') || this.hasPermission('ai:limited-access'),
            arHelper: this.hasPermission('ar:access'),
            calendar: this.hasPermission('calendar:view'),
            reports: this.hasPermission('reports:view'),
            financial: this.hasPermission('financial:view'),
            export: this.hasPermission('reports:export')
        };

        return features;
    }

    // Role-based limits
    getLimits() {
        const role = this.getCurrentUserRole();
        const limits = {
            maxRequestsPerDay: role === 'client' ? 5 : Infinity,
            maxExportRows: role === 'admin' ? 10000 : role === 'dispatcher' ? 1000 : 100,
            canDelete: role === 'admin',
            canConfigureSystem: role === 'admin'
        };

        return limits;
    }

    // Audit logging for sensitive operations
    async logSensitiveOperation(operation, details) {
        const user = authManager.currentUser;
        const logEntry = {
            timestamp: new Date().toISOString(),
            user: user.username,
            role: user.role,
            operation,
            details,
            ip: await this.getClientIP()
        };

        // Save to audit log
        const auditLog = JSON.parse(localStorage.getItem('audit_log') || '[]');
        auditLog.push(logEntry);
        localStorage.setItem('audit_log', JSON.stringify(auditLog));

        // logger.log('Audit log:', logEntry);
    }

    async getClientIP() {
        // This would be implemented with a proper IP detection service
        return '127.0.0.1'; // Placeholder
    }
}

// Initialize role manager
document.addEventListener('DOMContentLoaded', function() {
    window.roleManager = new RoleManager();
});