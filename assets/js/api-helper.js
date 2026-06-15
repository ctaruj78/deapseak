/**
 * api-helper.js — Centralized fetch wrapper with error handling
 * Include this in every page: <script src="/assets/js/api-helper.js"></script>
 */

// ── Toast notification (non-blocking error UI) ─────────────────────────────
function _showToast(message, type = 'danger', duration = 5000) {
    let container = document.getElementById('api-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'api-toast-container';
        container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:380px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const icon = type === 'danger' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    toast.style.cssText = `
        background:${type==='danger'?'#dc3545':type==='warning'?'#ffc107':type==='success'?'#28a745':'#17a2b8'};
        color:${type==='warning'?'#212529':'#fff'};
        padding:12px 16px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.25);
        font-size:14px;line-height:1.4;cursor:pointer;word-break:break-word;
        animation:slideIn .25s ease;
    `;
    toast.innerHTML = `${icon} ${message}`;
    toast.onclick = () => toast.remove();

    if (!document.querySelector('#api-toast-style')) {
        const style = document.createElement('style');
        style.id = 'api-toast-style';
        style.textContent = '@keyframes slideIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}';
        document.head.appendChild(style);
    }

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('fade') || toast.remove(), duration);
}

// ── Token helper ───────────────────────────────────────────────────────────
function _getToken() {
    return localStorage.getItem('token') ||
           localStorage.getItem('liftmanager_jwt') ||
           localStorage.getItem('authToken') ||
           localStorage.getItem('lm_token') ||
           localStorage.getItem('deapseak_token') ||
           sessionStorage.getItem('liftmanager_jwt') ||
           sessionStorage.getItem('token') || '';
}

function _clearTokensAndRedirect() {
    ['token', 'lm_token', 'deapseak_token'].forEach(k => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
    });
    setTimeout(() => {
        window.location.replace('/pages/auth/login.html');
    }, 1500);
}

// ── Main fetch wrapper ─────────────────────────────────────────────────────
/**
 * apiFetch(url, options)
 *   - Auto-injects Authorization header
 *   - Handles 401 → logout + redirect
 *   - Shows toast for network errors
 *   - Returns parsed JSON or throws
 *
 * Usage:
 *   const data = await apiFetch('/api/lifts');
 *   const data = await apiFetch('/api/lifts', { method: 'POST', body: JSON.stringify({...}) });
 */
async function apiFetch(url, options = {}) {
    const token = _getToken();

    const defaultHeaders = { 'Content-Type': 'application/json' };
    if (token) defaultHeaders['Authorization'] = `Bearer ${token}`;

    const mergedOptions = {
        ...options,
        headers: { ...defaultHeaders, ...(options.headers || {}) },
    };

    let response;
    try {
        response = await fetch(url, mergedOptions);
    } catch (networkErr) {
        _showToast('Sem ligação ao servidor. Verifique a sua ligação à internet.', 'danger');
        throw networkErr;
    }

    // Session expired — try auto-refresh first
    if (response.status === 401) {
        const refreshed = (typeof AuthManager !== 'undefined') && await AuthManager.refreshAccessToken().catch(() => false);
        if (refreshed) {
            // Retry original request with new token
            const newToken = _getToken();
            mergedOptions.headers['Authorization'] = `Bearer ${newToken}`;
            const retryResp = await fetch(url, mergedOptions).catch(() => null);
            if (retryResp && retryResp.ok) {
                const contentType = retryResp.headers.get('content-type') || '';
                return contentType.includes('application/json') ? retryResp.json() : retryResp;
            }
        }
        _showToast('Sessão expirada. A redirecionar para o login...', 'warning', 3000);
        _clearTokensAndRedirect();
        throw new Error('Session expired — redirecting to login');
    }

    // Server errors
    if (response.status >= 500) {
        _showToast(`Erro do servidor (${response.status}). Tente novamente mais tarde.`, 'danger');
        throw new Error(`Server error: ${response.status}`);
    }

    // Parse JSON (even on 4xx — API returns error messages in body)
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        data = await response.json();
    } else {
        return response; // Return raw response for non-JSON (file downloads, etc.)
    }

    // API-level errors (success: false)
    if (response.status >= 400 && !data.success) {
        const msg = data.message || data.error || `Erro ${response.status}`;
        _showToast(msg, 'warning');
        throw new Error(msg);
    }

    return data;
}

// ── Global unhandled error catcher ─────────────────────────────────────────
window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason);
    // Ignore expected/handled errors
    if (!msg || msg.includes('Session expired') || msg.includes('Unauthorized')) return;
    console.warn('[apiFetch] Unhandled promise rejection:', msg);
    // Only show UI error for non-trivial uncaught promises
    if (event.reason?.isApiError) {
        _showToast(msg, 'danger');
    }
});

// Expose globally
window.apiFetch = apiFetch;
window.showToast = _showToast;
