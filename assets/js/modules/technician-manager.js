class TechnicianManager {
    constructor() {
        this.technicians = [];
        this.filteredTechnicians = [];
        this.currentTechnician = null;
        this.init();
    }

    init() {
        this.loadTechnicians();
        this.updateStats();
        this.setupRealTimeUpdates();
    }

    // Завантаження списку техніків
    async loadTechnicians() {
        try {
            // Симуляція завантаження з API
            const response = await fetch('/api/technicians', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                this.technicians = await response.json();
                this.filteredTechnicians = [...this.technicians];
                this.renderTechnicians();
                this.updateBadges();
            } else {
                // Запасний варіант - демо-дані
                this.loadDemoTechnicians();
            }
        } catch (error) {
            console.error('Помилка завантаження техніків:', error);
            this.loadDemoTechnicians();
        }
    }

    // Демо-дані для тестування
    loadDemoTechnicians() {
        this.technicians = [
            {
                id: 1,
                firstName: "Олександр",
                lastName: "Петренко",
                email: "o.petrenko@example.com",
                phone: "+351912345601",
                specialty: "network",
                status: "online",
                skills: ["Cisco", "Juniper", "VPN", "Wi-Fi"],
                workload: "medium",
                currentAssignments: 3,
                avatar: "../../assets/img/avatars/tech1.png",
                location: "Lisboa, Rua da Liberdade, 123",
                notes: "Досвідчений мережевий інженер"
            },
            {
                id: 2,
                firstName: "Марія",
                lastName: "Іваненко",
                email: "m.ivanenko@example.com",
                phone: "+351923456702",
                specialty: "software",
                status: "busy",
                skills: ["Windows Server", "Linux", "Virtualization", "Backup"],
                workload: "high",
                currentAssignments: 5,
                avatar: "../../assets/img/avatars/tech2.png",
                location: "Львів, вул. Свободи, 15",
                notes: "Спеціаліст з серверного ПЗ"
            },
            {
                id: 3,
                firstName: "Василь",
                lastName: "Шевченко",
                email: "v.shevchenko@example.com",
                phone: "+351934567803",
                specialty: "hardware",
                status: "online",
                skills: ["Принтери", "Сканери", "Робочі станції", "Ноутбуки"],
                workload: "low",
                currentAssignments: 1,
                avatar: "../../assets/img/avatars/tech3.png",
                location: "Одеса, вул. Дерибасівська, 10",
                notes: "Експерт з обладнання"
            },
            {
                id: 4,
                firstName: "Наталія",
                lastName: "Бойко",
                email: "n.boiko@example.com",
                phone: "+351945678904",
                specialty: "security",
                status: "offline",
                skills: ["Firewall", "Antivirus", "Encryption", "Audit"],
                workload: "medium",
                currentAssignments: 2,
                avatar: "../../assets/img/avatars/tech4.png",
                location: "Харків, вул. Сумська, 30",
                notes: "Спеціаліст з кібербезпеки"
            }
        ];
        
        this.filteredTechnicians = [...this.technicians];
        this.renderTechnicians();
        this.updateBadges();
    }

    // Відображення техніків у сітці
    renderTechnicians() {
        const grid = document.getElementById('techniciansGrid');
        grid.innerHTML = '';
        
        if (this.filteredTechnicians.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Техніки не знайдені</h4>
                    <p>Спробуйте змінити критерії пошуку або додати нового техніка</p>
                </div>
            `;
            return;
        }
        
        this.filteredTechnicians.forEach(tech => {
            const techCard = this.createTechCard(tech);
            grid.appendChild(techCard);
        });
    }

    // Створення картки техніка
    createTechCard(tech) {
        const col = document.createElement('div');
        col.className = 'col-lg-3 col-md-6 mb-4';
        
        // Визначення класу завантаження
        let workloadClass = 'workload-low';
        let workloadText = 'Низьке';
        
        if (tech.workload === 'medium') {
            workloadClass = 'workload-medium';
            workloadText = 'Середнє';
        } else if (tech.workload === 'high') {
            workloadClass = 'workload-high';
            workloadText = 'Високе';
        }
        
        // Визначення статусу
        let statusClass = 'offline';
        let statusText = 'Офлайн';
        
        if (tech.status === 'online') {
            statusClass = 'online';
            statusText = 'Онлайн';
        } else if (tech.status === 'busy') {
            statusClass = 'busy';
            statusText = 'Зайнятий';
        }
        
        // Визначення спеціалізації
        const specialties = {
            'network': 'Мережі',
            'hardware': 'Обладнання',
            'software': 'ПЗ',
            'security': 'Безпека',
            'general': 'Загальна'
        };
        
        col.innerHTML = `
            <div class="tech-card">
                <img src="${tech.avatar || '../../assets/img/avatars/tech-default.png'}" 
                     class="tech-avatar" alt="${tech.firstName} ${tech.lastName}">
                <h5 class="text-center">${tech.firstName} ${tech.lastName}</h5>
                <div class="text-center mb-2">
                    <span class="status-indicator ${statusClass}"></span>
                    <span>${statusText}</span>
                </div>
                <div class="text-center mb-2">
                    <span class="badge badge-info">${specialties[tech.specialty]}</span>
                </div>
                
                <div class="workload-bar">
                    <div class="workload-progress ${workloadClass}"></div>
                </div>
                <div class="text-center small mb-2">
                    Завантаження: ${workloadText} (${tech.currentAssignments} завдань)
                </div>
                
                <div class="text-center">
                    ${tech.skills.slice(0, 3).map(skill => 
                        `<span class="skill-badge">${skill}</span>`
                    ).join('')}
                    ${tech.skills.length > 3 ? '<span class="skill-badge">+ще</span>' : ''}
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="technicianManager.viewTechnician('${tech.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="technicianManager.messageTechnician('${tech.id}')">
                        <i class="fas fa-comment"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="technicianManager.editTechnician('${tech.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="technicianManager.deleteTechnician('${tech.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        return col;
    }

    // Перегляд деталей техніка
    viewTechnician(techId) {
        const tech = this.technicians.find(t => String(t.id) === String(techId));
        if (!tech) return;
        
        this.currentTechnician = tech;
        
        // Оновлення модального вікна
        document.getElementById('viewTechAvatar').src = tech.avatar || '../../assets/img/avatars/tech-default.png';
        document.getElementById('viewTechName').textContent = `${tech.firstName} ${tech.lastName}`;
        
        // Оновлення статусу
        const statusElement = document.getElementById('viewTechStatus');
        let statusClass = 'offline';
        let statusText = 'Офлайн';
        
        if (tech.status === 'online') {
            statusClass = 'online';
            statusText = 'Онлайн';
        } else if (tech.status === 'busy') {
            statusClass = 'busy';
            statusText = 'Зайнятий';
        }
        
        statusElement.innerHTML = `<span class="status-indicator ${statusClass}"></span><span>${statusText}</span>`;
        
        // Оновлення інших полів
        document.getElementById('viewTechEmail').textContent = tech.email;
        document.getElementById('viewTechPhone').textContent = tech.phone;
        
        const specialties = {
            'network': 'Мережі',
            'hardware': 'Обладнання',
            'software': 'ПЗ',
            'security': 'Безпека',
            'general': 'Загальна'
        };
        
        document.getElementById('viewTechSpecialty').textContent = specialties[tech.specialty];
        
        // Оновлення завантаження
        let workloadText = 'Низьке';
        if (tech.workload === 'medium') workloadText = 'Середнє';
        else if (tech.workload === 'high') workloadText = 'Високе';
        
        document.getElementById('viewTechWorkload').textContent = `${workloadText} (${tech.currentAssignments} завдань)`;
        
        // Оновлення навичок
        const skillsContainer = document.getElementById('viewTechSkills');
        skillsContainer.innerHTML = tech.skills.map(skill => 
            `<span class="skill-badge">${skill}</span>`
        ).join('');
        
        // Оновлення завдань (симуляція)
        const assignmentsContainer = document.getElementById('viewTechAssignments');
        assignmentsContainer.innerHTML = '';
        
        if (tech.currentAssignments > 0) {
            for (let i = 1; i <= Math.min(tech.currentAssignments, 3); i++) {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = `Завдання #${1000 + i} - Клієнт ${i}`;
                assignmentsContainer.appendChild(li);
            }
            
            if (tech.currentAssignments > 3) {
                const li = document.createElement('li');
                li.className = 'list-group-item text-center';
                li.textContent = `...і ще ${tech.currentAssignments - 3} завдань`;
                assignmentsContainer.appendChild(li);
            }
        } else {
            assignmentsContainer.innerHTML = '<li class="list-group-item text-center text-muted">Немає поточних завдань</li>';
        }
        
        // Оновлення локації
        const locationContainer = document.getElementById('viewTechLocation');
        locationContainer.innerHTML = `
            <i class="fas fa-map-marker-alt mr-2"></i>
            <span>${tech.location || 'Локація не вказана'}</span>
        `;
        
        // Показати модальне вікно
        $('#viewTechnicianModal').modal('show');
    }

    // Показати модальне вікно додавання техніка
    showAddTechnicianModal() {
        document.getElementById('technicianModalTitle').textContent = 'Додати техніка';
        document.getElementById('technicianForm').reset();
        document.getElementById('techId').value = '';
        $('#technicianModal').modal('show');
    }

    // Редагування техніка
    editTechnician(techId) {
        if (techId) {
            const tech = this.technicians.find(t => String(t.id) === String(techId));
            if (!tech) return;
            
            this.currentTechnician = tech;
            
            document.getElementById('technicianModalTitle').textContent = 'Редагувати техніка';
            document.getElementById('techId').value = tech.id;
            document.getElementById('techFirstName').value = tech.firstName;
            document.getElementById('techLastName').value = tech.lastName;
            document.getElementById('techEmail').value = tech.email;
            document.getElementById('techPhone').value = tech.phone;
            document.getElementById('techSpecialty').value = tech.specialty;
            document.getElementById('techStatus').value = tech.status;
            document.getElementById('techSkills').value = tech.skills.join(', ');
            document.getElementById('techLocation').value = tech.location || '';
            document.getElementById('techNotes').value = tech.notes || '';
            
            $('#technicianModal').modal('show');
        } else if (this.currentTechnician) {
            this.editTechnician(this.currentTechnician.id);
        }
    }

    // Збереження техніка
    async saveTechnician() {
        const form = document.getElementById('technicianForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const techData = {
            id: document.getElementById('techId').value,
            firstName: document.getElementById('techFirstName').value,
            lastName: document.getElementById('techLastName').value,
            email: document.getElementById('techEmail').value,
            phone: document.getElementById('techPhone').value,
            specialty: document.getElementById('techSpecialty').value,
            status: document.getElementById('techStatus').value,
            skills: document.getElementById('techSkills').value.split(',').map(s => s.trim()).filter(s => s),
            location: document.getElementById('techLocation').value,
            notes: document.getElementById('techNotes').value
        };
        
        try {
            // Симуляція збереження через API
            if (techData.id) {
                // Оновлення існуючого техніка
                const response = await fetch(`/api/technicians/${techData.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(techData)
                });
                
                if (response.ok) {
                    const updatedTech = await response.json();
                    const index = this.technicians.findIndex(t => String(t.id) === String(updatedTech.id));
                    if (index !== -1) {
                        this.technicians[index] = updatedTech;
                    }
                    this.showNotification('Техніка успішно оновлено', 'success');
                }
            } else {
                // Додавання нового техніка
                const response = await fetch('/api/technicians', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(techData)
                });
                
                const newTechData = await response.json();
                if (response.ok) {
                    this.technicians.push(newTechData);
                    const nu = newTechData.newUser;
                    if (nu) {
                        const emailMsg = nu.emailSent === false
                            ? `⚠️ Email não enviado (${nu.emailError || 'SMTP não configurado'})`
                            : '📧 Convite enviado por email';
                        this.showNotification(
                            `✅ Técnico criado!\n👤 ${nu.email}\n🔑 Palavra-passe: ${nu.password}\n${emailMsg}`,
                            'success'
                        );
                    } else {
                        this.showNotification('Técnico já existe — dados actualizados', 'info');
                    }
                } else {
                    this.showNotification(newTechData.message || 'Erro ao guardar técnico', 'error');
                    return;
                }
            }
            
            this.filteredTechnicians = [...this.technicians];
            this.renderTechnicians();
            this.updateStats();
            this.updateBadges();
            
            $('#technicianModal').modal('hide');
        } catch (error) {
            console.error('Помилка збереження техніка:', error);
            this.showNotification('Помилка збереження техніка', 'error');
        }
    }

    // Видалення техніка
    async deleteTechnician(techId) {
        if (!confirm('Ви впевнені, що хочете видалити цього техніка?')) return;
        
        try {
            const response = await fetch(`/api/technicians/${techId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                this.technicians = this.technicians.filter(t => t.id !== techId);
                this.filteredTechnicians = this.filteredTechnicians.filter(t => t.id !== techId);
                this.renderTechnicians();
                this.updateStats();
                this.updateBadges();
                this.showNotification('Техніка успішно видалено', 'success');
            }
        } catch (error) {
            console.error('Помилка видалення техніка:', error);
            this.showNotification('Помилка видалення техніка', 'error');
        }
    }

    // Надіслати повідомлення техніку
    messageTechnician(techId) {
        const tech = this.technicians.find(t => String(t.id) === String(techId));
        if (!tech) return;
        
        const message = prompt(`Написати повідомлення для ${tech.firstName} ${tech.lastName}:`);
        if (message) {
            // Симуляція відправки повідомлення
            this.showNotification(`Повідомлення відправлено для ${tech.firstName} ${tech.lastName}`, 'info');
        }
    }

    // Фільтрація техніків
    filterTechnicians() {
        const statusFilter = document.getElementById('statusFilter').value;
        const specialtyFilter = document.getElementById('specialtyFilter').value;
        const workloadFilter = document.getElementById('workloadFilter').value;
        
        this.filteredTechnicians = this.technicians.filter(tech => {
            let statusMatch = statusFilter === 'all' || tech.status === statusFilter;
            let specialtyMatch = specialtyFilter === 'all' || tech.specialty === specialtyFilter;
            let workloadMatch = workloadFilter === 'all' || tech.workload === workloadFilter;
            
            return statusMatch && specialtyMatch && workloadMatch;
        });
        
        this.renderTechnicians();
    }

    // Пошук техніків
    searchTechnicians() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        
        if (!searchTerm) {
            this.filterTechnicians();
            return;
        }
        
        this.filteredTechnicians = this.technicians.filter(tech => {
            const fullName = `${tech.firstName} ${tech.lastName}`.toLowerCase();
            const skills = tech.skills.join(' ').toLowerCase();
            const specialty = tech.specialty.toLowerCase();
            
            return fullName.includes(searchTerm) || 
                   skills.includes(searchTerm) || 
                   specialty.includes(searchTerm) ||
                   tech.email.toLowerCase().includes(searchTerm);
        });
        
        this.renderTechnicians();
    }

    // Оновлення статистики
    updateStats() {
        const totalTechs = this.technicians.length;
        const availableTechs = this.technicians.filter(t => t.status === 'online').length;
        const activeAssignments = this.technicians.reduce((sum, tech) => sum + tech.currentAssignments, 0);
        const avgCompletion = totalTechs > 0 ? Math.round((availableTechs / totalTechs) * 100) : 0;
        
        const elTotal = document.getElementById('totalTechs');
        const elAvailable = document.getElementById('availableTechs');
        const elActive = document.getElementById('activeAssignments');
        const elAvg = document.getElementById('avgCompletion');
        if (elTotal) elTotal.textContent = totalTechs;
        if (elAvailable) elAvailable.textContent = availableTechs;
        if (elActive) elActive.textContent = activeAssignments;
        if (elAvg) elAvg.textContent = `${avgCompletion}%`;
    }

    // Оновлення бейджів
    updateBadges() {
        const onlineTechs = this.technicians.filter(t => t.status === 'online').length;
        const badge = document.getElementById('techsBadge');
        if (badge) badge.textContent = onlineTechs;
    }

    // Налаштування реальних оновлень
    setupRealTimeUpdates() {
        // Симуляція реальних оновлень статусу техніків
        setInterval(() => {
            if (this.technicians.length > 0) {
                // Випадкове оновлення статусу одного техніка
                const randomIndex = Math.floor(Math.random() * this.technicians.length);
                const statuses = ['online', 'busy', 'offline'];
                const workloads = ['low', 'medium', 'high'];
                
                this.technicians[randomIndex].status = statuses[Math.floor(Math.random() * statuses.length)];
                this.technicians[randomIndex].workload = workloads[Math.floor(Math.random() * workloads.length)];
                this.technicians[randomIndex].currentAssignments = Math.floor(Math.random() * 6);
                
                this.filteredTechnicians = [...this.technicians];
                this.renderTechnicians();
                this.updateStats();
                this.updateBadges();
                
                // Оновлення часу останнього оновлення
                const now = new Date();
                const lastUpdate = document.getElementById('lastUpdate');
                if (lastUpdate) lastUpdate.textContent = `Оновлено: ${now.toLocaleTimeString()}`;
            }
        }, 30000); // Оновлення кожні 30 секунд
    }

    // Показати сповіщення
    showNotification(message, type = 'info') {
        // Використання Toastr або вбудованого сповіщення AdminLTE
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            alert(message);
        }
    }

    // Показати сповіщення (для навігації)
    showNotifications() {
        alert('Функціонал сповіщень буде реалізовано в наступній версії');
    }

    // Показати повідомлення (для навігації)
    showMessages() {
        alert('Функціонал повідомлень буде реалізовано в наступній версії');
    }
}