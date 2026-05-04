/**
 * Offline Storage Manager - IndexedDB wrapper
 * Зберігає заявки локально для offline доступу
 */

class OfflineStorage {
    constructor() {
        this.dbName = 'DeapSeakDB';
        this.dbVersion = 1;
        this.db = null;
    }

    /**
     * Ініціалізація IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store для заявок
                if (!db.objectStoreNames.contains('requests')) {
                    const requestStore = db.createObjectStore('requests', { keyPath: '_id' });
                    requestStore.createIndex('status', 'status', { unique: false });
                    requestStore.createIndex('priority', 'priority', { unique: false });
                    requestStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Store для ліфтів
                if (!db.objectStoreNames.contains('lifts')) {
                    const liftStore = db.createObjectStore('lifts', { keyPath: '_id' });
                    liftStore.createIndex('status', 'status', { unique: false });
                }

                // Store для синхронізації (queue)
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                }

                console.log('IndexedDB schema created');
            };
        });
    }

    /**
     * Guardar заявки
     */
    async saveRequests(requests) {
        if (!this.db) await this.init();

        const transaction = this.db.transaction(['requests'], 'readwrite');
        const store = transaction.objectStore('requests');

        for (const request of requests) {
            await store.put(request);
        }

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Отримати всі заявки
     */
    async getRequests(filter = {}) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['requests'], 'readonly');
            const store = transaction.objectStore('requests');
            const request = store.getAll();

            request.onsuccess = () => {
                let results = request.result;

                // Filtroація
                if (filter.status) {
                    results = results.filter(r => r.status === filter.status);
                }
                if (filter.priority) {
                    results = results.filter(r => r.priority === filter.priority);
                }

                resolve(results);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Отримати заявку по ID
     */
    async getRequest(id) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['requests'], 'readonly');
            const store = transaction.objectStore('requests');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Adicionar заявку в чергу синхронізації
     */
    async addToSyncQueue(action, data) {
        if (!this.db) await this.init();

        const syncItem = {
            action, // 'create', 'update', 'delete'
            data,
            timestamp: Date.now(),
            synced: false
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.add(syncItem);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Отримати чергу синхронізації
     */
    async getSyncQueue() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result.filter(item => !item.synced));
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Позначити елемент як синхронізований
     */
    async markSynced(id) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Синхронізація з сервером
     */
    async sync(apiBaseUrl, token) {
        const queue = await this.getSyncQueue();
        console.log(`Syncing ${queue.length} items...`);

        for (const item of queue) {
            try {
                let endpoint, method;

                switch (item.action) {
                    case 'create':
                        endpoint = `${apiBaseUrl}/api/requests`;
                        method = 'POST';
                        break;
                    case 'update':
                        endpoint = `${apiBaseUrl}/api/requests/${item.data._id}`;
                        method = 'PUT';
                        break;
                    case 'delete':
                        endpoint = `${apiBaseUrl}/api/requests/${item.data._id}`;
                        method = 'DELETE';
                        break;
                }

                const response = await fetch(endpoint, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: method !== 'DELETE' ? JSON.stringify(item.data) : undefined
                });

                if (response.ok) {
                    await this.markSynced(item.id);
                    console.log(`Synced item ${item.id}`);
                }
            } catch (error) {
                console.error('Sync error for item', item.id, error);
            }
        }

        console.log('Sync completed');
    }

    /**
     * Очистити всі дані
     */
    async clear() {
        if (!this.db) await this.init();

        const stores = ['requests', 'lifts', 'syncQueue'];
        
        for (const storeName of stores) {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            await store.clear();
        }

        console.log('IndexedDB cleared');
    }
}

// Глобальний екземпляр
const offlineStorage = new OfflineStorage();

// Авто-ініціалізація
if (typeof window !== 'undefined') {
    offlineStorage.init().catch(console.error);

    // Авто-синхронізація при відновленні з'єднання
    window.addEventListener('online', async () => {
        const token = localStorage.getItem('token');
        const apiUrl = localStorage.getItem('API_BASE_URL') || window.location.origin;
        
        if (token) {
            try {
                await offlineStorage.sync(apiUrl, token);
                console.log('Auto-sync completed');
            } catch (error) {
                console.error('Auto-sync failed:', error);
            }
        }
    });
}
