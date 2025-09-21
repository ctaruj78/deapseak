$(function(){
    if (!roleManager.hasPermission('reports:create')) {
        $('#reportForm :input').prop('disabled', true);
        CommonUtils.showNotification('Недостатньо прав для створення звіту', 'error');
        if (window.notificationManager) notificationManager.showNotification('Недостатньо прав для створення звіту', 'error');
        return;
    }
    $('#reportForm').on('submit', async function(e){
        e.preventDefault();
        const formData = {
            title: $('#reportTitle').val(),
            author: $('#reportAuthor').val(),
            date: $('#reportDate').val(),
            content: $('#reportContent').val()
        };
        try {
            const result = await LiftAPI.request('/reports', 'POST', formData);
            CommonUtils.showNotification('Звіт успішно збережено!', 'success');
            if (window.notificationManager) notificationManager.showNotification('Звіт успішно збережено!', 'success');
        } catch (error) {
            let reports = StorageManager.load('pending_reports') || [];
            reports.push({ ...formData, timestamp: Date.now() });
            StorageManager.save('pending_reports', reports);
            CommonUtils.showNotification('Звіт збережено локально (offline)', 'warning');
            if (window.notificationManager) notificationManager.showNotification('Звіт збережено локально (offline)', 'warning');
        }
        $('#reportForm')[0].reset();
    });
});