$(function(){
    if (typeof roleManager !== 'undefined' && !roleManager.hasPermission('inspections:create')) {
        $('#inspectionForm :input').prop('disabled', true);
        CommonUtils.showNotification('Недостатньо прав для створення інспекції', 'error');
        if (window.notificationManager) notificationManager.showNotification('Недостатньо прав для створення інспекції', 'error');
        return;
    }
    $('#inspectionForm').on('submit', async function(e){
        e.preventDefault();
        const formData = {
            liftId: $('#inspectionLiftId').val(),
            inspector: $('#inspectionInspector').val(),
            date: $('#inspectionDate').val(),
            notes: $('#inspectionNotes').val()
        };
        try {
            const result = await LiftAPI.request('/inspections', 'POST', formData);
            CommonUtils.showNotification('Інспекцію успішно збережено!', 'success');
            if (window.notificationManager) notificationManager.showNotification('Інспекцію успішно збережено!', 'success');
        } catch (error) {
            let inspections = StorageManager.load('pending_inspections') || [];
            inspections.push({ ...formData, timestamp: Date.now() });
            StorageManager.save('pending_inspections', inspections);
            CommonUtils.showNotification('Інспекцію збережено локально (offline)', 'warning');
            if (window.notificationManager) notificationManager.showNotification('Інспекцію збережено локально (offline)', 'warning');
        }
        $('#inspectionForm')[0].reset();
    });
});