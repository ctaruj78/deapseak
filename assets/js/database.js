class DatabaseManager {
    constructor() {
        this.version = '1.0.0';
        this.init();
    }

    init() {
        this.setupAutoBackup();
        this.setupDataValidation();
    }

    // CRUD Operations for Users
    async getUsers(filters = {}) {
        try {
            let users = JSON.parse(localStorage.getItem('lm_users') || '[]');
            
            // Apply filters
            if (filters.role) {
                users = users.filter(user => user.role === filters.role);
            }
            if (filters.isActive !== undefined) {
                users = users.filter(user => user.isActive === filters.isActive);
            }
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                users = users.filter(user => 
                    user.username.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm) ||
                    user.firstName.toLowerCase().includes(searchTerm) ||
                    user.lastName.toLowerCase().includes(searchTerm)
                );
            }

            return users;
        } catch (error) {
            console.error('Error getting users:', error);
            throw new Error('Failed to retrieve users');
        }
    }

    async getUserById(id) {
        const users = await this.getUsers();
        return users.find(user => user.id === id);
    }

    async createUser(userData) {
        try {
            const users = await this.getUsers();
            const newUser = {
                id: this.generateId(),
                ...userData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true
            };

            users.push(newUser);
            await this.saveUsers(users);

            return newUser;
        } catch (error) {
            console.error('Error creating user:', error);
            throw new Error('Failed to create user');
        }
    }

    async updateUser(id, updates) {
        try {
            const users = await this.getUsers();
            const index = users.findIndex(user => user.id === id);
            
            if (index === -1) {
                throw new Error('User not found');
            }

            users[index] = {
                ...users[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            await this.saveUsers(users);
            return users[index];
        } catch (error) {
            console.error('Error updating user:', error);
            throw new Error('Failed to update user');
        }
    }

    async deleteUser(id) {
        try {
            const users = await this.getUsers();
            const filteredUsers = users.filter(user => user.id !== id);
            await this.saveUsers(filteredUsers);
        } catch (error) {
            console.error('Error deleting user:', error);
            throw new Error('Failed to delete user');
        }
    }

    // CRUD Operations for Lifts
    async getLifts(filters = {}) {
        try {
            let lifts = JSON.parse(localStorage.getItem('lm_lifts') || '[]');
            
            if (filters.status) {
                lifts = lifts.filter(lift => lift.status === filters.status);
            }
            if (filters.client) {
                lifts = lifts.filter(lift => lift.client === filters.client);
            }
            if (filters.technician) {
                lifts = lifts.filter(lift => lift.technician === filters.technician);
            }
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                lifts = lifts.filter(lift => 
                    lift.address.toLowerCase().includes(searchTerm) ||
                    lift.serialNumber.toLowerCase().includes(searchTerm) ||
                    lift.manufacturer.toLowerCase().includes(searchTerm)
                );
            }

            return lifts;
        } catch (error) {
            console.error('Error getting lifts:', error);
            throw new Error('Failed to retrieve lifts');
        }
    }

    async createLift(liftData) {
        try {
            const lifts = await this.getLifts();
            const newLift = {
                id: this.generateId(),
                ...liftData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            lifts.push(newLift);
            await this.saveLifts(lifts);

            return newLift;
        } catch (error) {
            console.error('Error creating lift:', error);
            throw new Error('Failed to create lift');
        }
    }

    // CRUD Operations for Requests
    async getRequests(filters = {}) {
        try {
            let requests = JSON.parse(localStorage.getItem('lm_requests') || '[]');
            
            if (filters.status) {
                requests = requests.filter(request => request.status === filters.status);
            }
            if (filters.priority) {
                requests = requests.filter(request => request.priority === filters.priority);
            }
            if (filters.technician) {
                requests = requests.filter(request => request.assignedTo === filters.technician);
            }

            return requests;
        } catch (error) {
            console.error('Error getting requests:', error);
            throw new Error('Failed to retrieve requests');
        }
    }

    async createRequest(requestData) {
        try {
            const requests = await this.getRequests();
            const newRequest = {
                id: this.generateId(),
                ...requestData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'pending'
            };

            requests.push(newRequest);
            await this.saveRequests(requests);

            // Notify assigned technician
            if (newRequest.assignedTo) {
                this.notifyTechnician(newRequest.assignedTo, newRequest);
            }

            return newRequest;
        } catch (error) {
            console.error('Error creating request:', error);
            throw new Error('Failed to create request');
        }
    }

    // Backup and Restore
    async createBackup() {
        try {
            const backup = {
                version: this.version,
                timestamp: new Date().toISOString(),
                data: {
                    users: await this.getUsers(),
                    lifts: await this.getLifts(),
                    requests: await this.getRequests(),
                    settings: JSON.parse(localStorage.getItem('lm_settings') || '{}')
                }
            };

            localStorage.setItem('lm_backup', JSON.stringify(backup));
            return backup;
        } catch (error) {
            console.error('Error creating backup:', error);
            throw new Error('Failed to create backup');
        }
    }

    async restoreBackup(backupData) {
        try {
            if (backupData.version !== this.version) {
                throw new Error('Backup version mismatch');
            }

            await this.saveUsers(backupData.data.users);
            await this.saveLifts(backupData.data.lifts);
            await this.saveRequests(backupData.data.requests);
            localStorage.setItem('lm_settings', JSON.stringify(backupData.data.settings));

            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            throw new Error('Failed to restore backup');
        }
    }

    // Utility Methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async saveUsers(users) {
        localStorage.setItem('lm_users', JSON.stringify(users));
    }

    async saveLifts(lifts) {
        localStorage.setItem('lm_lifts', JSON.stringify(lifts));
    }

    async saveRequests(requests) {
        localStorage.setItem('lm_requests', JSON.stringify(requests));
    }

    setupAutoBackup() {
        // Auto backup every hour
        setInterval(async () => {
            await this.createBackup();
            console.log('Auto backup created');
        }, 3600000);
    }

    setupDataValidation() {
        // Validate data on load
        this.validateData();
    }

    async validateData() {
        try {
            const users = await this.getUsers();
            const lifts = await this.getLifts();
            const requests = await this.getRequests();

            // Basic validation
            users.forEach(user => {
                if (!user.id || !user.username) {
                    throw new Error('Invalid user data');
                }
            });

            lifts.forEach(lift => {
                if (!lift.id || !lift.address) {
                    throw new Error('Invalid lift data');
                }
            });

            requests.forEach(request => {
                if (!request.id || !request.description) {
                    throw new Error('Invalid request data');
                }
            });

        } catch (error) {
            console.error('Data validation failed:', error);
            await this.restoreFromBackup();
        }
    }

    async restoreFromBackup() {
        const backup = localStorage.getItem('lm_backup');
        if (backup) {
            await this.restoreBackup(JSON.parse(backup));
            CommonUtils.showNotification('Дані відновлено з резервної копії', 'info');
        }
    }

    async notifyTechnician(technicianId, request) {
        // In a real app, this would send push notification or email
        console.log(`Notifying technician ${technicianId} about request ${request.id}`);
        
        const technician = await this.getUserById(technicianId);
        if (technician) {
            CommonUtils.showNotification(
                `Технік ${technician.firstName} отримав нове завдання`,
                'info'
            );
        }
    }

    // Statistics and Analytics
    async getSystemStats() {
        const users = await this.getUsers();
        const lifts = await this.getLifts();
        const requests = await this.getRequests();

        return {
            totalUsers: users.length,
            totalLifts: lifts.length,
            totalRequests: requests.length,
            activeRequests: requests.filter(r => r.status === 'in_progress').length,
            completedRequests: requests.filter(r => r.status === 'completed').length,
            usersByRole: this.groupBy(users, 'role'),
            liftsByStatus: this.groupBy(lifts, 'status'),
            requestsByPriority: this.groupBy(requests, 'priority')
        };
    }

    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key] || 'unknown';
            result[group] = (result[group] || 0) + 1;
            return result;
        }, {});
    }

    // Advanced Search
    async advancedSearch(query, options = {}) {
        const { types = ['users', 'lifts', 'requests'], limit = 10 } = options;
        
        const results = [];
        const searchTerm = query.toLowerCase();

        if (types.includes('users')) {
            const users = await this.getUsers();
            results.push(...users
                .filter(user => 
                    user.username.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm) ||
                    user.firstName.toLowerCase().includes(searchTerm) ||
                    user.lastName.toLowerCase().includes(searchTerm)
                )
                .map(user => ({ type: 'user', data: user }))
            );
        }

        if (types.includes('lifts')) {
            const lifts = await this.getLifts();
            results.push(...lifts
                .filter(lift => 
                    lift.address.toLowerCase().includes(searchTerm) ||
                    lift.serialNumber.toLowerCase().includes(searchTerm) ||
                    lift.manufacturer.toLowerCase().includes(searchTerm)
                )
                .map(lift => ({ type: 'lift', data: lift }))
            );
        }

        if (types.includes('requests')) {
            const requests = await this.getRequests();
            results.push(...requests
                .filter(request => 
                    request.description.toLowerCase().includes(searchTerm) ||
                    request.notes.toLowerCase().includes(searchTerm)
                )
                .map(request => ({ type: 'request', data: request }))
            );
        }

        return results.slice(0, limit);
    }
}

// Initialize database manager
document.addEventListener('DOMContentLoaded', function() {
    window.db = new DatabaseManager();
});