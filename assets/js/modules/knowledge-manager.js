// knowledge-manager.js — Gestor da Base de Conhecimento (técnico)
class KnowledgeManager {
    constructor() {
        this.articles = [];
        this.filteredArticles = [];
        this.currentFilter = 'all';
        this.bookmarkedArticles = JSON.parse(localStorage.getItem('kb_bookmarks')) || [];
        this.init();
    }

    async init() {
        await this.loadArticles();
        this.setupEventListeners();
        this.renderPopularArticles();
        this.renderRecentArticles();
        this.renderRecommendedArticles();
        this.updateStatistics();
        this.loadUserInfo();
    }

    getToken() {
        return (window.AuthManager && AuthManager.getToken && AuthManager.getToken())
            || localStorage.getItem('liftmanager_jwt')
            || localStorage.getItem('authToken')
            || '';
    }

    async loadArticles() {
        try {
            const res = await fetch('/api/knowledge-base', {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            this.articles = Array.isArray(json) ? json : (json.data || []);
            localStorage.setItem('kb_articles_cache', JSON.stringify(this.articles));
        } catch (error) {
            console.warn('KB: usando cache local:', error.message);
            this.articles = JSON.parse(localStorage.getItem('kb_articles_cache')) || [];
        }
        this.filteredArticles = [...this.articles];
        this.renderArticles(this.filteredArticles);
    }

    // ─── Rendering ──────────────────────────────────────────────────────────

    renderArticles(articles) {
        const container = document.getElementById('articlesContainer');
        if (!container) return;
        if (!articles.length) {
            container.innerHTML = `<div class="col-12 text-center py-5 text-muted">
                <i class="fas fa-search fa-3x mb-3"></i><br>Nenhum artigo encontrado.
            </div>`;
            return;
        }
        container.innerHTML = articles.map(a => this.articleCard(a)).join('');
    }

    articleCard(a) {
        const id = a._id || a.id;
        const catColors = {
            manutencao:'success', reparacao:'danger',
            seguranca:'warning', avarias:'info', regulamentacao:'secondary'
        };
        const catLabels = {
            manutencao:'Manutenção', reparacao:'Reparação',
            seguranca:'Segurança', avarias:'Avarias', regulamentacao:'Regulamentação'
        };
        const diffLabels = { basico:'Básico', intermedio:'Intermédio', avancado:'Avançado' };
        const color   = catColors[a.category]   || 'secondary';
        const catLbl  = catLabels[a.category]   || a.category;
        const diffLbl = diffLabels[a.difficulty] || a.difficulty;
        const isBookmarked = this.bookmarkedArticles.includes(id);
        const featBadge = a.featured ? '<span class="badge badge-warning ml-1">Destaque</span>' : '';
        const tags = (a.tags||[]).slice(0,3).map(t => `<span class="badge badge-light border mr-1">${t}</span>`).join('');
        const updDate = a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('pt-PT') : '';

        return `<div class="col-md-6 col-lg-4 mb-3">
            <div class="card article-card h-100 border-left-${color}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge badge-${color}">${catLbl}</span>
                        <button class="btn btn-link btn-sm p-0 text-muted" onclick="knowledgeManager.toggleBookmark('${id}')" title="Favorito">
                            <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark ${isBookmarked ? 'text-warning' : ''}"></i>
                        </button>
                    </div>
                    <h6 class="card-title mb-1">${this.escHtml(a.title)}${featBadge}</h6>
                    <p class="card-text small text-muted mb-2">${this.escHtml((a.summary||'').substring(0,100))}${(a.summary||'').length>100?'…':''}</p>
                    <div class="mb-2">${tags}</div>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted"><i class="fas fa-signal mr-1"></i>${diffLbl} &nbsp; <i class="fas fa-eye mr-1"></i>${a.views||0}</small>
                        <small class="text-muted">${updDate}</small>
                    </div>
                </div>
                <div class="card-footer bg-transparent py-2">
                    <button class="btn btn-sm btn-outline-${color} w-100" onclick="knowledgeManager.viewArticle('${id}')">
                        <i class="fas fa-book-open mr-1"></i>Ler artigo
                    </button>
                </div>
            </div>
        </div>`;
    }

    renderPopularArticles() {
        const container = document.getElementById('popularArticles');
        if (!container) return;
        const popular = [...this.articles].sort((a,b) => (b.views||0) - (a.views||0)).slice(0, 5);
        if (!popular.length) { container.innerHTML = '<li class="list-group-item text-muted small">Nenhum artigo disponível</li>'; return; }
        container.innerHTML = popular.map(a => {
            const id = a._id || a.id;
            return `<li class="list-group-item list-group-item-action py-2 px-3" style="cursor:pointer" onclick="knowledgeManager.viewArticle('${id}')">
                <div class="d-flex justify-content-between">
                    <span class="small font-weight-bold">${this.escHtml(a.title.substring(0,50))}${a.title.length>50?'…':''}</span>
                    <span class="badge badge-light"><i class="fas fa-eye mr-1"></i>${a.views||0}</span>
                </div>
            </li>`;
        }).join('');
    }

    renderRecentArticles() {
        const container = document.getElementById('recentArticles');
        if (!container) return;
        const recent = [...this.articles].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
        if (!recent.length) { container.innerHTML = '<li class="list-group-item text-muted small">Nenhum artigo disponível</li>'; return; }
        container.innerHTML = recent.map(a => {
            const id = a._id || a.id;
            const date = a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('pt-PT') : '';
            return `<li class="list-group-item list-group-item-action py-2 px-3" style="cursor:pointer" onclick="knowledgeManager.viewArticle('${id}')">
                <div class="small font-weight-bold">${this.escHtml(a.title.substring(0,50))}${a.title.length>50?'…':''}</div>
                <div class="text-muted" style="font-size:.72rem">${date}</div>
            </li>`;
        }).join('');
    }

    renderRecommendedArticles() {
        const container = document.getElementById('recommendedArticles');
        if (!container) return;
        const featured = this.articles.filter(a => a.featured).slice(0, 4);
        const list = featured.length ? featured : this.articles.slice(0, 4);
        if (!list.length) { container.innerHTML = '<p class="text-muted small">Nenhum artigo disponível</p>'; return; }
        const catColors = { manutencao:'success', reparacao:'danger', seguranca:'warning', avarias:'info', regulamentacao:'secondary' };
        container.innerHTML = `<div class="row">${list.map(a => {
            const id = a._id || a.id;
            const color = catColors[a.category] || 'secondary';
            return `<div class="col-md-6 mb-2">
                <div class="card card-outline card-${color} h-100" style="cursor:pointer" onclick="knowledgeManager.viewArticle('${id}')">
                    <div class="card-body py-2 px-3">
                        <p class="mb-0 small font-weight-bold">${this.escHtml(a.title.substring(0,60))}${a.title.length>60?'…':''}</p>
                    </div>
                </div>
            </div>`;
        }).join('')}</div>`;
    }

    // ─── Filtros e pesquisa ──────────────────────────────────────────────────

    filterByTopic(topic) {
        this.currentFilter = topic;
        this.filteredArticles = topic === 'all'
            ? [...this.articles]
            : this.articles.filter(a => a.category === topic);
        this.renderArticles(this.filteredArticles);
        this.updateStatistics();
    }

    search(query) {
        if (!query.trim()) {
            this.filteredArticles = [...this.articles];
        } else {
            const q = query.toLowerCase();
            this.filteredArticles = this.articles.filter(a =>
                (a.title||'').toLowerCase().includes(q) ||
                (a.summary||'').toLowerCase().includes(q) ||
                (a.tags||[]).some(t => t.toLowerCase().includes(q))
            );
        }
        this.renderArticles(this.filteredArticles);
        this.updateStatistics();
    }

    // ─── Visualização de artigo ──────────────────────────────────────────────

    async viewArticle(id) {
        try {
            const res  = await fetch(`/api/knowledge-base/${id}`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            const json = await res.json();
            const article = json.data || json;
            if (!article || !article.title) throw new Error('Artigo não encontrado');

            window.currentArticleId = id;

            const modalTitle = document.querySelector('#viewArticleModal .modal-title');
            const modalBody  = document.getElementById('articleContent');
            if (modalTitle) modalTitle.textContent = article.title;
            if (modalBody)  modalBody.innerHTML = article.content || '<p class="text-muted">Sem conteúdo.</p>';

            fetch(`/api/knowledge-base/${id}/view`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            }).catch(() => {});

            if (window.$ && $('#viewArticleModal').length) $('#viewArticleModal').modal('show');
        } catch (err) {
            console.error('KB viewArticle:', err);
            alert('Erro ao carregar artigo: ' + err.message);
        }
    }

    // ─── Favoritos ───────────────────────────────────────────────────────────

    toggleBookmark(id) {
        const idx = this.bookmarkedArticles.indexOf(id);
        if (idx === -1) this.bookmarkedArticles.push(id);
        else            this.bookmarkedArticles.splice(idx, 1);
        localStorage.setItem('kb_bookmarks', JSON.stringify(this.bookmarkedArticles));
        this.renderArticles(this.filteredArticles);
    }

    // ─── Estatísticas ────────────────────────────────────────────────────────

    updateStatistics() {
        const total = this.articles.length;
        const catCounts = {};
        this.articles.forEach(a => { catCounts[a.category] = (catCounts[a.category]||0) + 1; });

        const el = document.getElementById('totalArticles');
        if (el) el.textContent = total;

        // Mapeia IDs dos contadores no HTML para categorias do DB
        const map = {
            repairCount:       'reparacao',
            maintenanceCount:  'manutencao',
            safetyCount:       'seguranca',
            troubleshootCount: 'avarias'
        };
        Object.entries(map).forEach(([elId, cat]) => {
            const e = document.getElementById(elId);
            if (e) e.textContent = catCounts[cat] || 0;
        });
    }

    // ─── Impressão / Download ─────────────────────────────────────────────────

    printArticle() {
        const content = document.getElementById('articleContent');
        if (!content) return;
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Artigo FestLift</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7}
table{width:100%;border-collapse:collapse;margin-bottom:1rem}td,th{border:1px solid #ccc;padding:8px}
.alert-warning{background:#fff3cd;padding:10px;border-left:4px solid #ffc107;margin:10px 0}
.alert-danger{background:#f8d7da;padding:10px;border-left:4px solid #dc3545;margin:10px 0}
.alert-info{background:#d1ecf1;padding:10px;border-left:4px solid #17a2b8;margin:10px 0}
ul,ol{padding-left:1.5rem}</style>
</head><body>${content.innerHTML}</body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 500);
    }

    downloadArticle() {
        const title   = document.querySelector('#viewArticleModal .modal-title')?.textContent || 'artigo';
        const content = document.getElementById('articleContent')?.innerHTML || '';
        const html    = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7}
table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px}
.alert-warning{background:#fff3cd;padding:10px;border-left:4px solid #ffc107;margin:10px 0}
.alert-danger{background:#f8d7da;padding:10px;border-left:4px solid #dc3545;margin:10px 0}
.alert-info{background:#d1ecf1;padding:10px;border-left:4px solid #17a2b8;margin:10px 0}
ul,ol{padding-left:1.5rem}</style>
</head><body>${content}</body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi,'_').substring(0,60)}.html`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ─── Utilitários ─────────────────────────────────────────────────────────

    escHtml(str) {
        return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    loadUserInfo() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const el = document.getElementById('techName');
        if (el && userData.firstName) el.textContent = `${userData.firstName} ${userData.lastName||''}`.trim();
    }

    setupEventListeners() {
        const searchEl = document.getElementById('knowledgeSearch');
        if (searchEl) {
            searchEl.addEventListener('input',   (e) => this.search(e.target.value));
            searchEl.addEventListener('keypress',(e) => { if (e.key === 'Enter') this.search(e.target.value); });
        }
    }
}
