// Data sales: memuat data tersimpan dari server, pratinjau file CSV, dan menyimpan upload (admin).
import { state } from './core/state.js';
import { api, post } from './core/api.js';
import { renderReport, COL_DEPT, COL_SKU, COL_DESC } from './report.js';
import { escapeHtml, cleanNum, parseNum, storeCols } from './utils.js';

const $ = id => document.getElementById(id);

function parseCsv(input) {
    return new Promise((resolve, reject) => {
        Papa.parse(input, {
            skipEmptyLines: true,
            complete: res => resolve({ headers: res.data[0] || [], rows: res.data.slice(1) }),
            error: reject,
        });
    });
}

async function gzip(blob) {
    const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
}

async function gunzipToText(buffer) {
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
}

// Angka ditulis ulang supaya cleanNum() membacanya sama persis
// (mis. 1.234 desimal jangan sampai terbaca 1234 ribuan -> tulis 1.2340).
function numText(n) {
    const s = String(n);
    return /^-?\d{1,3}\.\d{3}$/.test(s) ? s + '0' : s;
}

// Ringkas data sebelum disimpan ke server: hanya kolom yang dipakai laporan (Dept, SKU, Deskripsi,
// kolom store) dan baris dengan Dept + SKU yang sama dijumlahkan. Posisi kolom tetap sama dan
// hasil laporan identik, tapi ukurannya jauh lebih kecil.
function compactCsv(headers, rows) {
    const storeIdx = storeCols();
    const width = Math.max(COL_DESC, ...storeIdx) + 1;
    const groups = new Map();
    for (const r of rows) {
        const sku = String(r[COL_SKU] || '').trim();
        if (!sku || sku.toUpperCase().includes('TOTAL')) continue; // memang diabaikan laporan
        const dept = String(r[COL_DEPT] || '');
        const key = dept + '\u0000' + sku;
        let g = groups.get(key);
        if (!g) {
            g = { dept, sku, desc: r[COL_DESC], sums: storeIdx.map(() => 0) };
            groups.set(key, g);
        }
        storeIdx.forEach((ci, k) => g.sums[k] += cleanNum(r[ci]));
    }
    const out = [Array.from({ length: width }, (_, i) => headers[i] ?? '')];
    for (const g of groups.values()) {
        const row = new Array(width).fill('');
        row[COL_DEPT] = g.dept;
        row[COL_SKU] = g.sku;
        row[COL_DESC] = g.desc ?? '';
        storeIdx.forEach((ci, k) => row[ci] = numText(g.sums[k]));
        out.push(row);
    }
    return { text: Papa.unparse(out), rowCount: out.length - 1 };
}

// Periksa CSV sebelum disimpan: berapa divisi terisi, Dept yang belum masuk divisi mana pun,
// dan tanda-tanda format kolom berubah (SKU / Dept kosong, kolom store bukan angka).
function analyzeCsv(rows) {
    const mapped = new Set(Object.values(state.config.divisions).flat());
    const deptToDiv = new Map();
    Object.entries(state.config.divisions).forEach(([div, codes]) => codes.forEach(c => deptToDiv.set(c, div)));
    const storeIdx = storeCols();
    const storeBad = storeIdx.map(() => 0), storeFilled = storeIdx.map(() => 0);
    const divsWithData = new Set();
    const unmapped = new Map(); // dept -> jumlah baris
    let noSku = 0, noDept = 0, unmappedRows = 0;

    for (const r of rows) {
        const sku = String(r[COL_SKU] || '').trim();
        if (!sku) { noSku++; continue; }
        if (sku.toUpperCase().includes('TOTAL')) continue;
        const dept = String(r[COL_DEPT] || '').trim();
        const codes = dept.match(/\d+/g) || [];
        if (!codes.length) noDept++;
        const hit = codes.filter(c => mapped.has(c));
        if (hit.length) hit.forEach(c => divsWithData.add(deptToDiv.get(c)));
        else if (codes.length) { unmappedRows++; unmapped.set(dept, (unmapped.get(dept) || 0) + 1); }
        storeIdx.forEach((ci, k) => {
            const v = String(r[ci] ?? '').trim();
            if (v === '' || v === '-') return;
            storeFilled[k]++;
            if (isNaN(parseNum(v))) storeBad[k]++;
        });
    }

    const warnings = [];
    const pct = n => Math.round(n / Math.max(rows.length, 1) * 100);
    if (rows.length && pct(noSku) >= 30) warnings.push(`${pct(noSku)}% baris tanpa SKU di kolom F — format CSV mungkin berubah.`);
    if (rows.length && pct(noDept) >= 30) warnings.push(`${pct(noDept)}% baris tanpa kode Dept di kolom D — format CSV mungkin berubah.`);
    const badCols = state.config.stores.filter((s, k) => storeFilled[k] && storeBad[k] / storeFilled[k] > 0.3).map(s => s.col);
    if (badCols.length) warnings.push(`Kolom store ${badCols.join(', ')} berisi teks, bukan angka — cek pengaturan Kolom Store.`);
    if (unmappedRows) {
        const top = [...unmapped.entries()].sort((a, b) => b[1] - a[1]);
        const list = top.slice(0, 8).map(([d, n]) => `${d} (${n.toLocaleString('id-ID')})`).join(', ');
        warnings.push(`${unmappedRows.toLocaleString('id-ID')} baris dengan Dept ${list}${top.length > 8 ? `, dan ${top.length - 8} Dept lain` : ''} belum masuk divisi mana pun.`);
    }
    if (!divsWithData.size && rows.length) warnings.push('Tidak ada baris yang cocok dengan divisi mana pun.');
    return { divisionCount: divsWithData.size, totalDivisions: Object.keys(state.config.divisions).length, warnings };
}

