// push-notifications-tech.js
// Push-сповіщення (браузерні) для техніка про нові/призначені заявки.
// Робить polling GET /api/requests (той самий self-assign pool, що й tasks.html)
// і показує Notification, коли з'являється: (а) нова заявка у відкритому пулі,
// (б) заявка щойно призначена/перепризначена саме цьому техніку.

class PushNotificationsTech {
    constructor(techId) {
        this.techId = String(techId);
        this.seenPoolIds = new Set();
        this.seenMineIds = new Set();
        this.firstRun = true;
        this.checkInterval = null;
        this.init();
    }

    init() {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
        this.checkNewRequests();
        this.checkInterval = setInterval(() => this.checkNewRequests(), 15000);
    }

    async checkNewRequests() {
        try {
            if (typeof AuthManager === 'undefined' || !AuthManager.isAuthenticated || !AuthManager.isAuthenticated()) return;

            const res = await AuthManager.fetchWithAuth('/api/requests?limit=200');
            if (!res || !res.ok) return;
            const payload = await res.json();
            const requests = Array.isArray(payload.data) ? payload.data : [];

            const currentPoolIds = new Set();
            const currentMineIds = new Set();

            requests.forEach(r => {
                const id = String(r._id || r.id || '');
                if (!id) return;
                const isMine = String(r.technician || r.technicianId || r.assignedTo || '') === this.techId;
                const isOpenPool = !isMine && (r.status === 'new' || r.status === 'pending');
                const isActiveMine = isMine && r.status !== 'completed' && r.status !== 'cancelled';

                if (isOpenPool) {
                    currentPoolIds.add(id);
                    if (!this.firstRun && !this.seenPoolIds.has(id)) this.showNotification(r, 'pool');
                }
                if (isActiveMine) {
                    currentMineIds.add(id);
                    if (!this.firstRun && !this.seenMineIds.has(id)) this.showNotification(r, 'mine');
                }
            });

            this.seenPoolIds = currentPoolIds;
            this.seenMineIds = currentMineIds;
            this.firstRun = false;
        } catch (e) {
            // offline/erro silencioso — não interrompe o polling seguinte
        }
    }

    showNotification(request, kind) {
        if (Notification.permission !== 'granted') return;
        const title = kind === 'mine' ? 'Nova tarefa atribuída!' : 'Novo pedido disponível';
        const addr = request.liftAddress || request.lift?.address?.street || '';
        const body = `${request.title || request.description || 'Pedido de serviço'}${addr ? '\n' + addr : ''}`;
        new Notification(title, {
            body,
            icon: '/assets/img/favicon.png',
            tag: `request-${request._id || request.id}`
        });
    }

    stop() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        this.checkInterval = null;
    }
}

window.initTechPushNotifications = function (techId) {
    if (!techId || window.techPush) return; // não duplicar o polling se já inicializado
    window.techPush = new PushNotificationsTech(techId);
};
