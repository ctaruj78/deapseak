/**
 * Client Panel Functions
 * Всі функції для client панелі
 */

// ============================================
// Request Management
// ============================================

function createRequest() {
    console.log('📝 Creating new request...');
    const modal = new bootstrap.Modal(document.getElementById('requestModal'));
    modal.show();
}

function submitRequest() {
    console.log('📤 Submitting request...');
    
    const requestData = {
        liftId: document.getElementById('liftId')?.value,
        title: document.getElementById('requestTitle')?.value,
        description: document.getElementById('requestDescription')?.value,
        type: document.getElementById('requestType')?.value || 'maintenance',
        urgent: document.getElementById('urgentCheckbox')?.checked || false,
        createdAt: new Date().toISOString()
    };
    
    if (!requestData.liftId || !requestData.title) {
        Notifier.error('Please fill required fields');
        return;
    }
    
    try {
        fetch('/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(requestData)
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            Notifier.success('Request submitted successfully');
            bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
            loadRequests();
        })
        .catch(error => {
            console.error('Error:', error);
            Notifier.error('Failed to submit request');
        });
    } catch (error) {
        Notifier.error('Error submitting request');
    }
}

function loadRequests() {
    console.log('📂 Loading requests...');
    
    try {
        fetch('/api/requests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            displayRequests(data);
        })
        .catch(error => {
            console.error('Error:', error);
            Notifier.error('Failed to load requests');
        });
    } catch (error) {
        Notifier.error('Error loading requests');
    }
}

function displayRequests(requests) {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    (requests || []).forEach(req => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${req.title}</td>
            <td><span class="badge bg-warning">${req.type}</span></td>
            <td>${new Date(req.createdAt).toLocaleDateString()}</td>
            <td><span class="badge bg-info">${req.status || 'pending'}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewRequest('${req._id}')">View</button>
                <button class="btn btn-sm btn-danger" onclick="cancelRequest('${req._id}')">Cancel</button>
            </td>
        `;
    });
}

// ============================================
// Invoice Management
// ============================================

function loadInvoices() {
    console.log('📂 Loading invoices...');
    
    try {
        fetch('/api/invoices', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            displayInvoices(data);
        })
        .catch(error => {
            console.error('Error:', error);
            Notifier.error('Failed to load invoices');
        });
    } catch (error) {
        Notifier.error('Error loading invoices');
    }
}

function displayInvoices(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    (invoices || []).forEach(inv => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${inv.invoiceNumber || 'N/A'}</td>
            <td>$${parseFloat(inv.amount || 0).toFixed(2)}</td>
            <td>${new Date(inv.date).toLocaleDateString()}</td>
            <td><span class="badge bg-${inv.paid ? 'success' : 'warning'}">${inv.paid ? 'Paid' : 'Pending'}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="downloadInvoicePDF('${inv._id}')">PDF</button>
                <button class="btn btn-sm btn-info" onclick="viewInvoice('${inv._id}')">View</button>
            </td>
        `;
    });
}

function downloadInvoicePDF(invoiceId) {
    console.log('📥 Downloading invoice PDF:', invoiceId);
    Notifier.info('Preparing PDF...');
    
    try {
        fetch(`/api/invoices/${invoiceId}/pdf`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${invoiceId}.pdf`;
            a.click();
            Notifier.success('Invoice downloaded');
        })
        .catch(error => {
            console.error('Error:', error);
            Notifier.error('Failed to download PDF');
        });
    } catch (error) {
        Notifier.error('Error downloading PDF');
    }
}

// ============================================
// My Lifts
// ============================================

function loadMyLifts() {
    console.log('📂 Loading my lifts...');
    
    try {
        fetch('/api/my-lifts', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            displayMyLifts(data);
        })
        .catch(error => {
            console.error('Error:', error);
            Notifier.error('Failed to load lifts');
        });
    } catch (error) {
        Notifier.error('Error loading lifts');
    }
}

function displayMyLifts(lifts) {
    const container = document.getElementById('myLiftsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    (lifts || []).forEach(lift => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${lift.address || 'Unknown'}</h5>
                <p class="card-text">Model: ${lift.model || 'N/A'}</p>
                <p class="card-text">Status: <span class="badge bg-success">${lift.status || 'active'}</span></p>
                <button class="btn btn-sm btn-primary" onclick="viewLift('${lift._id}')">Details</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ============================================
// Stub Functions
// ============================================

function viewRequest(requestId) {
    console.log('👁️ Viewing request:', requestId);
    Notifier.info('Opening request details...');
}

function cancelRequest(requestId) {
    console.log('❌ Cancelling request:', requestId);
    if (confirm('Cancel this request?')) {
        Notifier.success('Request cancelled');
        loadRequests();
    }
}

function viewInvoice(invoiceId) {
    console.log('👁️ Viewing invoice:', invoiceId);
    Notifier.info('Opening invoice details...');
}

function viewLift(liftId) {
    console.log('👁️ Viewing lift:', liftId);
    Notifier.info('Opening lift details...');
}

// ============================================
// Export
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createRequest, submitRequest, loadRequests,
        loadInvoices, downloadInvoicePDF,
        loadMyLifts, viewRequest, cancelRequest
    };
}

document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
    loadInvoices();
    loadMyLifts();
});
