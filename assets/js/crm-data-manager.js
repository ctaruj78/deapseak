/**
 * DeapSeaK CRM - Data Management System
 * Система управління даними для CRM
 */

class CRMDataManager {
    constructor() {
        this.storageKey = 'deapseakCRM';
        this.init();
    }
    
    init() {
        // Ініціалізуємо базові дані якщо їх немає
        if (!localStorage.getItem(this.storageKey)) {
            this.initializeDefaultData();
        }
    }
    
    initializeDefaultData() {
        const defaultData = {
            lifts: [
                {
                    id: 'L001',
                    address: 'вул. Хрещатик, 1, під\'їзд 1',
                    model: 'OTIS Gen2',
                    status: 'working',
                    lastMaintenance: '2024-11-15',
                    nextMaintenance: '2025-02-15',
                    floors: 12,
                    year: 2018,
                    capacity: 8,
                    speed: 1.75,
                    clientId: 'C001',
                    contract: 'premium',
                    qrCode: 'QR001',
                    location: { lat: 50.4501, lng: 30.5234 }
                },
                {
                    id: 'L002', 
                    address: 'вул. Володимирська, 15, під\'їзд 2',
                    model: 'KONE MonoSpace',
                    status: 'maintenance',
                    lastMaintenance: '2024-10-10',
                    nextMaintenance: '2025-01-10',
                    floors: 9,
                    year: 2020,
                    capacity: 6,
                    speed: 1.5,
                    clientId: 'C002',
                    contract: 'standard',
                    qrCode: 'QR002',
                    location: { lat: 50.4476, lng: 30.5216 }
                },
                {
                    id: 'L003',
                    address: 'пр-т Перемоги, 42, під\'їзд 1',
                    model: 'Schindler 5500',
                    status: 'emergency',
                    lastMaintenance: '2024-09-05',
                    nextMaintenance: '2024-12-05',
                    floors: 16,
                    year: 2015,
                    capacity: 10,
                    speed: 2.0,
                    clientId: 'C003',
                    contract: 'basic',
                    qrCode: 'QR003',
                    location: { lat: 50.4547, lng: 30.5238 }
                }
            ],
            
            users: [
                {
                    id: 'U001',
                    name: 'Іваненко Іван Іванович',
                    email: 'admin@deapsseak.com',
                    role: 'admin',
                    phone: '+38 (098) 123-45-67',
                    department: 'Адміністрація',
                    status: 'active',
                    lastLogin: new Date().toISOString(),
                    permissions: ['all']
                },
                {
                    id: 'U002',
                    name: 'Петров Петро Петрович',
                    email: 'dispatcher@deapsseak.com',
                    role: 'dispatcher',
                    phone: '+38 (098) 234-56-78',
                    department: 'Диспетчерська служба',
                    status: 'active',
                    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    permissions: ['assignments', 'monitoring', 'reports']
                },
                {
                    id: 'U003',
                    name: 'Сидоров Сидір Сидорович',
                    email: 'tech@deapsseak.com',
                    role: 'tech',
                    phone: '+38 (098) 345-67-89',
                    department: 'Технічний відділ',
                    status: 'active',
                    lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                    permissions: ['tasks', 'qr-scanner', 'reports']
                }
            ],
            
            tasks: [
                {
                    id: 'T001',
                    liftId: 'L001',
                    type: 'emergency',
                    priority: 'urgent',
                    title: 'Ліфт зупинився між поверхами',
                    description: 'Ліфт застряг між 3-м та 4-м поверхами. Всередині знаходиться 1 особа.',
                    status: 'in-progress',
                    assignedTo: 'U003',
                    created: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    updated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                    estimatedCompletion: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                    location: { lat: 50.4501, lng: 30.5234 }
                },
                {
                    id: 'T002',
                    liftId: 'L002',
                    type: 'maintenance',
                    priority: 'medium',
                    title: 'Планове технічне обслуговування',
                    description: 'Щомісячне ТО згідно з регламентом',
                    status: 'pending',
                    assignedTo: null,
                    created: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    updated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    estimatedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                    location: { lat: 50.4476, lng: 30.5216 }
                },
                {
                    id: 'T003',
                    liftId: 'L003',
                    type: 'repair',
                    priority: 'high',
                    title: 'Заміна кнопок виклику',
                    description: 'Не працюють кнопки виклику на 1-му поверсі',
                    status: 'assigned',
                    assignedTo: 'U003',
                    created: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                    updated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                    estimatedCompletion: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                    location: { lat: 50.4547, lng: 30.5238 }
                }
            ],
            
            clients: [
                {
                    id: 'C001',
                    name: 'Condomínio Jardins do Tejo',
                    contactPerson: 'Ana Ferreira',
                    email: 'contact@condominiotejo.pt',
                    phone: '+351 21 123 4567',
                    address: 'Lisboa, Rua da Liberdade, 123',
                    contract: 'premium',
                    status: 'active',
                    liftsCount: 1,
                    joinDate: '2018-03-15'
                },
                {
                    id: 'C002',
                    name: 'Hotel Beira-Mar Lda.',
                    contactPerson: 'Carlos Mendes',
                    email: 'manut@hotelbeiramar.pt',
                    phone: '+351 96 234 5678',
                    address: 'Porto, Av. dos Aliados, 45',
                    contract: 'standard',
                    status: 'active',
                    liftsCount: 1,
                    joinDate: '2020-06-20'
                }
            ],
            
            qrCodes: [
                {
                    id: 'QR001',
                    liftId: 'L001',
                    code: 'DSK-L001-2024',
                    generated: '2024-01-15T10:00:00Z',
                    lastScanned: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    scanCount: 156,
                    status: 'active'
                },
                {
                    id: 'QR002',
                    liftId: 'L002',
                    code: 'DSK-L002-2024',
                    generated: '2024-01-15T10:00:00Z',
                    lastScanned: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    scanCount: 98,
                    status: 'active'
                },
                {
                    id: 'QR003',
                    liftId: 'L003',
                    code: 'DSK-L003-2024',
                    generated: '2024-01-15T10:00:00Z',
                    lastScanned: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                    scanCount: 203,
                    status: 'active'
                }
            ],
            
            analytics: {
                totalLifts: 3,
                workingLifts: 1,
                maintenanceLifts: 1,
                emergencyLifts: 1,
                totalTasks: 3,
                completedTasks: 0,
                pendingTasks: 2,
                inProgressTasks: 1,
                totalClients: 2,
                activeContracts: 2,
                qrScansToday: 23,
                avgResponseTime: 2.5, // години
                satisfactionRate: 94.5 // %
            },
            
            settings: {
                company: {
                    name: 'FestLift Serviços de Elevadores',
                    email: 'info@festlift.pt',
                    phone: '+351 21 123 4567',
                    address: 'Lisboa, Rua do Carmo, 56'
                },
                notifications: {
                    email: true,
                    sms: false,
                    push: true,
                    emergencyOnly: false
                },
                maintenance: {
                    defaultInterval: 90, // днів
                    reminderDays: 7,
                    autoSchedule: true
                }
            }
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(defaultData));
    }
    
