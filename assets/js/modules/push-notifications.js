// push-notifications.js
// Push-нотифікації для техніка про нові завдання чи аварії

class PushNotifications {
  constructor() {
    this.permission = null;
  }

  async init() {
    if (!('Notification' in window)) {
      alert('Push-нотифікації не підтримуються вашим браузером');
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
    this.send('Аварія!', msg);
  }
}

window.pushNotifications = new PushNotifications();
