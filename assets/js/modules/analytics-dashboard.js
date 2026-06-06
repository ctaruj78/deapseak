/**
 * Analytics Dashboard — real-data version
 * Replaces all localStorage / Math.random() calls with live API requests.
 */
class AnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.data = {};
        this.init();
    }

    _getToken() {
        return sessionStorage.getItem('liftmanager_jwt')
            || localStorage.getItem('liftmanager_jwt')
            || localStorage.getItem('authToken')
            || localStorage.getItem('token')
            || '';
    }

    async _apiFetch(url) {
        try {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this._getToken()}` }
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.warn('⚠️ API fetch failed:', url, e.message);
            return null;
        }
    }

    async init() {
        await this.loadData();
        this.initializeCharts();
        this.setupEventListeners();
        this.updateKPICards();
    }

    async loadData() {
        const [liftsResp, requestsResp, usersResp] = await Promise.all([
            this._apiFetch('/api/lifts?limit=500'),
            this._apiFetch('/api/requests?limit=500'),
            this._apiFetch('/api/auth/users')
        ]);

        const lifts    = liftsResp?.lifts    || liftsResp?.data    || [];
        const requests = requestsResp?.requests || requestsResp?.data || [];
        const users    = usersResp?.users    || usersResp?.data    || [];

        this.data = {
            lifts:       this._processLifts(lifts),
            maintenance: this._processMaintenance(requests),
            financial:   this._processFinancial(requests, lifts),
            performance: this._processPerformance(requests, users),
            usage:       this._processUsage(users)
        };
    }

    _processLifts(lifts) {
        const now = new Date();
        const norm = s => (s || '').toLowerCase();
        return {
            total:        lifts.length,
            active:       lifts.filter(l => ['active','ativo'].includes(norm(l.status))).length,
            maintenance:  lifts.filter(l => ['maintenance','manutencao','em manutencao'].includes(norm(l.status))).length,
            inactive:     lifts.filter(l => ['inactive','inativo'].includes(norm(l.status))).length,
            overdueCount: lifts.filter(l => {
                const d = l.nextMaintenanceDate || l.nextMaintenance;
                return d && new Date(d) < now;
            }).length
        };
    }

    _processMaintenance(requests) {
        const dayKeys = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        const byDay   = Object.fromEntries(dayKeys.map(k => [k, 0]));
        const byMonth = {};

        requests.forEach(r => {
            const d = new Date(r.createdAt || r.date);
            if (!isNaN(d)) {
                byDay[dayKeys[d.getDay()]]++;
                const mk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                byMonth[mk] = (byMonth[mk] || 0) + 1;
            }
        });

        const norm = s => (s || '').toLowerCase();
        const completed = requests.filter(r => ['completed','concluido','done'].includes(norm(r.status))).length;
        const pending   = requests.filter(r => ['pending','novo','new','aberto','open'].includes(norm(r.status))).length;

        let avgTime = 0;
        const timed = requests.filter(r => r.createdAt && r.completedAt && ['completed','concluido'].includes(norm(r.status)));
        if (timed.length) {
            avgTime = Math.round(timed.reduce((s, r) => s + (new Date(r.completedAt) - new Date(r.createdAt)), 0) / timed.length / 3600000);
        }

        return { total: requests.length, completed, pending, avgTime, byDay, byMonth };
    }

    _processFinancial(requests, lifts) {
        const contractLifts = lifts.filter(l => l.contractPrice && Number(l.contractPrice) > 0);
        const totalContractValue = contractLifts.reduce((s, l) => s + Number(l.contractPrice || 0), 0);

        const now = new Date();
        const monthLabels = [], monthData = [];
        for (let i = 5; i >= 0; i--) {
            const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            monthLabels.push(d.toLocaleString('pt-PT', { month: 'short' }));
            monthData.push(requests.filter(r => {
                const rd = new Date(r.createdAt || r.date);
                return !isNaN(rd) && `${rd.getFullYear()}-${String(rd.getMonth()+1).padStart(2,'0')}` === mk;
            }).length);
        }

        const last = monthData[monthData.length - 1] || 0;
        const prev = monthData[monthData.length - 2] || 0;
        const growth = prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0;

        return { totalContractValue, monthLabels, monthData, growth };
    }

    _processPerformance(requests, users) {
        const technicians = users.filter(u => ['technician','tech'].includes((u.role||'').toLowerCase()));
        const performance = {};
        technicians.forEach(tech => {
            const id = tech._id || tech.id;
            const techReqs = requests.filter(r => String(r.assignedTo||r.technicianId) === String(id));
            const done = techReqs.filter(r => ['completed','concluido'].includes((r.status||'').toLowerCase()));
            performance[id] = {
                name: `${tech.firstName||''} ${tech.lastName||''}`.trim() || tech.email,
                total: techReqs.length,
                completed: done.length,
                completionRate: techReqs.length ? Math.round((done.length / techReqs.length) * 100) : 0
            };
        });
        return performance;
    }

    _processUsage(users) {
        return {
            total:  users.length,
            active: users.filter(u => u.status !== 'inactive').length,
            byRole: {
                admin:      users.filter(u => u.role === 'admin').length,
                dispatcher: users.filter(u => u.role === 'dispatcher').length,
                technician: users.filter(u => ['technician','tech'].includes(u.role)).length,
                client:     users.filter(u => u.role === 'client').length
            }
        };
    }

    // ── Charts ─────────────────────────────────────────
    initializeCharts() {
        this.createMaintenanceChart();
        this.createLiftsStatusChart();
        this.createPerformanceChart();
        this.createFinancialChart();
        this.createTrendsChart();
    }

    createMaintenanceChart() {
        const el = document.getElementById('maintenanceChart');
        if (!el) return;
        const bd = this.data.maintenance.byDay;
        this.charts.maintenance = new Chart(el.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(bd),
                datasets: [{ label: 'Pedidos', data: Object.values(bd), backgroundColor: 'rgba(60,141,188,0.8)', borderColor: 'rgba(60,141,188,1)', borderWidth: 1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
    }

    createLiftsStatusChart() {
        const el = document.getElementById('liftsStatusChart');
        if (!el) return;
        const l = this.data.lifts;
        this.charts.liftsStatus = new Chart(el.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Ativos', 'Em manutenção', 'Inativos'],
                datasets: [{ data: [l.active, l.maintenance, l.inactive], backgroundColor: ['rgba(40,167,69,0.8)','rgba(255,193,7,0.8)','rgba(220,53,69,0.8)'], borderColor: ['rgba(40,167,69,1)','rgba(255,193,7,1)','rgba(220,53,69,1)'], borderWidth: 1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    createPerformanceChart() {
        const el = document.getElementById('performanceChart');
        if (!el) return;
        const perf = this.data.performance;
        const keys = Object.keys(perf);
        const labels = keys.length ? keys.map(k => perf[k].name) : ['Sem dados'];
        const values = keys.length ? keys.map(k => perf[k].completionRate) : [0];
        const isRadar = keys.length > 2;
        this.charts.performance = new Chart(el.getContext('2d'), {
            type: isRadar ? 'radar' : 'bar',
            data: {
                labels,
                datasets: [{ label: 'Taxa de conclusão (%)', data: values, fill: true, backgroundColor: 'rgba(60,141,188,0.2)', borderColor: 'rgb(60,141,188)', pointBackgroundColor: 'rgb(60,141,188)', pointBorderColor: '#fff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: isRadar ? { r: { min: 0, max: 100, ticks: { stepSize: 25 } } } : { y: { beginAtZero: true, max: 100 } } }
        });
    }

    createFinancialChart() {
        const el = document.getElementById('financialChart');
        if (!el) return;
        const fin = this.data.financial;
        this.charts.financial = new Chart(el.getContext('2d'), {
            type: 'line',
            data: {
                labels: fin.monthLabels,
                datasets: [{ label: 'Pedidos por mês', data: fin.monthData, borderColor: 'rgb(255,193,7)', backgroundColor: 'rgba(255,193,7,0.1)', tension: 0.3, fill: true }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
    }

    createTrendsChart() {
        const el = document.getElementById('trendsChart');
        if (!el) return;
        const byMonth = this.data.maintenance.byMonth;
        const now = new Date();
        const labels = [], data = [];
        for (let i = 11; i >= 0; i--) {
            const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            labels.push(d.toLocaleString('pt-PT', { month: 'short', year: '2-digit' }));
            data.push(byMonth[mk] || 0);
        }
        this.charts.trends = new Chart(el.getContext('2d'), {
            type: 'line',
            data: { labels, datasets: [{ label: 'Pedidos (reais)', data, borderColor: 'rgb(220,53,69)', tension: 0.3, fill: false }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
    }

    // ── KPI + Insight cards ───────────────────────────
    updateKPICards() {
        const m   = this.data.maintenance;
        const l   = this.data.lifts;
        const fin = this.data.financial;

        this._set('totalMaintenance',  m.total);
        this._set('completedRequests', m.completed);
        this._set('totalRevenue',      this.formatCurrency(fin.totalContractValue));
        this._set('activeLifts',       l.active);

        // Insight 1 — Efficiency: % requests completed
        const effPct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
        this._set('insightEfficiency', effPct + '%');
        this._setWidth('insightEfficiencyBar', effPct);
        this._set('insightEfficiencyDesc', `${m.completed} de ${m.total} pedidos concluídos`);

        // Insight 2 — Prevention: lifts with overdue maintenance
        this._set('insightUrgent', l.overdueCount);
        this._setWidth('insightUrgentBar', Math.min(l.overdueCount * 10, 100));
        this._set('insightUrgentDesc', `${l.overdueCount} elevador(es) com manutenção em atraso`);

        // Insight 3 — Activity growth vs previous month
        const growthSign = fin.growth >= 0 ? '+' : '';
        this._set('insightGrowth', growthSign + fin.growth + '%');
        this._setWidth('insightGrowthBar', Math.min(Math.abs(fin.growth), 100));
        this._set('insightGrowthDesc', `Variação de pedidos face ao mês anterior`);

        // Insight 4 — Open requests
        this._set('insightSatisfaction', m.pending + ' em aberto');
        const pendPct = m.total > 0 ? Math.round((m.pending / m.total) * 100) : 0;
        this._setWidth('insightSatisfactionBar', pendPct);
        this._set('insightSatisfactionDesc', `${m.pending} pedido(s) aguarda resposta`);
    }

    _set(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
    _setWidth(id, pct) {
        const el = document.getElementById(id);
        if (el) el.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }

    setupEventListeners() {
        const tp = document.getElementById('timePeriod');
        const at = document.getElementById('analyticsType');
        if (tp) tp.addEventListener('change', () => this.updateCharts());
        if (at) at.addEventListener('change', () => this.updateCharts());
    }

    updateCharts() {
        Object.values(this.charts).forEach(c => c && c.update());
        this.updateKPICards();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount || 0);
    }

    exportChartData() {
        const a = document.createElement('a');
        a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.data, null, 2));
        a.download = 'analytics-data.json';
        a.click();
    }

    showNotification(message, type = 'info') {
        const colors = { success: 'bg-success text-white', error: 'bg-danger text-white', warning: 'bg-warning text-dark', info: 'bg-info text-white' };
        const toast = $(`<div class="toast" role="alert">
            <div class="toast-header ${colors[type]||colors.info}">
                <strong class="mr-auto">Análise</strong>
                <button type="button" class="ml-2 mb-1 close" data-dismiss="toast"><span>&times;</span></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>`);
        $('#toastContainer').append(toast);
        toast.toast({ delay: 3000 });
        toast.toast('show');
        toast.on('hidden.bs.toast', function() { $(this).remove(); });
    }
}

if (!document.getElementById('toastContainer')) {
    const tc = document.createElement('div');
    tc.id = 'toastContainer';
    tc.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    tc.style.zIndex = '9999';
    document.body.appendChild(tc);
}

document.addEventListener('DOMContentLoaded', function() {
    window.analyticsDashboard = new AnalyticsDashboard();
});
