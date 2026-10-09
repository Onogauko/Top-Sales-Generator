import { state } from './core/state.js';

export function letterToIdx(l) {
    let r = 0;
    for (let i = 0; i < l.length; i++) r = r * 26 + (l.charCodeAt(i) - 64);
    return r - 1;
}

export function cleanNum(val) {
    if (val === null || val === undefined) return 0;
    let str = String(val).trim();
    if (str === '' || str === '-') return 0;
    if (/^\d{1,3}(\.\d{3})+$/.test(str)) str = str.replace(/\./g, '');
    else if (/^\d{1,3}(\.\d{3})+,\d+$/.test(str)) str = str.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(,\d{3})+$/.test(str)) str = str.replace(/,/g, '');
    else if (/^\d{1,3}(,\d{3})+\.\d+$/.test(str)) str = str.replace(/,/g, '');
    const num = Number(str);
    return isNaN(num) ? 0 : num;
}

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Index kolom CSV untuk setiap store sesuai konfigurasi.
export function storeCols() {
    return state.config.stores.map(s => letterToIdx(s.col));
}

// Label kolom store: nama dari konfigurasi, atau header CSV, atau huruf kolom.
export function storeLabel(k) {
    const s = state.config.stores[k];
    return s.name || state.headers[letterToIdx(s.col)] || s.col;
}
