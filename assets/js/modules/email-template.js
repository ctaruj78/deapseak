$(function(){
    // Перевірка прав доступу
    if (!roleManager.hasPermission('emails:create')) {
        $('#emailForm :input').prop('disabled', true);
        CommonUtils.showNotification('Недостатньо прав для надсилання email', 'error');
        if (window.notificationManager) notificationManager.showNotification('Недостатньо прав для надсилання email', 'error');
        return;
    }
    $('#emailForm').on('submit', async function(e){
        e.preventDefault();
        const formData = {
            to: $('#emailTo').val(),
            subject: $('#emailSubject').val(),
            message: $('#emailMessage').val()
        };
        if (!CommonUtils.validateEmail(formData.to)) {
            CommonUtils.showNotification('Невірний email одержувача', 'error');
            if (window.notificationManager) notificationManager.showNotification('Невірний email одержувача', 'error');
            return;
        }
        try {
            const result = await LiftAPI.request('/emails', 'POST', formData);
            CommonUtils.showNotification('Email успішно відправлено!', 'success');
            if (window.notificationManager) notificationManager.showNotification('Email успішно відправлено!', 'success');
        } catch (error) {
            let emails = StorageManager.load('pending_emails') || [];
            emails.push({ ...formData, timestamp: Date.now() });
            StorageManager.save('pending_emails', emails);
            CommonUtils.showNotification('Email збережено локально (offline)', 'warning');
            if (window.notificationManager) notificationManager.showNotification('Email збережено локально (offline)', 'warning');
        }
        $('#emailForm')[0].reset();
    });
});