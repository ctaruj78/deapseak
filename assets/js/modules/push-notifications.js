// push-notifications.js
// Push-нотифікації для техніка про нові завдання чи avariї

class PushNotifications {
  constructor() {
    this.permission = null;
  }

  async init() {
    if (!('Notification' in window)) {
      toastr.info('Notificações push não são suportadas pelo seu browser');
      return;
    }
    this.permission = await Notification.requestPermission();
  }

  send(title, body) {
    if (this.permission === 'granted') {
      new Notification(title, { body });
    }
  }

  notifyNewTask(task) {
    this.send('Нове завдання', `Вам призначено: ${task}`);
  }

  notifyEmergency(msg) {
    this.send('Emergência!', msg);
  }
}

window.pushNotifications = new PushNotifications();
