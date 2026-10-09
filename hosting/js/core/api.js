import { state } from './state.js';

// Panggil endpoint PHP. POST otomatis membawa CSRF token. Error berisi pesan dari server.
export async function api(path, { method = 'GET', body } = {}) {
    const options = { method, headers: {}, credentials: 'same-origin', cache: 'no-store' };
    if (method !== 'GET') options.headers['X-CSRF-Token'] = state.csrf;
    if (body !== undefined) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    const res = await fetch(path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
        const err = new Error(data.error || `Server error (HTTP ${res.status})`);
        err.status = res.status;
        throw err;
    }
    return data;
}
