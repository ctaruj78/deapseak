class StorageManager {
    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Помилка збереження даних:', error);
            this.handleStorageError(error, key, data);
            return false;
        }
    }

    static load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Помилка завантаження даних:', error);
            return null;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Помилка видалення даних:', error);
            return false;
        }
    }

    static clearAll() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Помилка очищення сховища:', error);
            return false;
        }
    }

    static getAllKeys() {
        try {
            return Object.keys(localStorage);
        } catch (error) {
            console.error('Помилка отримання ключів:', error);
            return [];
        }
    }

    static getSize() {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length * 2; // UTF-16
                }
            }
            return total;
        } catch (error) {
            console.error('Помилка розрахунку розміру:', error);
            return 0;
        }
    }

    static getSizeMB() {
        return (this.getSize() / (1024 * 1024)).toFixed(2);
    }

    static isAvailable() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    static handleStorageError(error, key, data) {
        // Автоматичне очищення при переповненні
        if (error.name === 'QuotaExceededError') {
            console.warn('Сховище переповнено. Спроба очищення...');
            this.clearOldData();
            
            // Повторна спроба збереження
            setTimeout(() => {
                this.save(key, data);
            }, 100);
        }
    }

    static clearOldData() {
        const keys = this.getAllKeys();
        const now = Date.now();
        
        // Видалення даних старших за 30 днів
        keys.forEach(key => {
            if (key.startsWith('temp_') || key.startsWith('cache_')) {
                const data = this.load(key);
                if (data && data.timestamp && (now - data.timestamp) > 30 * 24 * 60 * 60 * 1000) {
                    this.remove(key);
                }
            }
        });
    }

    static saveWithTimestamp(key, data, ttl = null) {
        const item = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        };
        return this.save(key, item);
    }

    static loadWithTimestamp(key) {
        const item = this.load(key);
        if (!item) return null;

        // Перевірка TTL (Time To Live)
        if (item.ttl && (Date.now() - item.timestamp) > item.ttl) {
            this.remove(key);
            return null;
        }

        return item.data;
    }

    static backupData() {
        const backup = {};
        const keys = this.getAllKeys();
        
        keys.forEach(key => {
            backup[key] = this.load(key);
        });

        return backup;
    }

    static restoreData(backup) {
        Object.keys(backup).forEach(key => {
            this.save(key, backup[key]);
        });
    }

    static encryptData(data, key = 'default-key') {
        // Просте шифрування (в продакшені використовуйте бібліотеки як CryptoJS)
        try {
            const json = JSON.stringify(data);
            return btoa(unescape(encodeURIComponent(json)));
        } catch (error) {
            console.error('Помилка шифрування:', error);
            return data;
        }
    }

    static decryptData(encryptedData, key = 'default-key') {
        try {
            const json = decodeURIComponent(escape(atob(encryptedData)));
            return JSON.parse(json);
        } catch (error) {
            console.error('Помилка дешифрування:', error);
            return encryptedData;
        }
    }

    static saveEncrypted(key, data, encryptionKey = 'default-key') {
        const encrypted = this.encryptData(data, encryptionKey);
        return this.save(key, encrypted);
    }

    static loadEncrypted(key, encryptionKey = 'default-key') {
        const encrypted = this.load(key);
        if (!encrypted) return null;
        
        return this.decryptData(encrypted, encryptionKey);
    }

    // Методи для роботи з кешем
    static setCache(key, data, ttl = 5 * 60 * 1000) { // 5 хвилин за замовчуванням
        return this.saveWithTimestamp(`cache_${key}`, data, ttl);
    }

    static getCache(key) {
        return this.loadWithTimestamp(`cache_${key}`);
    }

    static clearCache() {
        const keys = this.getAllKeys();
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                this.remove(key);
            }
        });
    }

    // Методи для тимчасових даних
    static setTemp(key, data, ttl = 60 * 1000) { // 1 хвилина за замовчуванням
        return this.saveWithTimestamp(`temp_${key}`, data, ttl);
    }

    static getTemp(key) {
        return this.loadWithTimestamp(`temp_${key}`);
    }

    // Статистика сховища
    static getStorageStats() {
        const keys = this.getAllKeys();
        const stats = {
            totalItems: keys.length,
            totalSize: this.getSizeMB() + ' MB',
            keys: keys,
            isAvailable: this.isAvailable()
        };

        // Групування за типами даних
        stats.byType = {
            user: keys.filter(k => k.includes('user')).length,
            lift: keys.filter(k => k.includes('lift')).length,
            request: keys.filter(k => k.includes('request')).length,
            cache: keys.filter(k => k.startsWith('cache_')).length,
            temp: keys.filter(k => k.startsWith('temp_')).length,
            other: keys.filter(k => !k.includes('user') && !k.includes('lift') && 
                                  !k.includes('request') && !k.startsWith('cache_') && 
                                  !k.startsWith('temp_')).length
        };

        return stats;
    }
}

// Додаємо глобальний об'єкт для відладки
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}