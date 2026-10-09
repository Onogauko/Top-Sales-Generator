import { state } from './core/state.js';
import { cleanNum, escapeHtml, storeCols, storeLabel } from './utils.js';

export const COL_DEPT = 3, COL_SKU = 5, COL_DESC = 6;

export function rankLimit() {
    return parseInt(document.getElementById('rankLimit').value);
}

// Agregasi per divisi: dipakai bersama oleh tampilan tabel, pencarian dan export Excel.
// Hasil: [{ div, items, storeRankings }]
//   items         = semua item divisi, urut Total All Store terbesar, masing-masing punya .rank
//   storeRankings = storeRankings[kolom] = Map(sku -> rank di store itu)
// Hasil di-cache selama data & konfigurasi tidak berubah (pencarian/ganti Top N tidak menghitung ulang).
let cache = { rawData: null, config: null, result: null };

export function buildReport() {
    if (cache.rawData === state.rawData && cache.config === state.config) return cache.result;
    const amountIdx = storeCols();
    const divisions = state.config.divisions;
    const result = [];

    Object.keys(divisions).forEach(div => {
        const rows = state.rawData.filter(r => {
            const codes = String(r[COL_DEPT] || '').match(/\d+/g) || [];
            return codes.some(c => divisions[div].includes(c));
        });
        if (!rows.length) return;

        const map = new Map();
        rows.forEach(r => {
            const rawSku = String(r[COL_SKU] || '').trim();
            if (!rawSku || rawSku.toUpperCase().includes('TOTAL')) return;
            const sku = rawSku.replace(/^0+/, '');
            if (!map.has(sku)) {
                const obj = { sku, displaySku: rawSku, desc: r[COL_DESC], totalAll: 0, stores: {} };
                amountIdx.forEach(i => obj.stores[i] = 0);
                map.set(sku, obj);
            }
            const item = map.get(sku);
            amountIdx.forEach(i => {
                const v = cleanNum(r[i]);
                item.stores[i] += v;
                item.totalAll += v;
            });
        });

        const allItems = [...map.values()];
        const items = [...allItems].sort((a, b) => b.totalAll - a.totalAll);
        items.forEach((it, idx) => it.rank = idx + 1);

        const storeRankings = {};
        amountIdx.forEach(i => {
            storeRankings[i] = new Map(
                [...allItems]
                    .sort((a, b) => b.stores[i] - a.stores[i])
                    .map((it, idx) => [it.sku, idx + 1])
            );
        });

        result.push({ div, items, storeRankings });
    });
    cache = { rawData: state.rawData, config: state.config, result };
    return result;
}

function rankClass(rank) {
    return rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
}

const MAX_SEARCH_RESULTS = 50;

function matchesSearch(it, query) {
    return it.displaySku.toLowerCase().includes(query)
        || it.sku.includes(query.replace(/^0+/, '') || query)
        || String(it.desc ?? '').toLowerCase().includes(query);
}

// Tombol pilihan divisi (Semua · GROCERY · DND · ...), hanya divisi yang punya data.
function renderDivisionChips(report) {
    const chips = document.getElementById('divChips');
    if (state.filterDiv && !report.some(r => r.div === state.filterDiv)) state.filterDiv = '';
    const names = ['', ...report.map(r => r.div)];
    chips.innerHTML = names.map(div => {
        const active = div === state.filterDiv;
        const cls = active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-gray-300 hover:bg-gray-100';
        return `<button data-div="${escapeHtml(div)}" class="shrink-0 px-3 py-1 rounded-full border text-xs font-bold ${cls}">${escapeHtml(div || 'Semua')}</button>`;
    }).join('');
}

export function renderReport() {
    const filters = document.getElementById('reportFilters');
    if (!state.rawData.length) {
        filters.classList.add('hidden');
        return;
    }
    const amountIdx = storeCols();
    const report = buildReport();
    const limit = rankLimit();
    const query = state.search.trim().toLowerCase();
    filters.classList.remove('hidden');
    renderDivisionChips(report);

    let html = '';
    report.filter(r => !state.filterDiv || r.div === state.filterDiv).forEach(({ div, items, storeRankings }) => {
        const shown = query ? items.filter(it => matchesSearch(it, query)) : items.slice(0, limit);
        if (query && !shown.length) return;

        html += `<h2 class="font-bold text-lg text-slate-800 mt-6 mb-2 uppercase">${escapeHtml(div)}`
            + (query ? ` <span class="text-xs font-normal normal-case text-slate-500">${shown.length.toLocaleString('id-ID')} item cocok${shown.length > MAX_SEARCH_RESULTS ? `, ditampilkan ${MAX_SEARCH_RESULTS} teratas` : ''}</span>` : '')
            + '</h2>';
        html += `<div class="overflow-x-auto"><table class="excel-table"><tr><th class="c-rank text-center">Rank</th><th class="c-sku">SKU</th><th class="c-desc">Item Description</th><th>Total All Store</th>`;
        amountIdx.forEach((i, k) => html += `<th>${escapeHtml(storeLabel(k))}</th>`);
        html += '</tr>';

        (query ? shown.slice(0, MAX_SEARCH_RESULTS) : shown).forEach(it => {
            const rClass = rankClass(it.rank);
            html += `<tr><td class="c-rank ${rClass} font-bold text-center">${it.rank}</td><td class="c-sku">${escapeHtml(it.displaySku)}</td><td class="c-desc">${escapeHtml(it.desc)}</td><td class="num-cell ${rClass}">${it.totalAll.toLocaleString('id-ID')}</td>`;
            amountIdx.forEach(i => {
                const val = it.stores[i];
                const sClass = rankClass(storeRankings[i].get(it.sku) || 999);
                html += `<td class="num-cell ${sClass}">${val ? val.toLocaleString('id-ID') : '-'}</td>`;
            });
            html += '</tr>';
        });
        html += '</table></div>';
    });
    if (!html) {
        html = `<p class="mt-6 text-sm text-slate-500">${query
            ? `Tidak ada item yang cocok dengan "<b>${escapeHtml(state.search.trim())}</b>".`
            : 'Tidak ada data yang cocok dengan divisi yang terdaftar.'}</p>`;
    }
    document.getElementById('report').innerHTML = html;
}
