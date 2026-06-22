class TechnicianManager {
    constructor() {
        this.technicians = [];
        this.filteredTechnicians = [];
        this.currentTechnician = null;
        this.init();
    }

    init() {
        this.loadTechnicians();
        this.setupRealTimeUpdates();
    }

    // A carregar списку техніків
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
            } else {
                this.technicians = [];
                this.filteredTechnicians = [];
            }
        } catch (error) {
            console.error('Erro завантaження техніків:', error);
            this.technicians = [];
            this.filteredTechnicians = [];
        } finally {
            this.renderTechnicians();
            this.updateBadges();
            this.updateStats();
        }
    }

    // Демо-дані для тестування
    loadDemoTechnicians() {
        this.technicians = [];
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
                    <h4 class="text-muted">Nenhum técnico encontrado</h4>
                    <p>Tente alterar os critérios de pesquisa ou adicionar um novo técnico</p>
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
        let workloadText = 'Baixa';
        
        if (tech.workload === 'medium') {
            workloadClass = 'workload-medium';
            workloadText = 'Média';
        } else if (tech.workload === 'high') {
            workloadClass = 'workload-high';
            workloadText = 'Alta';
        }
        
        // Determinação do estado
        let statusClass = 'offline';
        let statusText = 'Offline';
        
        if (tech.status === 'online') {
            statusClass = 'online';
            statusText = 'Disponível';
        } else if (tech.status === 'busy') {
            statusClass = 'busy';
            statusText = 'Ocupado';
        }
        
        // Determinação da especialização
        const specialties = {
            'network': 'Redes',
            'hardware': 'Equipamento',
            'software': 'Software',
            'security': 'Segurança',
            'general': 'Geral',
            'hydraulic': 'Hidráulica',
            'electric': 'Elétrica',
            'mechanical': 'Mecânica',
            'maintenance': 'Manutenção'
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
                    Carga: ${workloadText} | Tarefas: ${tech.currentAssignments}
                </div>
                
                <div class="text-center">
                    ${tech.skills.slice(0, 3).map(skill => 
                        `<span class="skill-badge">${skill}</span>`
                    ).join('')}
                    ${tech.skills.length > 3 ? '<span class="skill-badge">+mais</span>' : ''}
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
        
        // Atualização модального вікна
        document.getElementById('viewTechAvatar').src = tech.avatar || '../../assets/img/avatars/tech-default.png';
        document.getElementById('viewTechName').textContent = `${tech.firstName} ${tech.lastName}`;
        
        // Atualização do estado
        const statusElement = document.getElementById('viewTechStatus');
        let statusClass = 'offline';
        let statusText = 'Offline';
        
        if (tech.status === 'online') {
            statusClass = 'online';
            statusText = 'Disponível';
        } else if (tech.status === 'busy') {
            statusClass = 'busy';
            statusText = 'Ocupado';
        }
        
        statusElement.innerHTML = `<span class="status-indicator ${statusClass}"></span><span>${statusText}</span>`;
        
        // Atualização інших полів
        document.getElementById('viewTechEmail').textContent = tech.email;
        document.getElementById('viewTechPhone').textContent = tech.phone;
        
        const specialties = {
            'network': 'Redes',
            'hardware': 'Equipamento',
            'software': 'Software',
            'security': 'Segurança',
            'general': 'Geral',
            'hydraulic': 'Hidráulica',
            'electric': 'Elétrica',
            'mechanical': 'Mecânica',
            'maintenance': 'Manutenção'
        };
        
        document.getElementById('viewTechSpecialty').textContent = specialties[tech.specialty] || tech.specialty;
        
        // Atualização da carga
        let workloadText = 'Baixa';
        if (tech.workload === 'medium') workloadText = 'Média';
        else if (tech.workload === 'high') workloadText = 'Alta';
        
        document.getElementById('viewTechWorkload').textContent = `${workloadText} (${tech.currentAssignments} tarefas)`;
        
        // Atualização навичок
        const skillsContainer = document.getElementById('viewTechSkills');
        skillsContainer.innerHTML = tech.skills.map(skill => 
            `<span class="skill-badge">${skill}</span>`
        ).join('');
        
        // Atualização завдань (симуляція)
        const assignmentsContainer = document.getElementById('viewTechAssignments');
        assignmentsContainer.innerHTML = '';
        
        if (tech.currentAssignments > 0) {
            for (let i = 1; i <= Math.min(tech.currentAssignments, 3); i++) {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = `Tarefa #${1000 + i} - Cliente ${i}`;
                assignmentsContainer.appendChild(li);
            }
            
            if (tech.currentAssignments > 3) {
                const li = document.createElement('li');
                li.className = 'list-group-item text-center';
                li.textContent = `...e mais ${tech.currentAssignments - 3} tarefas`;
                assignmentsContainer.appendChild(li);
            }
        } else {
            assignmentsContainer.innerHTML = '<li class="list-group-item text-center text-muted">Sem tarefas atuais</li>';
        }
        
        // Atualização локації
        const locationContainer = document.getElementById('viewTechLocation');
        locationContainer.innerHTML = `
            <i class="fas fa-map-marker-alt mr-2"></i>
            <span>${tech.location || 'Localização não disponível'}</span>
        `;
        
        // Показати модальне вікно
        $('#viewTechnicianModal').modal('show');
    }

    // Показати модальне вікно додавання техніка
    showAddTechnicianModal() {
        document.getElementById('technicianModalTitle').textContent = 'Adicionar técnico';
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

            document.getElementById('technicianModalTitle').textContent = 'Editar técnico';
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

            const $view = $('#viewTechnicianModal');
            if ($view.hasClass('show')) {
                $view.modal('hide');
                $view.one('hidden.bs.modal', () => $('#technicianModal').modal('show'));
            } else {
                $('#technicianModal').modal('show');
            }
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

        // Upload avatar if a file was selected
        const avatarInput = document.getElementById('techAvatar');
        if (techData.id && avatarInput && avatarInput.files && avatarInput.files[0]) {
            try {
                const fd = new FormData();
                fd.append('avatar', avatarInput.files[0]);
                const token = localStorage.getItem('token') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken');
                const avatarRes = await fetch(`/api/technicians/${techData.id}/avatar`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: fd
                });
                if (avatarRes.ok) {
                    const avatarData = await avatarRes.json();
                    techData.avatar = avatarData.avatarUrl;
                }
            } catch(e) { console.warn('Avatar upload failed:', e); }
        }

        try {
            if (techData.id) {
                // Atualização існуючого техніка
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
                    this.showNotification('Técnico atualizado com sucesso', 'success');
                }
            } else {
                // Adicionar novo técnico
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
            console.error('Erro ao guardar техніка:', error);
            this.showNotification('Erro ao guardar técnico', 'error');
        }
    }

    // Видалення техніка
    async deleteTechnician(techId) {
if (!await swalConfirm('Tem a certeza que quer eliminar este técnico?')) return;
        
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
                this.showNotification('Técnico eliminado com sucesso', 'success');
            }
        } catch (error) {
            console.error('Erro ao eliminar técnico:', error);
            this.showNotification('Erro ao eliminar técnico', 'error');
        }
    }

    // Enviar повідомлення техніку
    messageTechnician(techId) {
        const tech = this.technicians.find(t => String(t.id) === String(techId));
        if (!tech) return;
        
        const message = prompt(`Escrever mensagem para ${tech.firstName} ${tech.lastName}:`);
        if (message) {
            this.showNotification(`Mensagem enviada para ${tech.firstName} ${tech.lastName}`, 'info');
        }
    }

    // Filtroація техніків
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

    // Pesquisa техніків
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

    // Atualização статистики
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

    // Atualização бейджів
    updateBadges() {
        const onlineTechs = this.technicians.filter(t => t.status === 'online').length;
        const badge = document.getElementById('techsBadge');
        if (badge) badge.textContent = onlineTechs;
    }

    // Definições реальних оновлень
    setupRealTimeUpdates() {
        // Sem simulação — statuses são carregados da API
    }

    // Показати сповіщення
    showNotification(message, type = 'info') {
        // Використання Toastr або вбудованого сповіщення AdminLTE
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            toastr.info(message);
        }
    }

    // Mostrar notificações (para navegação)
    showNotifications() {
        toastr.info('Funcionalidade de notificações será implementada na próxima versão');
    }

    // Показати повідомлення (для навігації)
    showMessages() {
        toastr.info('Funcionalidade de mensagens será implementada na próxima versão');
    }
}