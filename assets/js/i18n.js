/**
 * 🌍 Internationalization (i18n) Module
 * Система багатомовності для DeapSeaK
 * Підтримка: Українська, English, Português
 */

class I18n {
    constructor() {
        this.currentLanguage = this.getStoredLanguage() || this.detectLanguage();
        this.translations = {};
        this.fallbackLanguage = 'uk';
        this.supportedLanguages = ['uk', 'en', 'pt'];
        this.loadTranslations();
    }

    // Визначення мови браузера
    detectLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0];
        return this.supportedLanguages.includes(langCode) ? langCode : 'uk';
    }

    // Отримання збереженої мови
    getStoredLanguage() {
        return localStorage.getItem('app_language');
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

    // Завантаження перекладів
    loadTranslations() {
        this.translations = {
            uk: {
                // Загальні
                app_name: 'DeapSeaK',
                welcome: 'Вітаємо',
                logout: 'Вийти',
                save: 'Зберегти',
                cancel: 'Скасувати',
                delete: 'Видалити',
                edit: 'Редагувати',
                add: 'Додати',
                search: 'Пошук',
                filter: 'Фільтр',
                export: 'Експорт',
                import: 'Імпорт',
                back: 'Назад',
                next: 'Далі',
                previous: 'Назад',
                loading: 'Завантаження...',
                error: 'Помилка',
                success: 'Успішно',
                warning: 'Попередження',
                info: 'Інформація',
                
                // Навігація
                dashboard: 'Дашборд',
                lifts: 'Ліфти',
                requests: 'Запити',
                users: 'Користувачі',
                analytics: 'Аналітика',
                settings: 'Налаштування',
                profile: 'Профіль',
                
                // Налаштування
                general_settings: 'Загальні налаштування',
                language: 'Мова',
                theme: 'Тема',
                notifications: 'Сповіщення',
                security: 'Безпека',
                privacy: 'Приватність',
                appearance: 'Зовнішній вигляд',
                dark_mode: 'Темний режим',
                light_mode: 'Світлий режим',
                auto_mode: 'Автоматично',
                
                // Ліфти
                lift_number: 'Номер ліфта',
                lift_address: 'Адреса',
                lift_status: 'Статус',
                lift_type: 'Тип ліфта',
                add_lift: 'Додати ліфт',
                edit_lift: 'Редагувати ліфт',
                
                // Запити
                request_title: 'Назва запиту',
                request_description: 'Опис',
                request_status: 'Статус запиту',
                request_priority: 'Пріоритет',
                create_request: 'Створити запит',
                
                // Користувачі
                user_name: 'Ім\'я',
                user_email: 'Email',
                user_role: 'Роль',
                user_phone: 'Телефон',
                
                // Ролі
                role_admin: 'Адміністратор',
                role_dispatcher: 'Диспетчер',
                role_technician: 'Технік',
                role_client: 'Клієнт',
                
                // Повідомлення
                email_notifications: 'Email сповіщення',
                push_notifications: 'Push сповіщення',
                sms_notifications: 'SMS сповіщення',
                notification_new_request: 'Новий запит',
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
                dashboard: 'Dashboard',
                lifts: 'Lifts',
                requests: 'Requests',
                users: 'Users',
                analytics: 'Analytics',
                settings: 'Settings',
                profile: 'Profile',
                
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
                dashboard: 'Painel',
                lifts: 'Elevadores',
                requests: 'Solicitações',
                users: 'Usuários',
                analytics: 'Análises',
                settings: 'Configurações',
                profile: 'Perfil',
                
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

    // Оновлення контенту сторінки
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

// Експорт для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
}
