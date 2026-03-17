/**
 * Lifts Manager Module
 * Замінює глобальні змінні на модульну структуру
 */

const LiftsManager = (function() {
    'use strict';
    
    // Private state - НЕ доступний глобально
    const state = {
        currentLiftId: null,
        allLifts: [],
        map: null,
        markers: [],
        filters: {
            status: 'all',
            type: 'all',
            search: ''
        },
        modals: {
            enhanced: null,
            inspection: null,
            chat: null
        },
        user: null
    };
    
    // Конфігурація
    const config = {
        API_BASE_URL: window.API_BASE_URL || window.location.origin,
        MAP_CENTER: [38.7223, -9.1393], // Лісабон, Португалія
        MAP_ZOOM: 11,
        ITEMS_PER_PAGE: 10
    };
    
    // ===== API Calls =====
    
    async function apiCall(endpoint, method = 'GET', data = null) {
        if (!AuthManager?.isAuthenticated()) {
            console.warn('⚠️ Користувач не авторизований');
            AuthManager?.logout();
            throw new Error('Не авторизований');
        }
        
        try {
            const response = await AuthManager.fetchWithAuth(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : null
            });
            
            if (!response) {
                throw new Error('Помилка авторизації');
            }
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Помилка API');
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ API Error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    }
    
    // ===== State Getters/Setters =====
    
    function setCurrentLiftId(liftId) {
        state.currentLiftId = liftId;
        console.log('🔑 Current Lift ID set:', liftId);
    }
    
    function getCurrentLiftId() {
        return state.currentLiftId;
    }
    
    function setAllLifts(lifts) {
        state.allLifts = lifts;
    }
    
    function getAllLifts() {
        return state.allLifts;
    }
    
    function getLiftById(liftId) {
        return state.allLifts.find(l => (l.id || l._id) === liftId);
    }
    
    // ===== Role Checks =====
    
    function checkRole(allowedRoles) {
        if (!state.user) {
            state.user = AuthManager?.getCurrentUser();
        }
        
        if (!state.user || !allowedRoles.includes(state.user.role)) {
            showNotification('Недостатньо прав для цієї дії', 'error');
            return false;
        }
        return true;
    }
    
    function canEdit() {
        return checkRole(['admin', 'dispatcher']);
    }
    
    function canDelete() {
        return checkRole(['admin']);
    }
    
    // ===== CRUD Operations =====
    
    async function loadLifts() {
        try {
            const result = await apiCall('/api/lifts');
            const lifts = result.data || [];
            setAllLifts(lifts);
            return lifts;
        } catch (error) {
            console.error('Помилка завантаження ліфтів:', error);
            return [];
        }
    }
    
    async function createLift(liftData) {
        if (!canEdit()) return;
        
        try {
            const result = await apiCall('/api/lifts', 'POST', liftData);
            showNotification('Ліфт успішно створено', 'success');
            await loadLifts();
            return result.data;
        } catch (error) {
            console.error('Помилка створення ліфта:', error);
            throw error;
        }
    }
    
    async function updateLift(liftId, liftData) {
        if (!canEdit()) return;
        
        try {
            const result = await apiCall(`/api/lifts/${liftId}`, 'PUT', liftData);
            showNotification('Ліфт успішно оновлено', 'success');
            await loadLifts();
            return result.data;
        } catch (error) {
            console.error('Помилка оновлення ліфта:', error);
            throw error;
        }
    }
    
    async function deleteLift(liftId) {
        if (!canDelete()) return;
        
        if (!confirm('Ви впевнені, що хочете видалити цей ліфт?')) {
            return;
        }
        
        try {
            await apiCall(`/api/lifts/${liftId}`, 'DELETE');
            showNotification('Ліфт успішно видалено', 'success');
            await loadLifts();
        } catch (error) {
            console.error('Помилка видалення ліфта:', error);
        }
    }
    
    // ===== QR Code =====
    
    async function generateQR(liftId) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/api/lifts/${liftId}/qr?format=dataURL`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Помилка генерації QR коду');
            }
            
            const data = await response.json();
            return data.data.qrCode;
        } catch (error) {
            console.error('Помилка генерації QR:', error);
            showNotification('Не вдалося згенерувати QR код', 'error');
            throw error;
        }
    }
    
    // ===== Export =====
    
    async function exportToExcel(filters = {}) {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${config.API_BASE_URL}/api/lifts/export/excel?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Помилка експорту');
            }
            
            const blob = await response.blob();
            downloadFile(blob, `lifts-${Date.now()}.xlsx`);
            showNotification('Експорт завершено', 'success');
        } catch (error) {
            console.error('Помилка експорту:', error);
            showNotification('Не вдалося експортувати', 'error');
        }
    }
    
    // ===== Utilities =====
    
    function downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
    
    function sanitizeInput(input) {
        if (!input) return '';
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
    
    function showNotification(message, type = 'info') {
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            // Fallback alert
            if (type === 'error') {
                alert(message);
            }
        }
    }
    
    function showLoader() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.remove('d-none');
        }
    }
    
    function hideLoader() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.add('d-none');
        }
    }
    
    // ===== Statistics =====
    
    function updateStatistics() {
        const stats = {
            total: state.allLifts.length,
            operational: state.allLifts.filter(l => l.status === 'operational').length,
            maintenance: state.allLifts.filter(l => l.status === 'maintenance').length,
            broken: state.allLifts.filter(l => l.status === 'broken').length
        };
        
        const elements = {
            total: document.getElementById('totalLifts'),
            operational: document.getElementById('operationalLifts'),
            maintenance: document.getElementById('maintenanceLifts'),
            broken: document.getElementById('brokenLifts')
        };
        
        Object.keys(stats).forEach(key => {
            if (elements[key]) {
                elements[key].textContent = stats[key];
            }
        });
    }
    
    // ===== Initialization =====
    
    function init() {
        console.log('🚀 Initializing Lifts Manager...');
        
        // Завантажити користувача
        if (AuthManager) {
            state.user = AuthManager.getCurrentUser();
        }
        
        // Завантажити ліфти
        loadLifts().then(lifts => {
            console.log(`✅ Loaded ${lifts.length} lifts`);
            updateStatistics();
        });
        
        console.log('✅ Lifts Manager initialized');
    }
    
    // ===== Public API =====
    
    return {
        // Initialization
        init,
        
        // State management
        setCurrentLiftId,
        getCurrentLiftId,
        getAllLifts,
        getLiftById,
        
        // CRUD
        loadLifts,
        createLift,
        updateLift,
        deleteLift,
        
        // Features
        generateQR,
        exportToExcel,
        
        // Role checks
        canEdit,
        canDelete,
        checkRole,
        
        // Utilities
        sanitizeInput,
        showNotification,
        showLoader,
        hideLoader,
        updateStatistics,
        
        // API
        apiCall
    };
})();

// Export для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LiftsManager;
}

// Auto-init при завантаженні
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', LiftsManager.init);
} else {
    LiftsManager.init();
}
