// push-notifications-client.js
// Push-нотифікації для клієнта: нові заявки, завершення ремонту, термінові сповіщення

class PushNotificationsClient {
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

  notifyNewRequest(request) {
    this.send('Novo pedido', `O seu pedido nº${request.id} foi criado.`);
  }

  notifyRequestCompleted(request) {
    this.send('Заявку виконано', `Заявка №${request.id} завершена.`);
  }

  notifyEmergency(msg) {
    this.send('Термінова сповіщення!', msg);
  }
}

window.pushNotificationsClient = new PushNotificationsClient();
