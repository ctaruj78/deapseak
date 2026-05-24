/**
 * FestLift — Client Monitor
 * Відправляє на сервер: JS помилки, API помилки, навігацію, дії користувача
 * Підключити у всіх сторінках: <script src="../../assets/js/monitor.js"></script>
 */
(function() {
    'use strict';

    const ENDPOINT = '/api/monitor/log';
    const BATCH_DELAY = 1500; // ms — збираємо в пакет і відправляємо
    let queue = [];
    let timer = null;

    function getUser() {
        try {
            const u = JSON.parse(sessionStorage.getItem('liftmanager_user') || localStorage.getItem('liftmanager_user') || '{}');
            return u.email || u.username || null;
        } catch(e) { return null; }
    }

    function send(type, message, data) {
        queue.push({
            type,
            message: String(message).slice(0, 500),
            url: window.location.pathname + window.location.search,
            user: getUser(),
            data: data || null,
            ts: new Date().toISOString()
        });
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, BATCH_DELAY);
    }

    function flush() {
        if (!queue.length) return;
        const batch = queue.splice(0);
        batch.forEach(entry => {
            fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
                keepalive: true
            }).catch(() => {}); // silently fail
        });
    }

    // ── 1. JS помилки ──────────────────────────────────────────
    window.addEventListener('error', function(e) {
        send('error', e.message, {
            file: e.filename,
            line: e.lineno,
            col: e.colno,
            stack: e.error ? String(e.error.stack).slice(0, 500) : null
        });
    });

    window.addEventListener('unhandledrejection', function(e) {
        send('error', 'Unhandled Promise: ' + (e.reason?.message || e.reason), {
            stack: e.reason?.stack ? String(e.reason.stack).slice(0, 500) : null
        });
    });

    // ── 2. Навігація (яку сторінку відкрив) ────────────────────
    send('nav', 'PAGE_OPEN', { referrer: document.referrer });

    window.addEventListener('beforeunload', function() {
        queue.push({
            type: 'nav',
            message: 'PAGE_CLOSE',
            url: window.location.pathname + window.location.search,
            user: getUser(),
            ts: new Date().toISOString()
        });
        flush();
    });

    // ── 3. Перехоплення fetch — ловимо API помилки ──────────────
    const origFetch = window.fetch;
    window.fetch = function(url, opts) {
        const start = Date.now();
        return origFetch.apply(this, arguments).then(function(resp) {
            const ms = Date.now() - start;
            if (!resp.ok && String(url).startsWith('/api/')) {
                send('api-error', `${resp.status} ${opts?.method || 'GET'} ${url}`, { ms, status: resp.status });
            } else if (String(url).startsWith('/api/') && ms > 3000) {
                send('warn', `SLOW API ${ms}ms: ${url}`, { ms });
            }
            return resp;
        }).catch(function(err) {
            send('api-error', `FETCH FAIL: ${url} — ${err.message}`, {});
            throw err;
        });
    };

    // ── 4. Кліки на важливих елементах ─────────────────────────
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('button[data-monitor], a[data-monitor]');
        if (btn) {
            send('action', btn.dataset.monitor || btn.textContent.trim().slice(0, 60), {
                tag: btn.tagName, href: btn.href || null
            });
        }
    }, { passive: true });

    // ── 5. Console.error перехоплення ──────────────────────────
    const origError = console.error;
    console.error = function() {
        origError.apply(console, arguments);
        const msg = Array.from(arguments).map(a => {
            try { return typeof a === 'object' ? JSON.stringify(a).slice(0, 200) : String(a); }
            catch(e) { return String(a); }
        }).join(' ').slice(0, 500);
        send('error', msg, null);
    };

    // flush при закритті сторінки
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') flush();
    });

    // Публічний API для ручного логування
    window.monitor = {
        log:    (msg, data) => send('info',   msg, data),
        warn:   (msg, data) => send('warn',   msg, data),
        error:  (msg, data) => send('error',  msg, data),
        action: (msg, data) => send('action', msg, data),
    };

})();
