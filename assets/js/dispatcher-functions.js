/**
 * Dispatcher Panel Functions
 * Всі функції для dispatcher панелі
 */

// ============================================
// Task Management
// ============================================

function createNewTask() {
    console.log('➕ Creating new task...');
    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
    Notifier.info('Creating new task');
}

function saveTask() {
    console.log('💾 Saving task...');
    
    const taskData = {
        title: document.getElementById('taskTitle')?.value,
        description: document.getElementById('taskDescription')?.value,
        address: document.getElementById('taskAddress')?.value,
        priority: document.getElementById('taskPriority')?.value || 'medium',
        date: document.getElementById('taskDate')?.value,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    if (!taskData.title || !taskData.address) {
        Notifier.error('Please fill title and address');
        return;
    }
    
    try {
        fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(taskData)
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            console.log('✅ Task saved:', data);
            Notifier.success('Task created successfully');
            bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
            loadTasks(); // Перезавантажити список
        })
        .catch(error => {
            console.error('Error:', error);
            Notifier.error('Failed to create task: ' + error.message);
        });
    } catch (error) {
        console.error('Error:', error);
        Notifier.error('Failed to save task');
    }
}

function deleteTask(taskId) {
    console.log('🗑️ Deleting task:', taskId);
    
    if (!confirm('Are you sure?')) return;
    
    try {
        fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            Notifier.success('Task deleted');
            loadTasks();
        })
        .catch(error => {
            console.error('Error:', error);
            Notifier.error('Failed to delete task');
        });
    } catch (error) {
        Notifier.error('Error deleting task');
    }
}

function loadTasks() {
    console.log('📂 Loading tasks...');
    
    try {
        fetch('/api/tasks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            console.log('✅ Tasks loaded:', data);
            displayTasks(data);
        })
        .catch(error => {
            console.error('Error:', error);
            Notifier.error('Failed to load tasks');
        });
    } catch (error) {
        Notifier.error('Error loading tasks');
    }
}

function displayTasks(tasks) {
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    (tasks || []).forEach(task => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${task.title || 'N/A'}</td>
            <td>${task.address || 'N/A'}</td>
            <td><span class="badge bg-${getStatusColor(task.status)}">${task.status}</span></td>
            <td>${task.priority || 'medium'}</td>
            <td>${new Date(task.date).toLocaleDateString() || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="assignTask('${task._id}')">Assign</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTask('${task._id}')">Delete</button>
            </td>
        `;
    });
}

function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'in-progress': 'info',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
}

// ============================================
// Task Assignment
// ============================================

function assignTask(taskId) {
    console.log('👤 Assigning task:', taskId);
    
    const technicianId = prompt('Enter Technician ID:');
    if (!technicianId) return;
    
    try {
        fetch(`/api/tasks/${taskId}/assign`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ technicianId })
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            Notifier.success('Task assigned successfully');
            loadTasks();
        })
        .catch(error => {
            console.error('Error:', error);
            Notifier.error('Failed to assign task');
        });
    } catch (error) {
        Notifier.error('Error assigning task');
    }
}

function changeTaskStatus(taskId, newStatus) {
    console.log(`🔄 Changing task status to: ${newStatus}`);
    
    try {
        fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            Notifier.success(`Status changed to ${newStatus}`);
            loadTasks();
        })
        .catch(error => {
            console.error('Error:', error);
            Notifier.error('Failed to change status');
        });
    } catch (error) {
        Notifier.error('Error changing status');
    }
}

// ============================================
// Map & Tracking
// ============================================

function initMap() {
    console.log('🗺️ Initializing map...');
    
    try {
        if (typeof L === 'undefined') {
            console.warn('Leaflet not loaded');
            Notifier.warning('Map library not available');
            return;
        }
        
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        
        const map = L.map('map').setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        Notifier.success('Map initialized');
    } catch (error) {
        console.error('Error initializing map:', error);
        Notifier.error('Failed to initialize map');
    }
}

// ============================================
// Export Functions
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createNewTask, saveTask, deleteTask, loadTasks,
        displayTasks, assignTask, changeTaskStatus, initMap
    };
}

// Load tasks on page load
document.addEventListener('DOMContentLoaded', loadTasks);