function setData(headers, rows) {
    state.headers = headers;
    state.rawData = rows;
    if (!rows.length) $('report').innerHTML = '';
    renderReport();
}

function formatDate(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(unixSeconds) {
    return new Date(unixSeconds * 1000).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function yesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Keterangan di atas tabel + bar simpan (hanya admin saat pratinjau).
export function renderDataInfo() {
    const info = $('dataInfo');
    const p = state.preview;
    const s = state.saved;
    const canSave = state.admin && !state.mustChange;
    $('uploadBar').classList.toggle('hidden', !(p && canSave));

    if (p) {
        const note = canSave
            ? 'belum disimpan. Isi tanggal lalu klik <b>Simpan ke Server</b>, atau Batal.'
            : state.admin
                ? 'belum bisa disimpan: ganti password admin dulu.'
                : 'hanya tampil di perangkat ini. <b>Login admin</b> untuk menyimpan ke server.';
        // Hitung ulang jika konfigurasi divisi/store berubah selama pratinjau.
        if (p.summaryFor !== state.config) {
            p.summary = analyzeCsv(state.rawData);
            p.summaryFor = state.config;
        }
        const { divisionCount, totalDivisions, warnings } = p.summary;
        info.className = 'mb-3 p-3 rounded border text-sm bg-amber-50 border-amber-300 text-amber-900';
        info.innerHTML = `📄 Pratinjau <b>${escapeHtml(p.file.name)}</b> · ${p.rowCount.toLocaleString('id-ID')} baris · ${divisionCount} dari ${totalDivisions} divisi terisi — ${note}`
            + (!canSave && s ? ' <button id="backToSavedBtn" class="underline font-bold ml-1">Kembali ke data server</button>' : '')
            + (warnings.length
                ? `<ul class="mt-2 space-y-1 font-bold text-red-700">${warnings.map(w => `<li>⚠️ ${escapeHtml(w)}</li>`).join('')}</ul>`
                : '<div class="mt-2 font-bold text-green-700">✓ Format CSV sesuai & semua Dept sudah masuk divisi.</div>');
        $('backToSavedBtn')?.addEventListener('click', cancelPreview);
    } else if (state.dataLoading) {
        info.className = 'mb-3 text-sm text-slate-500';
        info.textContent = '⏳ Memuat data sales...';
    } else if (s) {
        info.className = 'mb-3 p-3 rounded border text-sm bg-blue-50 border-blue-200 text-slate-800';
        info.innerHTML = `📅 Data sales s/d <b>${formatDate(s.salesUntil)}</b>`
            + `<span class="text-slate-500"> · ${escapeHtml(s.filename)} · diupload ${formatDateTime(s.uploadedAt)}</span>`;
    } else {
        info.className = 'mb-3 text-sm text-slate-500';
        info.textContent = state.admin ? 'Belum ada data sales di server. Pilih file CSV untuk upload.' : 'Belum ada data sales di server.';
    }
}

export async function loadSavedData() {
    state.dataLoading = true;
    renderDataInfo();
    try {
        const { upload } = await api('api/data.php');
        state.saved = upload;
        if (upload && !state.preview) {
            const res = await fetch(`api/data.php?id=${upload.id}`, { credentials: 'same-origin' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { headers, rows } = await parseCsv(await gunzipToText(await res.arrayBuffer()));
            if (!state.preview) setData(headers, rows);
        }
    } catch (err) {
        state.dataLoading = false;
        $('dataInfo').className = 'mb-3 text-sm font-bold text-red-600';
        $('dataInfo').textContent = 'Gagal memuat data sales: ' + err.message;
        return;
    }
    state.dataLoading = false;
    renderDataInfo();
}

export async function handleFileUpload(e) {
    const file = e.target.files[0];
    e.target.value = ''; // supaya file yang sama bisa dipilih ulang
    if (!file) return;
    try {
        const { headers, rows } = await parseCsv(file);
        state.preview = { file, rowCount: rows.length };
        $('salesUntil').value = yesterday();
        setData(headers, rows);
        renderDataInfo();
    } catch (err) {
        alert("Gagal membaca file CSV: " + err.message);
    }
}

export function cancelPreview() {
    state.preview = null;
    setData([], []);
    renderDataInfo();
    loadSavedData();
}

export async function saveUpload() {
    const p = state.preview;
    const salesUntil = $('salesUntil').value;
    if (!p) return;
    if (!salesUntil) return alert('Isi tanggal "Data sales s/d" terlebih dahulu.');
    const btn = $('saveUploadBtn');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';
    try {
        const data = await post('api/data.php', {
            headers: {
                'Content-Type': 'application/octet-stream',
                'X-Filename': encodeURIComponent(p.file.name),
                'X-Sales-Until': salesUntil,
                'X-Row-Count': String(p.rowCount),
            },
            body: await gzip(new Blob([compactCsv(state.headers, state.rawData).text])),
        });
        state.saved = data.upload;
        state.preview = null;
        renderDataInfo();
    } catch (err) {
        alert('Gagal menyimpan data: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Simpan ke Server';
    }
}
