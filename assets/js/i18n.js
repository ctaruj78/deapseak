/**
 * 🌍 Internationalization (i18n) Module
 * Система багатомовності для DeapSeaK
 * Підтримка: Українська, English, Português
 */

class I18n {
    constructor() {
        this.supportedLanguages = ['uk', 'en', 'pt'];
        this.fallbackLanguage = 'pt';
        this.translations = {};
        this.currentLanguage = this.getStoredLanguage() || this.detectLanguage();
        this.loadTranslations();
    }

    // Визначення мови браузера
    detectLanguage() {
        try {
            const browserLang = navigator.language || navigator.userLanguage || 'pt-PT';
            const langCode = browserLang.split('-')[0];
            return this.supportedLanguages.includes(langCode) ? langCode : 'pt';
        } catch (error) {
            console.warn('Error detecting language:', error);
            return 'pt';
        }
    }

    // Отримання збереженої мови
    getStoredLanguage() {
        const lang = localStorage.getItem('app_language');
        if (lang === 'uk') { localStorage.setItem('app_language', 'pt'); return 'pt'; }
        return lang;
    }

    // Збереження мови
    setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`Language ${lang} not supported, falling back to ${this.fallbackLanguage}`);
            lang = this.fallbackLanguage;
        }
        
        this.currentLanguage = lang;
        localStorage.setItem('app_language', lang);
        document.documentElement.setAttribute('lang', lang);
        
        // Відправляємо подію зміни мови
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
        
        // Оновлюємо сторінку
        this.updatePageContent();
    }

    // A carregar перекладів
    loadTranslations() {
        this.translations = {
            uk: {
                // Загальні
                app_name: 'DeapSeaK',
                welcome: 'Вітаємо',
                logout: 'Вийти',
                save: 'Guardar',
                cancel: 'Cancelar',
                delete: 'Eliminar',
                edit: 'Editar',
                add: 'Adicionar',
                search: 'Pesquisa',
                filter: 'Filtro',
                export: 'Exportar',
                import: 'Importar',
                back: 'Voltar',
                next: 'Seguinte',
                previous: 'Voltar',
                loading: 'A carregar...',
                error: 'Erro',
                success: 'Успішно',
                warning: 'Aviso',
                info: 'Інформація',
                
                // Навігація
                admin: 'Адміністратор',
                dashboard: 'Дашборд',
                lifts: 'Elevadores',
                requests: 'Pedidoи',
                users: 'Utilizadorі',
                analytics: 'Análise',
                settings: 'Definições',
                profile: 'Профіль',
                // QR
                qr_system: 'QR Система',
                qr_management: 'Управління QR',
                qr_analytics: 'Аналітика QR',
                qr_history: 'Історія QR',
                // Ліфти
                lift_management: 'Управління ліфтами',
                service_requests: 'Заявки на обслуговування',
                lift_map: 'Карта ліфтів',
                // Документи
                documents: 'Документи',
                invoices: 'Створити пропозицію',
                orcamentos_list: 'Список пропозицій',
                email_tmpl: 'Шаблони Email',
                inspections: 'Інспекції',
                report_templates: 'Шаблони звітів',
                // Аналітика
                unified_analytics: 'Unified Analytics',
                ai_prediction: 'Predictive Maintenance',
                reports: 'Звіти',
                // AI та підтримка
                ai_assistant: 'Асистент ШІ',
                support: 'Підтримка',
                tech_support: 'Технічна підтримка',
                
                // Definições
                general_settings: 'Загальні налаштування',
                language: 'Мова',
                theme: 'Тема',
                notifications: 'Notificações',
                security: 'Безпека',
                privacy: 'Приватність',
                appearance: 'Зовнішній вигляд',
                dark_mode: 'Темний режим',
                light_mode: 'Світлий режим',
                auto_mode: 'Автоматично',
                
                // Elevadores
                lift_number: 'Номер ліфта',
                lift_address: 'Endereço',
                lift_status: 'Estado',
                lift_type: 'Tipo de elevador',
                add_lift: 'Adicionar ліфт',
                edit_lift: 'Editar ліфт',
                
                // Pedidoи
                request_title: 'Nome запиту',
                request_description: 'Descrição',
                request_status: 'Estado запиту',
                request_priority: 'Prioridade',
                create_request: 'Створити запит',
                
                // Utilizadorі
                user_name: 'Ім\'я',
                user_email: 'Email',
                user_role: 'Função',
                user_phone: 'Telefone',
                
                // Ролі
                role_admin: 'Administrador',
                role_dispatcher: 'Dispatcher',
                role_technician: 'Técnico',
                role_client: 'Cliente',
                
                // Повідомлення
                email_notifications: 'Notificações por email',
                push_notifications: 'Push сповіщення',
                sms_notifications: 'Notificações por SMS',
                notification_new_request: 'Novo запит',
                notification_status_change: 'Зміна статусу',
                notification_assignment: 'Призначення',
            },
            
            en: {
                // General
                app_name: 'DeapSeaK',
                welcome: 'Welcome',
                logout: 'Logout',
                save: 'Save',
                cancel: 'Cancel',
                delete: 'Delete',
                edit: 'Edit',
                add: 'Add',
                search: 'Search',
                filter: 'Filter',
                export: 'Export',
                import: 'Import',
                back: 'Back',
                next: 'Next',
                previous: 'Previous',
                loading: 'Loading...',
                error: 'Error',
                success: 'Success',
                warning: 'Warning',
                info: 'Information',
                
                // Navigation
                admin: 'Administrator',
                dashboard: 'Dashboard',
                lifts: 'Lifts',
                requests: 'Requests',
                users: 'Users',
                analytics: 'Analytics',
                settings: 'Settings',
                profile: 'Profile',
                // QR
                qr_system: 'QR System',
                qr_management: 'QR Management',
                qr_analytics: 'QR Analytics',
                qr_history: 'QR History',
                // Lifts
                lift_management: 'Lift Management',
                service_requests: 'Service Requests',
                lift_map: 'Lift Map',
                // Documents
                documents: 'Documents',
                invoices: 'Create Quote',
                orcamentos_list: 'Quotes List',
                email_tmpl: 'Email Templates',
                inspections: 'Inspections',
                report_templates: 'Report Templates',
                // Analytics
                unified_analytics: 'Unified Analytics',
                ai_prediction: 'Predictive Maintenance',
                reports: 'Reports',
                // AI & Support
                ai_assistant: 'AI Assistant',
                support: 'Support',
                tech_support: 'Technical Support',
                
                // Settings
                general_settings: 'General Settings',
                language: 'Language',
                theme: 'Theme',
                notifications: 'Notifications',
                security: 'Security',
                privacy: 'Privacy',
                appearance: 'Appearance',
                dark_mode: 'Dark Mode',
                light_mode: 'Light Mode',
                auto_mode: 'Auto',
                
                // Lifts
                lift_number: 'Lift Number',
                lift_address: 'Address',
                lift_status: 'Status',
                lift_type: 'Lift Type',
                add_lift: 'Add Lift',
                edit_lift: 'Edit Lift',
                
                // Requests
                request_title: 'Request Title',
                request_description: 'Description',
                request_status: 'Request Status',
                request_priority: 'Priority',
                create_request: 'Create Request',
                
                // Users
                user_name: 'Name',
                user_email: 'Email',
                user_role: 'Role',
                user_phone: 'Phone',
                
                // Roles
                role_admin: 'Administrator',
                role_dispatcher: 'Dispatcher',
                role_technician: 'Technician',
                role_client: 'Client',
                
                // Messages
                email_notifications: 'Email Notifications',
                push_notifications: 'Push Notifications',
                sms_notifications: 'SMS Notifications',
                notification_new_request: 'New Request',
                notification_status_change: 'Status Change',
                notification_assignment: 'Assignment',
            },
            
            pt: {
                // Geral
                app_name: 'DeapSeaK',
                welcome: 'Bem-vindo',
                logout: 'Sair',
                save: 'Salvar',
                cancel: 'Cancelar',
                delete: 'Excluir',
                edit: 'Editar',
                add: 'Adicionar',
                search: 'Buscar',
                filter: 'Filtro',
                export: 'Exportar',
                import: 'Importar',
                back: 'Voltar',
                next: 'Próximo',
                previous: 'Anterior',
                loading: 'Carregando...',
                error: 'Erro',
                success: 'Sucesso',
                warning: 'Aviso',
                info: 'Informação',
                
                // Navegação
                admin: 'Administrador',
                dashboard: 'Painel',
                lifts: 'Elevadores',
                requests: 'Solicitações',
                users: 'Usuários',
                analytics: 'Análises',
                settings: 'Configurações',
                profile: 'Perfil',
                // QR
                qr_system: 'Sistema QR',
                qr_management: 'Gestão de QR-codes',
                qr_analytics: 'Análise de QR-codes',
                qr_history: 'Histórico de leituras',
                // Elevadores
                lift_management: 'Gestão de elevadores',
                service_requests: 'Pedidos de manutenção',
                lift_map: 'Mapa de elevadores',
                // Documentos
                documents: 'Documentos',
                invoices: 'Criar Orçamento',
                orcamentos_list: 'Lista de Orçamentos',
                email_tmpl: 'Modelos de Email',
                inspections: 'Inspeções',
                report_templates: 'Modelos de relatórios',
                // Análise
                unified_analytics: 'Unified Analytics',
                ai_prediction: 'Predictive Maintenance',
                reports: 'Relatórios',
                // AI e Suporte
                ai_assistant: 'Assistente de IA',
                support: 'Suporte',
                tech_support: 'Suporte técnico',
                
                // Configurações
                general_settings: 'Configurações Gerais',
                language: 'Idioma',
                theme: 'Tema',
                notifications: 'Notificações',
                security: 'Segurança',
                privacy: 'Privacidade',
                appearance: 'Aparência',
                dark_mode: 'Modo Escuro',
                light_mode: 'Modo Claro',
                auto_mode: 'Automático',
                
                // Elevadores
                lift_number: 'Número do Elevador',
                lift_address: 'Endereço',
                lift_status: 'Status',
                lift_type: 'Tipo de Elevador',
                add_lift: 'Adicionar Elevador',
                edit_lift: 'Editar Elevador',
                
                // Solicitações
                request_title: 'Título da Solicitação',
                request_description: 'Descrição',
                request_status: 'Status da Solicitação',
                request_priority: 'Prioridade',
                create_request: 'Criar Solicitação',
                
                // Usuários
                user_name: 'Nome',
                user_email: 'Email',
                user_role: 'Função',
                user_phone: 'Telefone',
                
                // Funções
                role_admin: 'Administrador',
                role_dispatcher: 'Despachante',
                role_technician: 'Técnico',
                role_client: 'Cliente',
                
                // Mensagens
                email_notifications: 'Notificações por Email',
                push_notifications: 'Notificações Push',
                sms_notifications: 'Notificações SMS',
                notification_new_request: 'Nova Solicitação',
                notification_status_change: 'Mudança de Status',
                notification_assignment: 'Atribuição',
            }
        };
    }

    // Отримання перекладу
    t(key, params = {}) {
        const lang = this.currentLanguage;
        let translation = this.translations[lang]?.[key] || 
                         this.translations[this.fallbackLanguage]?.[key] || 
                         key;
        
        // Заміна параметрів
        Object.keys(params).forEach(param => {
            translation = translation.replace(`{${param}}`, params[param]);
        });
        
        return translation;
    }

    // Atualização контенту сторінки
    updatePageContent() {
        // Оновлюємо всі елементи з data-i18n атрибутом
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Оновлюємо title сторінки
        const titleKey = document.querySelector('[data-i18n-title]');
        if (titleKey) {
            document.title = this.t(titleKey.getAttribute('data-i18n-title'));
        }
    }

    // Отримання доступних мов
    getAvailableLanguages() {
        return [
            { code: 'uk', name: 'Українська', flag: '🇺🇦' },
            { code: 'en', name: 'English', flag: '🇬🇧' },
            { code: 'pt', name: 'Português', flag: '🇵🇹' }
        ];
    }

    // Отримання поточної мови
    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// Глобальний екземпляр
const i18n = new I18n();

// Exportar для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
}
