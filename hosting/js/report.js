import { state } from './core/state.js';
import { cleanNum, escapeHtml, storeCols, storeLabel } from './utils.js';

const COL_DEPT = 3, COL_SKU = 5, COL_DESC = 6;

export function rankLimit() {
    return parseInt(document.getElementById('rankLimit').value);
}

// Agregasi per divisi: dipakai bersama oleh tampilan tabel dan export Excel.
// Hasil: [{ div, topItems, storeRankings }] — storeRankings[kolom] = Map(sku -> rank di store itu).
export function buildReport(limit) {
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
        const topItems = [...allItems].sort((a, b) => b.totalAll - a.totalAll).slice(0, limit);

        const storeRankings = {};
        amountIdx.forEach(i => {
            storeRankings[i] = new Map(
                [...allItems]
                    .sort((a, b) => b.stores[i] - a.stores[i])
                    .map((it, idx) => [it.sku, idx + 1])
            );
        });

        result.push({ div, topItems, storeRankings });
    });
    return result;
}

function rankClass(rank) {
    return rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
}

export function renderReport() {
    if (!state.rawData.length) return;
    const amountIdx = storeCols();
    let html = '';

    buildReport(rankLimit()).forEach(({ div, topItems, storeRankings }) => {
        html += `<h2 class="font-bold text-lg text-slate-800 mt-6 mb-2 uppercase">DIVISION: ${escapeHtml(div)}</h2>`;
        html += `<div class="overflow-x-auto"><table class="excel-table"><tr><th class="text-center">Rank</th><th>SKU</th><th>Item Description</th><th>Total All Store</th>`;
        amountIdx.forEach((i, k) => html += `<th>${escapeHtml(storeLabel(k))}</th>`);
        html += '</tr>';

        topItems.forEach((it, idx) => {
            const rClass = rankClass(idx + 1);
            html += `<tr><td class="${rClass} font-bold text-center">${idx + 1}</td><td>${escapeHtml(it.displaySku)}</td><td class="desc">${escapeHtml(it.desc)}</td><td class="num-cell ${rClass}">${it.totalAll.toLocaleString('id-ID')}</td>`;
            amountIdx.forEach(i => {
                const val = it.stores[i];
                const sClass = rankClass(storeRankings[i].get(it.sku) || 999);
                html += `<td class="num-cell ${sClass}">${val ? val.toLocaleString('id-ID') : '-'}</td>`;
            });
            html += '</tr>';
        });
        html += '</table></div>';
    });
    document.getElementById('report').innerHTML = html;
}
