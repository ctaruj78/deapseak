$(function(){
    // Перевірка прав доступу (опціонально, якщо roleManager існує)
    if (typeof roleManager !== 'undefined' && !roleManager.hasPermission('invoices:create')) {
        $('#invoiceForm :input').prop('disabled', true);
        CommonUtils.showNotification('Недостатньо прав для створення рахунку', 'error');
        if (window.notificationManager) notificationManager.showNotification('Недостатньо прав для створення рахунку', 'error');
        return;
    }
    
    $('#invoiceForm').on('submit', async function(e){
        e.preventDefault();
        const formData = {
            client: $('#invoiceClient').val(),
            amount: $('#invoiceAmount').val(),
            dueDate: $('#invoiceDueDate').val(),
            description: $('#invoiceDescription').val()
        };
        try {
            const result = await LiftAPI.request('/invoices', 'POST', formData);
            CommonUtils.showNotification('Рахунок успішно збережено!', 'success');
            if (window.notificationManager) notificationManager.showNotification('Рахунок успішно збережено!', 'success');
        } catch (error) {
            let invoices = StorageManager.load('pending_invoices') || [];
            invoices.push({ ...formData, timestamp: Date.now() });
            StorageManager.save('pending_invoices', invoices);
            CommonUtils.showNotification('Рахунок збережено локально (offline)', 'warning');
            if (window.notificationManager) notificationManager.showNotification('Рахунок збережено локально (offline)', 'warning');
        }
        $('#invoiceForm')[0].reset();
    });
});