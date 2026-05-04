class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.pendingActions = [];
        this.syncQueue = [];
        this.init();
    }

    async init() {
        this.setupOnlineOfflineDetection();
        this.initServiceWorker();
        this.setupBackgroundSync();
        this.initCacheManagement();
        this.setupConflictResolution();
    }

    setupOnlineOfflineDetection() {
        window.addEventListener('online', () => {
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.handleOffline();
        });

        // Initial check
        this.isOnline = navigator.onLine;
        this.updateOnlineStatusUI();
    }

    async initServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                this.serviceWorker = registration;
                
                console.log('ServiceWorker registered successfully');
                this.setupServiceWorkerEvents(registration);

            } catch (error) {
                console.error('ServiceWorker registration failed:', error);
            }
        }
    }

    setupServiceWorkerEvents(registration) {
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                    this.showUpdateNotification();
                }
            });
        });
    }

    setupBackgroundSync() {
        if ('sync' in registration) {
            this.setupSyncEvents();
        }
    }

    async setupSyncEvents() {
        const registration = await navigator.serviceWorker.ready;
        
        registration.sync.register('pending-actions')
            .then(() => console.log('Background sync registered'))
            .catch(err => console.error('Background sync failed:', err));
    }

    initCacheManagement() {
        this.cacheVersion = 'v1';
        this.cacheList = [
            '/',
            '/assets/css/main.css',
            '/assets/js/main.js',
            '/manifest.json'
        ];

        this.setupCacheExpiration();
    }

    async setupCacheExpiration() {
        setInterval(() => {
            this.cleanupOldCaches();
        }, 24 * 60 * 60 * 1000); // Daily cleanup
    }

    async cleanupOldCaches() {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
            name.startsWith('liftapp-') && name !== `liftapp-${this.cacheVersion}`
        );

        await Promise.all(oldCaches.map(name => caches.delete(name)));
    }

    // Data Synchronization
    async syncData() {
        if (!this.isOnline) {
            console.log('Offline - queuing sync for later');
            this.queueSync();
            return;
        }

        try {
            await this.syncPendingActions();
            await this.syncLocalChanges();
            await this.pullServerUpdates();
            
            CommonUtils.showNotification('Dados sincronizados', 'success');

        } catch (error) {
            console.error('Sync failed:', error);
            this.queueSync();
        }
    }

    async syncPendingActions() {
        const actions = this.getPendingActions();
        
        for (const action of actions) {
            try {
                await this.executeAction(action);
                this.removePendingAction(action.id);
            } catch (error) {
                console.error('Failed to execute action:', action, error);
            }
        }
    }

    // Conflict Resolution
    setupConflictResolution() {
        this.conflictResolver = {
            strategies: {
                'last-write-wins': this.lastWriteWins.bind(this),
                'client-wins': this.clientWins.bind(this),
                'server-wins': this.serverWins.bind(this),
                'manual': this.manualResolution.bind(this)
            },
            defaultStrategy: 'last-write-wins'
        };
    }

    async resolveConflicts(conflicts) {
        for (const conflict of conflicts) {
            const strategy = this.getResolutionStrategy(conflict);
            await this.conflictResolver.strategies[strategy](conflict);
        }
    }

    lastWriteWins(conflict) {
        const clientTime = new Date(conflict.client.timestamp);
        const serverTime = new Date(conflict.server.timestamp);
        
        return clientTime > serverTime ? conflict.client : conflict.server;
    }

    // Offline Data Management
    async cacheEssentialData() {
        const user = authManager.currentUser;
        if (!user) return;

        const essentialData = {
            userProfile: user,
            assignedLifts: await db.getLifts({ technician: user.username }),
            pendingRequests: await db.getRequests({ technician: user.username }),
            recentDocuments: await this.getRecentDocuments()
        };

        await this.storeInCache('essential-data', essentialData);
    }

    async getCachedData(key) {
        try {
            const cached = await this.getFromCache(key);
            return cached || null;
        } catch (error) {
            console.error('Error getting cached data:', error);
            return null;
        }
    }

    // Background Tasks
    setupBackgroundTasks() {
        this.backgroundTasks = new Map();
        
        this.registerBackgroundTask('data-sync', () => this.syncData(), 300000); // 5 minutes
        this.registerBackgroundTask('cache-cleanup', () => this.cleanupCache(), 3600000); // 1 hour
        this.registerBackgroundTask('health-check', () => this.healthCheck(), 60000); // 1 minute
    }

    registerBackgroundTask(name, task, interval) {
        const taskId = setInterval(async () => {
            if (this.isOnline) {
                await task();
            }
        }, interval);

        this.backgroundTasks.set(name, taskId);
    }

    // Storage Management
    monitorStorageUsage() {
        setInterval(() => {
            this.checkStorageQuota();
        }, 300000); // 5 minutes
    }

    async checkStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usagePercent = (estimate.usage / estimate.quota) * 100;

            if (usagePercent > 90) {
                this.triggerStorageCleanup();
            }
        }
    }

    async triggerStorageCleanup() {
        // Clean up old data
        await this.cleanupOldData();
        await this.clearTempFiles();
        await this.compressDatabase();

        CommonUtils.showNotification('Espaço de armazenamento limpo', 'info');
    }

    // Error Handling & Recovery
    setupErrorRecovery() {
        this.errorHandlers = {
            'network-error': this.handleNetworkError.bind(this),
            'sync-error': this.handleSyncError.bind(this),
            'storage-error': this.handleStorageError.bind(this),
            'conflict-error': this.handleConflictError.bind(this)
        };
    }

    async handleNetworkError(error) {
        console.log('Network error - switching to offline mode');
        this.queueForRetry(error.operation);
        this.showOfflineNotification();
    }

    async handleSyncError(error) {
        console.log('Sync error - will retry later');
        this.queueSync();
        this.logSyncError(error);
    }

    // Performance Optimization
    optimizeOfflinePerformance() {
        this.setupDataCompression();
        this.initLazyLoading();
        this.setupPredictivePrefetching();
    }

    setupDataCompression() {
        this.compression = {
            compress: async (data) => {
                // Simple compression for text data
                if (typeof data === 'string') {
                    return data; // Would use compression algorithm
                }
                return data;
            },
            decompress: async (compressed) => {
                return compressed; // Would decompress
            }
        };
    }

    initLazyLoading() {
        // Setup intersection observer for lazy loading
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadDeferredContent(entry.target);
                }
            });
        });

        // Observe elements with data-src attribute
        document.querySelectorAll('[data-src]').forEach(el => {
            this.observer.observe(el);
        });
    }

    // User Experience
    updateOnlineStatusUI() {
        const statusElement = document.getElementById('online-status');
        if (statusElement) {
            statusElement.className = this.isOnline ? 'online' : 'offline';
            statusElement.title = this.isOnline ? 'Online' : 'Offline';
        }

        // Update UI based on connectivity
        this.toggleOfflineUI(!this.isOnline);
    }

    toggleOfflineUI(offline) {
        const elements = document.querySelectorAll('[data-online-only]');
        elements.forEach(el => {
            el.style.display = offline ? 'none' : '';
        });

        const offlineElements = document.querySelectorAll('[data-offline-only]');
        offlineElements.forEach(el => {
            el.style.display = offline ? '' : 'none';
        });
    }

    showOfflineNotification() {
        if (!this.isOnline) {
            CommonUtils.showNotification(
                'Está em modo offline. As alterações serão sincronizadas após restaurar a ligação.',
                'warning',
                5000
            );
        }
    }

    // Utility Methods
    async storeInCache(key, data) {
        try {
            const cache = await caches.open('liftapp-data');
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            await cache.put(key, new Response(blob));
        } catch (error) {
            console.error('Error storing in cache:', error);
        }
    }

    async getFromCache(key) {
        try {
            const cache = await caches.open('liftapp-data');
            const response = await cache.match(key);
            return response ? response.json() : null;
        } catch (error) {
            console.error('Error getting from cache:', error);
            return null;
        }
    }

    queueForRetry(operation) {
        this.pendingActions.push({
            id: Date.now(),
            operation,
            timestamp: new Date().toISOString(),
            retryCount: 0
        });
    }

    async retryPendingActions() {
        const actions = [...this.pendingActions];
        
        for (const action of actions) {
            if (action.retryCount < 3) { // Max 3 retries
                try {
                    await this.executeAction(action);
                    this.removePendingAction(action.id);
                } catch (error) {
                    action.retryCount++;
                    console.error(`Retry ${action.retryCount} failed:`, error);
                }
            } else {
                // Too many retries, give up
                this.removePendingAction(action.id);
                this.logFailedAction(action);
            }
        }
    }
}

// Initialize offline manager
document.addEventListener('DOMContentLoaded', function() {
    window.offlineManager = new OfflineManager();
});