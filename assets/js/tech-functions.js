/**
 * Tech Panel Functions
 * Всі функції для технічної панелі
 */

// ============================================
// Task Management for Technician
// ============================================

function loadMyTasks() {
    // logger.log('📂 Loading my tasks...');
    
    try {
        fetch('/api/my-tasks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            displayMyTasks(data);
        })
        .catch(error => {
            // logger.error('Error:', error);
            Notifier.error('Failed to load tasks');
        });
    } catch (error) {
        Notifier.error('Error loading tasks');
    }
}

function displayMyTasks(tasks) {
    const tbody = document.getElementById('myTasksTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    (tasks || []).forEach(task => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${task.title || 'N/A'}</td>
            <td>${task.address || 'N/A'}</td>
            <td><span class="badge bg-${getStatusColor(task.status)}">${task.status}</span></td>
            <td>${task.priority || 'medium'}</td>
            <td>${new Date(task.scheduledDate).toLocaleDateString() || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="startTask('${task._id}')">Start</button>
                <button class="btn btn-sm btn-info" onclick="viewTaskDetails('${task._id}')">Details</button>
            </td>
        `;
    });
}

function startTask(taskId) {
    // logger.log('🚀 Starting task:', taskId);
    
    try {
        fetch(`/api/tasks/${taskId}/start`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                status: 'in-progress',
                startTime: new Date().toISOString()
            })
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            Notifier.success('Task started');
            startTaskTimer(taskId);
            loadMyTasks();
        })
        .catch(error => {
            // logger.error('Error:', error);
            Notifier.error('Failed to start task');
        });
    } catch (error) {
        Notifier.error('Error starting task');
    }
}

function completeTask(taskId) {
    // logger.log('✅ Completing task:', taskId);
    
    const modal = new bootstrap.Modal(document.getElementById('completeTaskModal'));
    document.getElementById('completeTaskId').value = taskId;
    modal.show();
}

function submitTaskCompletion() {
    // logger.log('📤 Submitting task completion...');
    
    const taskId = document.getElementById('completeTaskId').value;
    const completionNotes = document.getElementById('completionNotes')?.value;
    const status = document.getElementById('completionStatus')?.value || 'completed';
    
    if (!completionNotes) {
        Notifier.error('Please add completion notes');
        return;
    }
    
    try {
        fetch(`/api/tasks/${taskId}/complete`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                status: status,
                completionNotes: completionNotes,
                endTime: new Date().toISOString()
            })
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            Notifier.success('Task completed successfully');
            bootstrap.Modal.getInstance(document.getElementById('completeTaskModal')).hide();
            loadMyTasks();
        })
        .catch(error => {
            // logger.error('Error:', error);
            Notifier.error('Failed to complete task');
        });
    } catch (error) {
        Notifier.error('Error completing task');
    }
}

// ============================================
// QR Code Scanner
// ============================================

function startQRScanner() {
    // logger.log('📷 Starting QR scanner...');
    
    const modal = new bootstrap.Modal(document.getElementById('qrScannerModal'));
    modal.show();
    
    try {
        if (typeof Html5Qrcode === 'undefined') {
            Notifier.warning('QR scanner library not available');
            return;
        }
        
        const qrScanner = new Html5Qrcode('qr-reader');
        qrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 250 },
            onQRCodeSuccess,
            onQRCodeError
        );
        
        Notifier.success('QR scanner started');
    } catch (error) {
        // logger.error('Error:', error);
        Notifier.error('Failed to start QR scanner');
    }
}

function onQRCodeSuccess(decodedText, decodedResult) {
    // logger.log('✅ QR Code detected:', decodedText);
    
    try {
        fetch('/api/qr-scans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                qrCode: decodedText,
                scannedAt: new Date().toISOString()
            })
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            // logger.log('✅ QR Scan saved:', data);
            Notifier.success('QR Code scanned successfully');
            bootstrap.Modal.getInstance(document.getElementById('qrScannerModal')).hide();
            loadQRHistory();
        })
        .catch(error => {
            // logger.error('Error:', error);
            Notifier.error('Failed to process QR code');
        });
    } catch (error) {
        Notifier.error('Error processing QR code');
    }
}

function onQRCodeError(error) {
    // logger.warn('QR Error:', error);
}

function loadQRHistory() {
    // logger.log('📂 Loading QR history...');
    
    try {
        fetch('/api/qr-scans', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            displayQRHistory(data);
        })
        .catch(error => {
            // logger.error('Error:', error);
            Notifier.error('Failed to load QR history');
        });
    } catch (error) {
        Notifier.error('Error loading QR history');
    }
}

function displayQRHistory(scans) {
    const tbody = document.getElementById('qrHistoryTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    (scans || []).forEach(scan => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${scan.qrCode || 'N/A'}</td>
            <td>${new Date(scan.scannedAt).toLocaleString()}</td>
            <td>${scan.liftId || 'Unknown'}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewQRDetails('${scan._id}')">View</button>
            </td>
        `;
    });
}

