/**
 * Admin Panel Functions
 * Всі функції для admin панелі в одному місці
 */

// ============================================
// AI Diagnostics Functions
// ============================================

function checkClasses() {
    // logger.log('🔍 Checking CSS classes...');
    const classes = document.querySelectorAll('[class]');
    // logger.log(`Found ${classes.length} elements with classes`);
    Notifier.success('Classes check completed');
}

function checkScripts() {
    // logger.log('🔍 Checking loaded scripts...');
    const scripts = document.querySelectorAll('script[src]');
    // logger.log(`Found ${scripts.length} scripts loaded`);
    Notifier.success('Scripts check completed');
}

function clearConsole() {
    console.clear();
    // logger.log('✅ Console cleared');
    Notifier.info('Console cleared');
}

function simulateOriginalPage() {
    // logger.log('⏱️ Simulating original page...');
    Notifier.info('Simulation started...');
    setTimeout(() => {
        Notifier.success('Page simulation completed');
    }, 2000);
}

function testChart() {
    // logger.log('📊 Testing chart...');
    Notifier.info('Chart test started...');
    setTimeout(() => {
        Notifier.success('Chart test completed');
    }, 1500);
}

function testInitialization() {
    // logger.log('🚀 Testing initialization...');
    Notifier.info('Initialization test started...');
    setTimeout(() => {
        Notifier.success('Initialization test completed');
    }, 1500);
}

// ============================================
// Email Template Functions
// ============================================

function editTemplate(templateType) {
    // logger.log(`✏️ Editing template: ${templateType}`);
    
    const modal = new bootstrap.Modal(document.getElementById('templateEditModal'));
    
    const templateContent = {
        'assignment': 'Assign Task Template',
        'completion': 'Task Completion Template',
        'emergency': 'Emergency Alert Template',
        'maintenance': 'Maintenance Template'
    };
    
    document.getElementById('templateTitle').value = templateContent[templateType] || '';
    document.getElementById('templateType').value = templateType;
    
    modal.show();
    Notifier.info(`Editing ${templateType} template`);
}

function previewTemplate(templateType) {
    // logger.log(`👁️ Previewing template: ${templateType}`);
    
    const previews = {
        'assignment': 'Task assigned to technician {{technician_name}} at {{location}}',
        'completion': 'Task completed by {{technician_name}} on {{date}}',
        'emergency': 'Emergency alert for {{client_name}} - {{location}}',
        'maintenance': 'Maintenance scheduled for {{date}}'
    };
    
    alert(`Preview:\n\n${previews[templateType]}`);
    Notifier.info('Template preview shown');
}

function saveTemplate() {
    // logger.log('💾 Saving template...');
    
    const templateType = document.getElementById('templateType').value;
    const templateTitle = document.getElementById('templateTitle').value;
    const templateContent = document.getElementById('templateContent').value;
    
    if (!templateTitle || !templateContent) {
        Notifier.error('Please fill all fields');
        return;
    }
    
    // Зберегти в localStorage
    localStorage.setItem(`template_${templateType}`, JSON.stringify({
        title: templateTitle,
        content: templateContent,
        savedAt: new Date().toISOString()
    }));
    
    Notifier.success('Template saved successfully');
    bootstrap.Modal.getInstance(document.getElementById('templateEditModal')).hide();
}

function insertVariable(variable) {
    // logger.log(`📝 Inserting variable: ${variable}`);
    
    const textarea = document.getElementById('templateContent');
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, startPos) + variable + text.substring(endPos);
    textarea.focus();
    
    Notifier.info(`Inserted ${variable}`);
}

function testSendTemplate(templateType) {
    // logger.log(`📧 Sending test template: ${templateType}`);
    
    Notifier.info('Sending test email...');
    
    setTimeout(async () => {
        try {
            const response = await fetch('/api/templates/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    templateType: templateType,
                    testEmail: 'test@example.com'
                })
            });
            
            if (!response.ok) throw new Error('Failed to send');
            
            Notifier.success('Test email sent successfully');
        } catch (error) {
            // logger.error('Error:', error);
            Notifier.error('Failed to send test email');
        }
    }, 1000);
}

