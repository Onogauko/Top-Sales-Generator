// Data sales: memuat data tersimpan dari server, pratinjau file CSV, dan menyimpan upload (admin).
import { state } from './core/state.js';
import { api, post } from './core/api.js';
import { renderReport, COL_DEPT, COL_SKU, COL_DESC } from './report.js';
import { escapeHtml, cleanNum, storeCols } from './utils.js';

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
        info.className = 'mb-3 p-3 rounded border text-sm bg-amber-50 border-amber-300 text-amber-900';
        info.innerHTML = `📄 Pratinjau <b>${escapeHtml(p.file.name)}</b> (${p.rowCount.toLocaleString('id-ID')} baris) — ${note}`
            + (!canSave && s ? ' <button id="backToSavedBtn" class="underline font-bold ml-1">Kembali ke data server</button>' : '');
        $('backToSavedBtn')?.addEventListener('click', cancelPreview);
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
        $('dataInfo').className = 'mb-3 text-sm font-bold text-red-600';
        $('dataInfo').textContent = 'Gagal memuat data sales: ' + err.message;
        return;
    }
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
