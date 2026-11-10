/* Arquivo de relatórios: pesquisa, filtros, paginação, arquivar, PDF.
   Usado por admin/dispatcher inspection-template.html. Substitui loadInspectionHistory(). */
(function () {
    const state = { page: 1, limit: 25, q: '', status: '', archived: 'false', from: '', to: '', timer: null };
    const tok = () => sessionStorage.getItem('liftmanager_jwt') || localStorage.getItem('liftmanager_jwt') || localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    const H = () => ({ 'Authorization': 'Bearer ' + tok(), 'Content-Type': 'application/json' });
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const toast = (t, m) => (window.toastr ? toastr[t](m) : alert(m));
    const STATUS = { rascunho: ['warning', 'Rascunho'], finalizado: ['success', 'Finalizado'], enviado: ['info', 'Enviado'], arquivado: ['secondary', 'Arquivado'] };

    function mount() {
        const body = document.querySelector('#inspectionHistoryTable')?.closest('.card-body');
        if (!body || body.dataset.archive) return false;
        body.dataset.archive = '1';
        body.classList.remove('p-0');
        body.innerHTML = `
          <div class="form-row mb-2">
            <div class="col-md-4 mb-2"><input id="arcQ" class="form-control form-control-sm" placeholder="🔍 Pesquisar: nº, morada, cliente, email, técnico, nº municipal…"></div>
            <div class="col-md-2 mb-2"><input id="arcFrom" type="date" class="form-control form-control-sm" title="De"></div>
            <div class="col-md-2 mb-2"><input id="arcTo" type="date" class="form-control form-control-sm" title="Até"></div>
            <div class="col-md-2 mb-2"><select id="arcStatus" class="form-control form-control-sm">
              <option value="">Todos os estados</option><option value="enviado">Enviado</option><option value="finalizado">Finalizado</option><option value="rascunho">Rascunho</option></select></div>
            <div class="col-md-2 mb-2"><select id="arcArch" class="form-control form-control-sm">
              <option value="false">Activos</option><option value="true">Arquivados</option><option value="all">Todos</option></select></div>
          </div>
          <div id="arcBulk" class="mb-2" style="display:none">
            <button class="btn btn-xs btn-secondary" id="arcBulkBtn"></button>
          </div>
          <div class="table-responsive"><table class="table table-sm table-hover mb-0">
            <thead class="bg-light"><tr><th style="width:28px"><input type="checkbox" id="arcAll"></th><th>Número</th><th>Data</th><th>Cliente</th><th>Técnico</th><th>Localização</th><th>Estado</th><th class="text-right">Ações</th></tr></thead>
            <tbody id="arcBody"></tbody></table></div>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <small id="arcInfo" class="text-muted"></small>
            <div><button class="btn btn-xs btn-default" id="arcPrev">‹ Anterior</button>
            <span id="arcPage" class="mx-2 small"></span>
            <button class="btn btn-xs btn-default" id="arcNext">Seguinte ›</button></div>
          </div>`;
        const reload = () => { state.page = 1; load(); };
        document.getElementById('arcQ').addEventListener('input', e => { state.q = e.target.value; clearTimeout(state.timer); state.timer = setTimeout(reload, 300); });
        document.getElementById('arcFrom').addEventListener('change', e => { state.from = e.target.value; reload(); });
        document.getElementById('arcTo').addEventListener('change', e => { state.to = e.target.value; reload(); });
        document.getElementById('arcStatus').addEventListener('change', e => { state.status = e.target.value; reload(); });
        document.getElementById('arcArch').addEventListener('change', e => { state.archived = e.target.value; reload(); });
        document.getElementById('arcPrev').addEventListener('click', () => { if (state.page > 1) { state.page--; load(); } });
        document.getElementById('arcNext').addEventListener('click', () => { state.page++; load(); });
        document.getElementById('arcAll').addEventListener('change', e => { document.querySelectorAll('.arc-chk').forEach(c => c.checked = e.target.checked); updBulk(); });
        document.getElementById('arcBulkBtn').addEventListener('click', bulk);
        document.getElementById('arcBody').addEventListener('click', onClick);
        document.getElementById('arcBody').addEventListener('change', e => { if (e.target.classList.contains('arc-chk')) updBulk(); });
        return true;
    }

    function selected() { return [...document.querySelectorAll('.arc-chk:checked')].map(c => c.value); }
    function updBulk() {
        const n = selected().length, box = document.getElementById('arcBulk');
        box.style.display = n ? 'block' : 'none';
        document.getElementById('arcBulkBtn').textContent = (state.archived === 'true' ? 'Desarquivar' : 'Arquivar') + ` ${n} seleccionado(s)`;
    }
    async function bulk() {
        const ids = selected(); if (!ids.length) return;
        const r = await fetch('/api/inspections/bulk-archive', { method: 'POST', headers: H(), body: JSON.stringify({ ids, archived: state.archived !== 'true' }) });
        const d = await r.json(); if (d.success) { toast('success', d.modified + ' relatório(s) actualizado(s)'); load(); } else toast('error', d.message || 'Erro');
    }

    async function load() {
        const body = document.getElementById('arcBody'); if (!body) return;
        body.innerHTML = '<tr><td colspan="8" class="text-center text-muted p-3"><i class="fas fa-spinner fa-spin"></i> A carregar…</td></tr>';
        const p = new URLSearchParams({ light: '1', page: state.page, limit: state.limit, archived: state.archived });
        ['q', 'status', 'from', 'to'].forEach(k => state[k] && p.set(k, state[k]));
        try {
            const r = await fetch('/api/inspections?' + p, { headers: H() });
            const d = await r.json();
            if (!d.success) throw new Error(d.message || 'Erro');
            if (!d.data.length) body.innerHTML = '<tr><td colspan="8" class="text-center text-muted p-3">Nenhum relatório encontrado.</td></tr>';
            else body.innerHTML = d.data.map(i => {
                const [b, t] = STATUS[i.status] || ['secondary', esc(i.status)];
                const dt = i.data ? new Date(i.data).toLocaleDateString('pt-PT') : '—';
                const arch = i.archived;
                return `<tr data-id="${i._id}" data-num="${esc(i.numero)}">
                  <td><input type="checkbox" class="arc-chk" value="${i._id}"></td>
                  <td><strong>${esc(i.numero)}</strong>${i.restored ? ' <span class="badge badge-light" title="Registo restaurado (só cabeçalho)">restaurado</span>' : ''}</td>
                  <td>${dt}</td><td>${esc(i.clientName)}<br><small class="text-muted">${esc(i.clientEmail)}</small></td>
                  <td>${esc(i.inspector)}</td><td>${esc(i.liftLocation)}</td>
                  <td><span class="badge badge-${b}">${t}</span></td>
                  <td class="text-right text-nowrap">
                    ${typeof window.loadInspectionFromDB === 'function' ? '<button class="btn btn-xs btn-primary mr-1" data-act="load" title="Carregar no formulário"><i class="fas fa-upload"></i></button>' : ''}
                    <button class="btn btn-xs btn-info mr-1" data-act="pdf" title="Descarregar PDF"><i class="fas fa-file-pdf"></i> PDF</button>
                    <button class="btn btn-xs btn-secondary mr-1" data-act="arch" title="${arch ? 'Desarquivar' : 'Arquivar'}"><i class="fas fa-${arch ? 'box-open' : 'archive'}"></i></button>
                    <button class="btn btn-xs btn-danger" data-act="del" title="Apagar"><i class="fas fa-trash"></i></button>
                  </td></tr>`;
            }).join('');
            document.getElementById('arcInfo').textContent = `${d.total} relatório(s)`;
            document.getElementById('arcPage').textContent = `Página ${d.page} / ${d.pages}`;
            document.getElementById('arcPrev').disabled = d.page <= 1;
            document.getElementById('arcNext').disabled = d.page >= d.pages;
            document.getElementById('arcAll').checked = false; updBulk();
        } catch (e) {
            body.innerHTML = '<tr><td colspan="8" class="text-center text-danger p-3">Erro ao carregar. Verifique a ligação.</td></tr>';
        }
    }

    async function onClick(e) {
        const btn = e.target.closest('button[data-act]'); if (!btn) return;
        const tr = btn.closest('tr'), id = tr.dataset.id, num = tr.dataset.num, act = btn.dataset.act;
        if (act === 'load') return window.loadInspectionFromDB(id);
        if (act === 'pdf') {
            try {
                const r = await fetch(`/api/inspections/${id}/pdf`, { headers: { 'Authorization': 'Bearer ' + tok() } });
                if (!r.ok) throw new Error('Erro ' + r.status);
                const url = URL.createObjectURL(await r.blob());
                const a = document.createElement('a'); a.href = url; a.download = `Relatorio_${num.replace(/[\/\\]/g, '-')}.pdf`;
                document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
            } catch (err) { toast('error', 'Não foi possível gerar o PDF'); }
        } else if (act === 'arch') {
            const r = await fetch(`/api/inspections/${id}/archive`, { method: 'PATCH', headers: H(), body: JSON.stringify({ archived: state.archived !== 'true' }) });
            const d = await r.json(); if (d.success) load(); else toast('error', d.message || 'Erro');
        } else if (act === 'del') {
            if (!confirm(`Apagar definitivamente o relatório ${num}? (prefira Arquivar)`)) return;
            const r = await fetch(`/api/inspections/${id}`, { method: 'DELETE', headers: H() });
            const d = await r.json(); if (d.success) load(); else toast('error', d.message || 'Erro');
        }
    }

    window.loadInspectionHistory = function () { if (mount() || document.getElementById('arcBody')) load(); };
})();