    getData() {
        return JSON.parse(localStorage.getItem(this.storageKey));
    }
    
    saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        // Тригер події для оновлення UI
        window.dispatchEvent(new CustomEvent('crmDataUpdated'));
    }
    
    // CRUD операції для ліфтів
    getLifts() {
        return this.getData().lifts;
    }
    
    addLift(lift) {
        const data = this.getData();
        lift.id = 'L' + String(data.lifts.length + 1).padStart(3, '0');
        data.lifts.push(lift);
        this.updateAnalytics(data);
        this.saveData(data);
        return lift;
    }
    
    updateLift(liftId, updates) {
        const data = this.getData();
        const liftIndex = data.lifts.findIndex(l => l.id === liftId);
        if (liftIndex !== -1) {
            data.lifts[liftIndex] = { ...data.lifts[liftIndex], ...updates };
            this.updateAnalytics(data);
            this.saveData(data);
            return data.lifts[liftIndex];
        }
        return null;
    }
    
    deleteLift(liftId) {
        const data = this.getData();
        const liftIndex = data.lifts.findIndex(l => l.id === liftId);
        if (liftIndex !== -1) {
            data.lifts.splice(liftIndex, 1);
            // Видаляємо пов'язані завдання
            data.tasks = data.tasks.filter(t => t.liftId !== liftId);
            this.updateAnalytics(data);
            this.saveData(data);
            return true;
        }
        return false;
    }
    
    // CRUD операції для користувачів
    getUsers() {
        return this.getData().users;
    }
    
    addUser(user) {
        const data = this.getData();
        user.id = 'U' + String(data.users.length + 1).padStart(3, '0');
        user.status = user.status || 'active';
        user.lastLogin = null;
        data.users.push(user);
        this.saveData(data);
        return user;
    }
    
    updateUser(userId, updates) {
        const data = this.getData();
        const userIndex = data.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            data.users[userIndex] = { ...data.users[userIndex], ...updates };
            this.saveData(data);
            return data.users[userIndex];
        }
        return null;
    }
    
    // CRUD операції для завдань
    getTasks() {
        return this.getData().tasks;
    }
    
    addTask(task) {
        const data = this.getData();
        task.id = 'T' + String(data.tasks.length + 1).padStart(3, '0');
        task.created = new Date().toISOString();
        task.updated = new Date().toISOString();
        task.status = task.status || 'pending';
        data.tasks.unshift(task);
        this.updateAnalytics(data);
        this.saveData(data);
        return task;
    }
    
    updateTask(taskId, updates) {
        const data = this.getData();
        const taskIndex = data.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            data.tasks[taskIndex] = { ...data.tasks[taskIndex], ...updates };
            data.tasks[taskIndex].updated = new Date().toISOString();
            this.updateAnalytics(data);
            this.saveData(data);
            return data.tasks[taskIndex];
        }
        return null;
    }
    
    assignTask(taskId, userId) {
        return this.updateTask(taskId, { 
            assignedTo: userId, 
            status: 'assigned',
            assignedAt: new Date().toISOString()
        });
    }
    
    completeTask(taskId, completionNotes = '') {
        return this.updateTask(taskId, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            completionNotes: completionNotes
        });
    }
    
    // CRUD операції для клієнтів
    getClients() {
        return this.getData().clients;
    }
    
    addClient(client) {
        const data = this.getData();
        client.id = 'C' + String(data.clients.length + 1).padStart(3, '0');
        client.status = client.status || 'active';
        client.liftsCount = client.liftsCount || 0;
        client.joinDate = new Date().toISOString().split('T')[0];
        data.clients.push(client);
        this.saveData(data);
        return client;
    }
    
    // QR коди
    getQRCodes() {
        return this.getData().qrCodes;
    }
    
    generateQRCode(liftId) {
        const data = this.getData();
        const qrCode = {
            id: 'QR' + String(data.qrCodes.length + 1).padStart(3, '0'),
            liftId: liftId,
            code: `DSK-${liftId}-${new Date().getFullYear()}`,
            generated: new Date().toISOString(),
            lastScanned: null,
            scanCount: 0,
            status: 'active'
        };
        data.qrCodes.push(qrCode);
        this.saveData(data);
        return qrCode;
    }
    
    scanQRCode(qrId) {
        const data = this.getData();
        const qrIndex = data.qrCodes.findIndex(qr => qr.id === qrId || qr.code === qrId);
        if (qrIndex !== -1) {
            data.qrCodes[qrIndex].lastScanned = new Date().toISOString();
            data.qrCodes[qrIndex].scanCount++;
            data.analytics.qrScansToday++;
            this.saveData(data);
            return data.qrCodes[qrIndex];
        }
        return null;
    }
    
    // Аналітика
    getAnalytics() {
        return this.getData().analytics;
    }
    
    updateAnalytics(data) {
        const lifts = data.lifts;
        const tasks = data.tasks;
        
        data.analytics = {
            ...data.analytics,
            totalLifts: lifts.length,
            workingLifts: lifts.filter(l => l.status === 'working').length,
            maintenanceLifts: lifts.filter(l => l.status === 'maintenance').length,
            emergencyLifts: lifts.filter(l => l.status === 'emergency').length,
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.status === 'completed').length,
            pendingTasks: tasks.filter(t => t.status === 'pending').length,
            inProgressTasks: tasks.filter(t => t.status === 'in-progress' || t.status === 'assigned').length,
            totalClients: data.clients.length,
            activeContracts: data.clients.filter(c => c.status === 'active').length
        };
    }
    
    // Пошук та фільтрація
    searchLifts(query) {
        const lifts = this.getLifts();
        const searchTerm = query.toLowerCase();
        return lifts.filter(lift => 
            lift.address.toLowerCase().includes(searchTerm) ||
            lift.model.toLowerCase().includes(searchTerm) ||
            lift.id.toLowerCase().includes(searchTerm)
        );
    }
    
    filterTasks(filters) {
        let tasks = this.getTasks();
        
        if (filters.status) {
            tasks = tasks.filter(t => t.status === filters.status);
        }
        
        if (filters.priority) {
            tasks = tasks.filter(t => t.priority === filters.priority);
        }
        
        if (filters.assignedTo) {
            tasks = tasks.filter(t => t.assignedTo === filters.assignedTo);
        }
        
        if (filters.type) {
            tasks = tasks.filter(t => t.type === filters.type);
        }
        
        return tasks;
    }
    
    // Звіти
    getMaintenanceSchedule() {
        const lifts = this.getLifts();
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        return lifts.filter(lift => {
            const nextMaintenance = new Date(lift.nextMaintenance);
            return nextMaintenance <= nextWeek;
        }).sort((a, b) => new Date(a.nextMaintenance) - new Date(b.nextMaintenance));
    }
    
    getUrgentTasks() {
        const tasks = this.getTasks();
        return tasks.filter(t => 
            t.status !== 'completed' && 
            (t.priority === 'urgent' || t.type === 'emergency')
        ).sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    
    // Налаштування
    getSettings() {
        return this.getData().settings;
    }
    
    updateSettings(updates) {
        const data = this.getData();
        data.settings = { ...data.settings, ...updates };
        this.saveData(data);
        return data.settings;
    }
}

// Експорт класу для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CRMDataManager;
} else {
    window.CRMDataManager = CRMDataManager;
}