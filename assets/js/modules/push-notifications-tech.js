// push-notifications-tech.js
// Push-сповіщення для техніка про нові заявки

class PushNotificationsTech {
  constructor(techId) {
    this.techId = techId;
    this.lastRequestIds = [];
    this.checkInterval = null;
    this.apiUrl = '/api/requests';
    this.init();
  }

  init() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    this.checkNewRequests();
    this.checkInterval = setInterval(() => this.checkNewRequests(), 10000);
  }

  async checkNewRequests() {
    try {
      const res = await fetch(this.apiUrl, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      const requests = res.ok ? await res.json() : [];
      const assigned = requests.filter(r => r.assignedTo === this.techId && r.status === 'new');
      const newIds = assigned.map(r => r.id);
      const unseen = assigned.filter(r => !this.lastRequestIds.includes(r.id));
      if (unseen.length > 0) {
        unseen.forEach(r => this.showNotification(r));
      }
      this.lastRequestIds = newIds;
    } catch (e) {
      // offline/demo
    }
  }

  showNotification(request) {
    if (Notification.permission === 'granted') {
      new Notification('Novo pedido!', {
        body: `${request.title}\n${request.location || ''}`,
        icon: '../../assets/img/icons/tech.png',
        tag: `request-${request.id}`
      });
    }
  }
}

window.initTechPushNotifications = function(techId) {
  window.techPush = new PushNotificationsTech(techId);
};