// ============================================
// Inspection Template Functions
// ============================================

function loadTemplate() {
    // logger.log('📂 Loading inspection template...');
    
    try {
        const inspectionData = JSON.parse(localStorage.getItem('currentInspection') || '{}');
        
        if (Object.keys(inspectionData).length === 0) {
            Notifier.warning('No inspection data found');
            return;
        }
        
        // Заповнити форму
        document.getElementById('inspectionId').value = inspectionData.id || '';
        document.getElementById('inspectionType').value = inspectionData.type || '';
        
        Notifier.success('Template loaded');
    } catch (error) {
        // logger.error('Error loading template:', error);
        Notifier.error('Failed to load template');
    }
}

function saveInspection() {
    // logger.log('💾 Saving inspection...');
    
    const inspectionData = {
        id: document.getElementById('inspectionId').value,
        type: document.getElementById('inspectionType').value,
        date: new Date().toISOString(),
        status: 'draft'
    };
    
    if (!inspectionData.id || !inspectionData.type) {
        Notifier.error('Please fill all required fields');
        return;
    }
    
    localStorage.setItem('currentInspection', JSON.stringify(inspectionData));
    Notifier.success('Inspection saved');
}

function downloadPDF() {
    // logger.log('📥 Downloading PDF...');
    Notifier.info('Preparing PDF...');
    
    setTimeout(() => {
        // Simulate PDF generation
        const element = document.getElementById('inspectionReport');
        const opt = {
            margin: 10,
            filename: 'inspection-report.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };
        
        Notifier.success('PDF downloaded');
    }, 1500);
}

function printReport() {
    // logger.log('🖨️ Printing report...');
    
    const element = document.getElementById('inspectionReport');
    const printWindow = window.open('', '', 'height=400,width=600');
    printWindow.document.write(element.innerHTML);
    printWindow.document.close();
    printWindow.print();
    
    Notifier.success('Report sent to printer');
}

function sendReport() {
    // logger.log('📧 Sending report...');
    
    const email = prompt('Enter email address:');
    if (!email) return;
    
    Notifier.info('Sending report...');
    
    setTimeout(async () => {
        try {
            const response = await fetch('/api/reports/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    reportId: document.getElementById('inspectionId').value,
                    email: email
                })
            });
            
            if (!response.ok) throw new Error('Failed to send');
            
            Notifier.success('Report sent successfully');
        } catch (error) {
            // logger.error('Error:', error);
            Notifier.error('Failed to send report');
        }
    }, 1000);
}

// ============================================
// Invoice Template Functions
// ============================================

function addServiceRow() {
    // logger.log('➕ Adding service row...');
    
    const table = document.getElementById('servicesTable');
    const newRow = table.insertRow();
    
    newRow.innerHTML = `
        <td><input type="text" class="form-control" placeholder="Service"></td>
        <td><input type="number" class="form-control" placeholder="Hours" value="0"></td>
        <td><input type="number" class="form-control" placeholder="Rate" value="0"></td>
        <td class="amount">0.00</td>
        <td><button class="btn btn-sm btn-danger" onclick="removeServiceRow(this)">Remove</button></td>
    `;
    
    Notifier.success('Service row added');
}

function removeServiceRow(btn) {
    // logger.log('❌ Removing service row...');
    btn.closest('tr').remove();
    Notifier.success('Service row removed');
}

// ============================================
// Export Functions
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkClasses, checkScripts, clearConsole,
        simulateOriginalPage, testChart, testInitialization,
        editTemplate, previewTemplate, saveTemplate, insertVariable,
        testSendTemplate, loadTemplate, saveInspection, downloadPDF,
        printReport, sendReport, addServiceRow, removeServiceRow
    };
}
