// assets/js/manuais-lib.js — biblioteca de manuais/esquemas (pesquisa, filtros, ordenação)
// Uso: <div id="manuaisLib"></div> + window.MANUAIS_STAFF = true (admin/dispatcher: enviar/editar) antes de carregar.
(function () {
    const STAFF = !!window.MANUAIS_STAFF;
    const IS_ADMIN = !!window.MANUAIS_ADMIN;
    const root = document.getElementById('manuaisLib');
    if (!root) return;

    const TYPES = { schematic: 'Esquemas eléctricos', programming: 'Programação / parâmetros', troubleshooting: 'Avarias / diagnóstico', installation: 'Instalação / arranque', manual: 'Manual geral', quickref: 'Guia rápido' };
    const COMPS = { controller: 'Quadro / maniobra', drive: 'Variador / inversor', panel: 'Painel / botoneira', alarm: 'Alarme / GSM', governor: 'Limitador / pára-quedas', machine: 'Máquina de tracção', hydraulic: 'Hidráulico', other: 'Outro' };
    const LANGS = { pt: 'Português', es: 'Espanhol', en: 'Inglês', ru: 'Russo', other: 'Outro' };
    const TYPE_ICON = { schematic: 'fa-project-diagram text-primary', programming: 'fa-sliders-h text-success', troubleshooting: 'fa-search text-danger', installation: 'fa-tools text-info', manual: 'fa-book text-secondary', quickref: 'fa-bolt text-warning' };
    const SORTS = { recent: 'Mais recentes', title: 'Título (A–Z)', brand: 'Marca (A–Z)', pages: 'Mais páginas', views: 'Mais abertos' };

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const token = () => (window.AuthManager && AuthManager.getToken && AuthManager.getToken()) || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || '';
    const toast = (t, m) => (window.toastr ? toastr[t](m) : console.log(t, m));
    const opts = (map, all) => (all ? `<option value="">${all}</option>` : '') + Object.entries(map).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join('');

    async function api(url, method, body, isForm) {
        const run = () => fetch(url, { method: method || 'GET', headers: Object.assign({ Authorization: 'Bearer ' + token() }, body && !isForm ? { 'Content-Type': 'application/json' } : {}), body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
        let res = await run();
        if ((res.status === 401 || res.status === 403) && window.AuthManager && AuthManager.refreshAccessToken) {
            if (await AuthManager.refreshAccessToken().catch(() => false)) res = await run();
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || ('HTTP ' + res.status));
        return json;
    }

    root.innerHTML = `
      <div class="row">
        <div class="col-lg-4 col-md-6 mb-2"><input type="search" id="mlQ" class="form-control" placeholder="Pesquisar em todos os manuais (ex.: erro 12, parâmetro velocidade)..." autocomplete="off"></div>
        <div class="col-lg-2 col-6 mb-2"><select id="mlBrand" class="form-control"></select></div>
        <div class="col-lg-2 col-6 mb-2"><select id="mlType" class="form-control"></select></div>
        <div class="col-lg-2 col-6 mb-2"><select id="mlComp" class="form-control"></select></div>
        <div class="col-lg-1 col-3 mb-2"><select id="mlLang" class="form-control"></select></div>
        <div class="col-lg-1 col-3 mb-2"><select id="mlSort" class="form-control" title="Ordenar">${opts(SORTS)}</select></div>
      </div>
      <div class="d-flex align-items-center mb-2">
        <span id="mlCount" class="text-muted small"></span>
        <i id="mlSpin" class="fas fa-spinner fa-spin ml-2 text-muted" style="display:none"></i>
        <a href="#" id="mlReset" class="small ml-3" style="display:none">Limpar filtros</a>
        ${STAFF ? '<button type="button" id="mlUpload" class="btn btn-primary btn-sm ml-auto"><i class="fas fa-upload mr-1"></i>Enviar PDF</button>' : ''}
      </div>
      <div id="mlList"></div>`;

    const $ = (id) => document.getElementById(id);
    let facets = {}, timer = null, seq = 0, lastQ = '', docs = [];

    function fillSelect(el, map, label, counts, keep) {
        const cur = keep !== undefined ? keep : el.value;
        const keys = Object.keys(counts || {}).sort((a, b) => (map ? (map[a] || a) : a).localeCompare(map ? (map[b] || b) : b, 'pt'));
        el.innerHTML = `<option value="">${label}</option>` + keys.map(k => `<option value="${esc(k)}">${esc(map ? (map[k] || k) : k)} (${counts[k]})</option>`).join('');
        el.value = cur;
        if (el.value !== cur) el.value = '';
    }

    function params() {
        const p = new URLSearchParams();
        const q = $('mlQ').value.trim();
        if (q) p.set('q', q);
        [['mlBrand', 'brand'], ['mlType', 'docType'], ['mlComp', 'component'], ['mlLang', 'language'], ['mlSort', 'sort']].forEach(([id, k]) => { if ($(id).value) p.set(k, $(id).value); });
        if (STAFF) p.set('all', '1');
        return p;
    }

    function highlight(text, q) {
        let out = esc(text);
        norm(q).split(/\s+/).filter(w => w.length >= 2).forEach(w => {
            // realce simples e seguro (texto já escapado); ignora acentos só na pesquisa, não no realce
            const ew = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp((w.length <= 3 || /^\d+$/.test(w)) ? '(?<![A-Za-z0-9])(' + ew + ')(?![A-Za-z0-9])' : '(' + ew + ')', 'gi');
            out = out.replace(re, '<mark>$1</mark>');
        });
        return out;
    }

    function fileUrl(d, page) { return '/uploads/manuais/' + encodeURIComponent(d.filename) + (page ? '#page=' + page : ''); }

    function render(list, q) {
        docs = list;
        if (!list.length) { $('mlList').innerHTML = '<p class="text-muted py-3">Nenhum documento encontrado.</p>'; return; }
        $('mlList').innerHTML = '<div class="table-responsive"><table class="table table-hover table-sm mb-0"><thead><tr><th>Documento</th><th class="d-none d-md-table-cell">Tipo</th><th class="d-none d-md-table-cell text-center">Págs.</th><th class="text-right"></th></tr></thead><tbody>' +
            list.map((d, i) => {
                const sn = (d.snippets || []).map(s => `<div class="small text-muted mt-1"><a href="${fileUrl(d, s.page)}" target="_blank" rel="noopener" data-view="${i}">p.${s.page}</a> — …${highlight(s.text, q)}…</div>`).join('');
                const more = d.hitCount > (d.snippets || []).length ? `<div class="small text-muted">+ ${d.hitCount - d.snippets.length} páginas com resultados</div>` : '';
                return `<tr>
                  <td><i class="fas ${TYPE_ICON[d.docType] || 'fa-file-pdf'} mr-2"></i><a href="${fileUrl(d)}" target="_blank" rel="noopener" data-view="${i}"><strong>${highlight(d.title, q)}</strong></a>
                    ${STAFF && d.reviewed === false ? '<span class="badge badge-warning ml-1">por rever</span>' : ''}${STAFF && d.published === false ? '<span class="badge badge-secondary ml-1">oculto</span>' : ''}${d.hasText ? '' : '<span class="badge badge-light ml-1" title="PDF digitalizado: pesquisa só por título e etiquetas">sem texto</span>'}
                    <div class="small text-muted">${esc(d.brand)}${d.model ? ' · ' + esc(d.model) : ''} · ${esc(COMPS[d.component] || '')} · ${esc(LANGS[d.language] || '')}</div>
                    ${(d.tags || []).length ? '<div class="mt-1">' + d.tags.map(t => `<span class="badge badge-pill badge-light border mr-1">${esc(t)}</span>`).join('') + '</div>' : ''}
                    ${sn}${more}</td>
                  <td class="d-none d-md-table-cell">${esc(TYPES[d.docType] || '')}</td>
                  <td class="d-none d-md-table-cell text-center">${d.pages || ''}</td>
                  <td class="text-right text-nowrap"><a class="btn btn-sm btn-outline-primary" href="${fileUrl(d)}" target="_blank" rel="noopener" data-view="${i}"><i class="fas fa-book-open"></i> Abrir</a>
                    ${STAFF ? `<button class="btn btn-sm btn-outline-secondary ml-1" data-edit="${i}" title="Editar"><i class="fas fa-edit"></i></button>` : ''}
                    ${IS_ADMIN ? `<button class="btn btn-sm btn-outline-danger ml-1" data-del="${i}" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}</td></tr>`;
            }).join('') + '</tbody></table></div>';
    }

    async function load(refreshFacets) {
        const my = ++seq;
        $('mlSpin').style.display = '';
        try {
            const r = await api('/api/manuais?' + params().toString());
            if (my !== seq) return;
            lastQ = $('mlQ').value.trim();
            // facetas calculadas sobre os resultados actuais; mantém o valor seleccionado visível
            const fb = $('mlBrand').value, ft = $('mlType').value, fc = $('mlComp').value, fl = $('mlLang').value;
            facets = r.facets;
            fillSelect($('mlBrand'), null, 'Todas as marcas', Object.assign({}, fb ? { [fb]: 0 } : {}, r.facets.brand), fb);
            fillSelect($('mlType'), TYPES, 'Todos os tipos', Object.assign({}, ft ? { [ft]: 0 } : {}, r.facets.docType), ft);
            fillSelect($('mlComp'), COMPS, 'Todos os componentes', Object.assign({}, fc ? { [fc]: 0 } : {}, r.facets.component), fc);
            fillSelect($('mlLang'), LANGS, 'Idioma', Object.assign({}, fl ? { [fl]: 0 } : {}, r.facets.language), fl);
            $('mlCount').textContent = r.total + (r.total === 1 ? ' documento' : ' documentos');
            const filtered = lastQ || fb || ft || fc || fl;
            $('mlReset').style.display = filtered ? '' : 'none';
            render(r.data, lastQ);
        } catch (e) {
            $('mlList').innerHTML = '<p class="text-danger py-3">Erro ao carregar documentos: ' + esc(e.message) + '</p>';
        } finally { if (my === seq) $('mlSpin').style.display = 'none'; }
    }

    $('mlQ').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 300); });
    ['mlBrand', 'mlType', 'mlComp', 'mlLang', 'mlSort'].forEach(id => $(id).addEventListener('change', () => load()));
    $('mlReset').addEventListener('click', (e) => {
        e.preventDefault(); $('mlQ').value = '';
        ['mlBrand', 'mlType', 'mlComp', 'mlLang'].forEach(id => { $(id).value = ''; });
        load();
    });
    $('mlSort').value = 'recent';

    root.addEventListener('click', (e) => {
        const v = e.target.closest('[data-view]');
        if (v) { const d = docs[+v.dataset.view]; if (d) api('/api/manuais/' + d._id + '/view', 'POST').catch(() => {}); return; }
        const ed = e.target.closest('[data-edit]');
        if (ed) return openForm(docs[+ed.dataset.edit]);
        const del = e.target.closest('[data-del]');
        if (del) return remove(docs[+del.dataset.del]);
        if (e.target.closest('#mlUpload')) openForm(null);
    });

    // ── Staff: enviar / editar / eliminar ────────────────────
    function ensureModal() {
        if ($('mlModal')) return;
        const m = document.createElement('div');
        m.innerHTML = `<div class="modal fade" id="mlModal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">
          <div class="modal-header"><h5 class="modal-title" id="mlModalTitle"></h5><button type="button" class="close" data-dismiss="modal">&times;</button></div>
          <div class="modal-body">
            <div class="form-group" id="mlFileGrp"><label>Ficheiro PDF (máx. 40 MB)</label><input type="file" id="mlFile" accept="application/pdf" class="form-control-file"><small class="text-muted">Marca, tipo e idioma são sugeridos automaticamente; confirme antes de guardar.</small></div>
            <div class="form-group"><label>Título</label><input id="mlfTitle" class="form-control" maxlength="200"></div>
            <div class="row">
              <div class="form-group col-md-6"><label>Marca</label><input id="mlfBrand" class="form-control" list="mlBrands" maxlength="60"><datalist id="mlBrands"></datalist></div>
              <div class="form-group col-md-6"><label>Modelo</label><input id="mlfModel" class="form-control" maxlength="80"></div>
              <div class="form-group col-md-4"><label>Tipo</label><select id="mlfType" class="form-control">${opts(TYPES)}</select></div>
              <div class="form-group col-md-4"><label>Componente</label><select id="mlfComp" class="form-control">${opts(COMPS)}</select></div>
              <div class="form-group col-md-4"><label>Idioma</label><select id="mlfLang" class="form-control">${opts(LANGS)}</select></div>
            </div>
            <div class="form-group"><label>Etiquetas (separadas por vírgula)</label><input id="mlfTags" class="form-control"></div>
            <div class="form-group"><label>Notas</label><textarea id="mlfNotes" class="form-control" rows="2" maxlength="1000"></textarea></div>
            <div class="custom-control custom-switch"><input type="checkbox" class="custom-control-input" id="mlfPub"><label class="custom-control-label" for="mlfPub">Visível para técnicos</label></div>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button class="btn btn-primary" id="mlSave"><i class="fas fa-save mr-1"></i>Guardar</button></div>
        </div></div></div>`;
        document.body.appendChild(m.firstChild);
        $('mlSave').addEventListener('click', save);
        $('mlFile').addEventListener('change', () => {
            const f = $('mlFile').files[0];
            if (f && !$('mlfTitle').value) $('mlfTitle').value = f.name.replace(/\.pdf$/i, '').replace(/_+/g, ' ');
        });
    }
    let editing = null;
    function openForm(d) {
        ensureModal(); editing = d;
        $('mlModalTitle').textContent = d ? 'Editar documento' : 'Enviar novo PDF';
        $('mlFileGrp').style.display = d ? 'none' : '';
        $('mlFile').value = '';
        $('mlBrands').innerHTML = Object.keys(facets.brand || {}).map(b => `<option value="${esc(b)}">`).join('');
        const x = d || { title: '', brand: '', model: '', docType: 'manual', component: 'controller', language: 'pt', tags: [], notes: '', published: true };
        $('mlfTitle').value = x.title; $('mlfBrand').value = x.brand === 'Outro' && !d ? '' : x.brand; $('mlfModel').value = x.model || '';
        $('mlfType').value = x.docType; $('mlfComp').value = x.component; $('mlfLang').value = x.language;
        $('mlfTags').value = (x.tags || []).join(', '); $('mlfNotes').value = x.notes || ''; $('mlfPub').checked = x.published !== false;
        window.jQuery('#mlModal').modal('show');
    }
    async function save() {
        const btn = $('mlSave');
        const body = { title: $('mlfTitle').value, brand: $('mlfBrand').value, model: $('mlfModel').value, docType: $('mlfType').value, component: $('mlfComp').value, language: $('mlfLang').value, tags: $('mlfTags').value, notes: $('mlfNotes').value, published: $('mlfPub').checked };
        if (!body.title.trim()) return toast('warning', 'Indique o título.');
        btn.disabled = true; const old = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>A guardar...';
        try {
            if (editing) await api('/api/manuais/' + editing._id, 'PUT', body);
            else {
                const f = $('mlFile').files[0];
                if (!f) throw new Error('Seleccione um ficheiro PDF.');
                const fd = new FormData();
                Object.entries(body).forEach(([k, v]) => fd.append(k, v));
                fd.append('file', f);
                await api('/api/manuais', 'POST', fd, true);
            }
            window.jQuery('#mlModal').modal('hide');
            toast('success', 'Documento guardado.');
            load();
        } catch (e) { toast('error', e.message); }
        finally { btn.disabled = false; btn.innerHTML = old; }
    }
    async function remove(d) {
        const ok = window.Swal ? (await Swal.fire({ title: 'Eliminar documento?', text: d.title, icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar' })).isConfirmed : window.confirm('Eliminar "' + d.title + '"?');
        if (!ok) return;
        try { await api('/api/manuais/' + d._id, 'DELETE'); toast('success', 'Documento eliminado.'); load(); }
        catch (e) { toast('error', e.message); }
    }

    window.manuaisReload = load;
    load();
})();
