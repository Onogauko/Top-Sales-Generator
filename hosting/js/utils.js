import { state } from './core/state.js';

export function letterToIdx(l) {
    let r = 0;
    for (let i = 0; i < l.length; i++) r = r * 26 + (l.charCodeAt(i) - 64);
    return r - 1;
}

// Baca angka dari CSV. Mendukung format Indonesia & internasional:
//   1.234.567 · 1.234,5 · 1,234,567 · 1,234.5 · 12,5 · 12.5 · -1.234 · 1.234- · (1.234)
// Hasil NaN jika bukan angka (kosong / "-" dianggap 0).
export function parseNum(val) {
    if (val === null || val === undefined) return 0;
    let str = String(val).replace(/\s/g, '');
    if (str === '' || str === '-') return 0;

    let negative = false;
    if (/^\(.*\)$/.test(str)) { negative = true; str = str.slice(1, -1); }     // (1.234)
    if (str.startsWith('-')) { negative = !negative; str = str.slice(1); }      // -1.234
    else if (str.endsWith('-')) { negative = !negative; str = str.slice(0, -1); } // 1.234- (format SAP)

    if (/^\d{1,3}(\.\d{3})+$/.test(str)) str = str.replace(/\./g, '');                        // 1.234.567
    else if (/^\d{1,3}(\.\d{3})+,\d+$/.test(str)) str = str.replace(/\./g, '').replace(',', '.'); // 1.234,5
    else if (/^\d{1,3}(,\d{3})+$/.test(str)) str = str.replace(/,/g, '');                      // 1,234,567
    else if (/^\d{1,3}(,\d{3})+\.\d+$/.test(str)) str = str.replace(/,/g, '');                 // 1,234.5
    else if (/^\d*,\d+$/.test(str)) str = str.replace(',', '.');                              // 12,5

    if (!/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(str)) return NaN;
    const num = Number(str);
    return negative ? -num : num;
}

// Seperti parseNum, tapi nilai yang bukan angka dihitung 0.
export function cleanNum(val) {
    const num = parseNum(val);
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
