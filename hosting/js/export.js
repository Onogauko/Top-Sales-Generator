import { state } from './core/state.js';
import { storeCols, storeLabel } from './utils.js';
import { buildReport, rankLimit } from './report.js';

const RANK_FILL = { 1: '00B050', 2: 'FFFF00', 3: 'F8CBAD' };

function applyRankFill(cell, rank) {
    if (!RANK_FILL[rank]) return;
    cell.s.fill = { fgColor: { rgb: RANK_FILL[rank] } };
    cell.s.font.bold = true;
}

export function exportExcel() {
    if (!state.rawData.length) return alert("Pilih file terlebih dahulu!");

    const amountIdx = storeCols();
    const wb = XLSX.utils.book_new();
    const wsData = [];

    buildReport(rankLimit()).forEach(({ div, topItems, storeRankings }) => {
        wsData.push([`DIVISION: ${div}`]);
        wsData.push([]);
        wsData.push(['Rank', 'SKU', 'Item Description', 'Total All Store', ...amountIdx.map((i, k) => storeLabel(k))]);

        topItems.forEach((it, idx) => {
            const row = [idx + 1, "'" + it.displaySku, it.desc, it.totalAll];
            row._storeRanks = {};
            amountIdx.forEach(i => {
                row.push(it.stores[i]);
                row._storeRanks[i] = storeRankings[i].get(it.sku);
            });
            wsData.push(row);
        });

        wsData.push([]);
        wsData.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // AUTO WIDTH: Rank, SKU, Desc, Total, lalu 1 kolom per store
    ws['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 45 }, { wch: 18 }, ...amountIdx.map(() => ({ wch: 15 }))];

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (!cell) continue;

            // BORDER SEMUA
            cell.s = {
                border: {
                    top: { style: "thin", color: { rgb: "444444" } },
                    bottom: { style: "thin", color: { rgb: "444444" } },
                    left: { style: "thin", color: { rgb: "444444" } },
                    right: { style: "thin", color: { rgb: "444444" } }
                },
                font: { name: "Segoe UI", sz: 10 },
                alignment: { vertical: "center", horizontal: C >= 3 ? "right" : "left" }
            };

            const rankCell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];

            // HEADER
            if (R > 0 && rankCell?.v === "Rank") {
                cell.s.fill = { fgColor: { rgb: "1E293B" } };
                cell.s.font = { bold: true, color: { rgb: "FFFFFF" } };
                cell.s.alignment = { horizontal: "center", vertical: "center" };
            }

            // TITLE DIVISION
            if (C === 0 && String(cell.v).includes("DIVISION:")) {
                cell.s.font = { bold: true, sz: 14, color: { rgb: "1E293B" } };
                cell.s.border = {};
            }

            // RANK COLOR
            if (C === 0 && typeof cell.v === "number") {
                applyRankFill(cell, cell.v);
                cell.s.alignment.horizontal = "center";
            }

            // TOTAL ALL STORE COLOR
            if (C === 3 && typeof cell.v === "number") applyRankFill(cell, rankCell?.v);

            // FORMAT ANGKA + warna rank per store
            if (C >= 3 && typeof cell.v === "number") {
                cell.z = '#,##0';
                if (C >= 4 && wsData[R]) applyRankFill(cell, wsData[R]._storeRanks?.[amountIdx[C - 4]]);
            }
        }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Top Sales");
    XLSX.writeFile(wb, "Top_Sales_Report.xlsx");
}