// ============================================
// Inspections
// ============================================

function createInspection() {
    // logger.log('📋 Creating new inspection...');
    
    const modal = new bootstrap.Modal(document.getElementById('inspectionModal'));
    modal.show();
}

function submitInspection() {
    // logger.log('📤 Submitting inspection...');
    
    const inspectionData = {
        taskId: document.getElementById('inspectionTaskId')?.value,
        type: document.getElementById('inspectionType')?.value,
        findings: document.getElementById('inspectionFindings')?.value,
        photos: [], // Files будут обробленi окремо
        createdAt: new Date().toISOString()
    };
    
    if (!inspectionData.taskId || !inspectionData.findings) {
        Notifier.error('Please fill all required fields');
        return;
    }
    
    try {
        fetch('/api/inspections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(inspectionData)
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            Notifier.success('Inspection created');
            bootstrap.Modal.getInstance(document.getElementById('inspectionModal')).hide();
            loadInspections();
        })
        .catch(error => {
            // logger.error('Error:', error);
            Notifier.error('Failed to create inspection');
        });
    } catch (error) {
        Notifier.error('Error creating inspection');
    }
}

function loadInspections() {
    // logger.log('📂 Loading inspections...');
    
    try {
        fetch('/api/inspections', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            displayInspections(data);
        })
        .catch(error => {
            // logger.error('Error:', error);
            Notifier.error('Failed to load inspections');
        });
    } catch (error) {
        Notifier.error('Error loading inspections');
    }
}

function displayInspections(inspections) {
    const tbody = document.getElementById('inspectionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    (inspections || []).forEach(inspection => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${inspection.type || 'N/A'}</td>
            <td>${new Date(inspection.createdAt).toLocaleDateString()}</td>
            <td><span class="badge bg-info">${inspection.status || 'draft'}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editInspection('${inspection._id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteInspection('${inspection._id}')">Delete</button>
            </td>
        `;
    });
}

// ============================================
// Photo Upload
// ============================================

function uploadPhotos(inputId) {
    // logger.log('📸 Uploading photos...');
    
    const input = document.getElementById(inputId);
    const files = input?.files;
    
    if (!files || files.length === 0) {
        Notifier.warning('No files selected');
        return;
    }
    
    const formData = new FormData();
    for (let file of files) {
        formData.append('photos', file);
    }
    
    Notifier.info('Uploading photos...');
    
    try {
        fetch('/api/photos/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            Notifier.success(`${files.length} photo(s) uploaded`);
            displayUploadedPhotos(data);
        })
        .catch(error => {
            // logger.error('Error:', error);
            Notifier.error('Failed to upload photos');
        });
    } catch (error) {
        Notifier.error('Error uploading photos');
    }
}

function displayUploadedPhotos(photos) {
    const container = document.getElementById('uploadedPhotosContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    (photos || []).forEach(photo => {
        const img = document.createElement('img');
        img.src = photo.url;
        img.className = 'img-thumbnail m-2';
        img.style.maxWidth = '150px';
        container.appendChild(img);
    });
}

// ============================================
// Timer & Time Tracking
// ============================================

let activeTaskTimer = null;
let taskStartTime = null;

function startTaskTimer(taskId) {
    // logger.log('⏱️ Starting task timer...');
    
    taskStartTime = new Date();
    
    if (activeTaskTimer) clearInterval(activeTaskTimer);
    
    activeTaskTimer = setInterval(() => {
        const elapsed = Math.floor((new Date() - taskStartTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        const timerDisplay = document.getElementById('taskTimerDisplay');
        if (timerDisplay) {
            timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }, 1000);
}

function stopTaskTimer() {
    // logger.log('⏹️ Stopping task timer...');
    
    if (activeTaskTimer) {
        clearInterval(activeTaskTimer);
        activeTaskTimer = null;
    }
}

// ============================================
// Helper Functions
// ============================================

function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'in-progress': 'info',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
}

function viewTaskDetails(taskId) {
    // logger.log('👁️ Viewing task details:', taskId);
    Notifier.info('Loading task details...');
}

function editInspection(inspectionId) {
    // logger.log('✏️ Editing inspection:', inspectionId);
    Notifier.info('Loading inspection...');
}

function deleteInspection(inspectionId) {
    // logger.log('🗑️ Deleting inspection:', inspectionId);
    if (confirm('Delete this inspection?')) {
        Notifier.success('Inspection deleted');
        loadInspections();
    }
}

function viewQRDetails(scanId) {
    // logger.log('👁️ Viewing QR details:', scanId);
    Notifier.info('Loading QR details...');
}

// ============================================
// Export
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadMyTasks, startTask, completeTask, submitTaskCompletion,
        startQRScanner, loadQRHistory, createInspection, submitInspection,
        loadInspections, uploadPhotos, startTaskTimer, stopTaskTimer
    };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadMyTasks();
    loadInspections();
    loadQRHistory();
});
