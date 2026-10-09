import { state } from './state.js';

function toError(res, data) {
    const err = new Error(data.error || `Server error (HTTP ${res.status})`);
    err.status = res.status;
    return err;
}

// Ambil CSRF token terbaru dari server.
export async function refreshCsrf() {
    const res = await fetch('api/auth.php', { credentials: 'same-origin', cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (data.csrf) state.csrf = data.csrf;
    return data;
}

// POST dengan CSRF token. Jika token kadaluarsa, ambil token baru lalu coba sekali lagi.
export async function post(path, { headers = {}, body } = {}) {
    for (let attempt = 0; ; attempt++) {
        const res = await fetch(path, {
            method: 'POST', credentials: 'same-origin', cache: 'no-store',
            headers: { ...headers, 'X-CSRF-Token': state.csrf }, body,
        });
        const data = await res.json().catch(() => ({}));
        if (data.csrfExpired && attempt === 0) {
            await refreshCsrf();
            continue;
        }
        if (!res.ok || data.ok === false) throw toError(res, data);
        return data;
    }
}

// Panggil endpoint PHP (JSON). Error berisi pesan dari server.
export async function api(path, { method = 'GET', body } = {}) {
    if (method !== 'GET') {
        return body === undefined
            ? post(path)
            : post(path, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    const res = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw toError(res, data);
    return data;
}
