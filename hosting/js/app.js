// Entry point: menghubungkan tombol/input dengan modul fitur.
import { state } from './core/state.js';
import { renderReport } from './report.js';
import { exportExcel } from './export.js';
import { loadConfig, loadAuth, login, logout, changePassword, addOrUpdateDivision, saveStores } from './admin.js';

const $ = id => document.getElementById(id);

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
        skipEmptyLines: true,
        complete(res) {
            state.headers = res.data[0] || [];
            state.rawData = res.data.slice(1);
            renderReport();
        },
        error(err) {
            alert("Gagal membaca file CSV: " + err.message);
        }
    });
    e.target.value = ''; // supaya file yang sama bisa dipilih ulang
}

function setZoom(zoom) {
    state.zoom = Math.min(2.0, Math.max(0.5, zoom));
    document.body.style.zoom = state.zoom;
    $('zoomLabel').innerText = Math.round(state.zoom * 100) + "%";
}

$('csvFile').addEventListener('change', handleFileUpload);
$('rankLimit').addEventListener('change', renderReport);
$('zoomInBtn').addEventListener('click', () => setZoom(state.zoom + 0.1));
$('zoomOutBtn').addEventListener('click', () => setZoom(state.zoom - 0.1));
$('zoomResetBtn').addEventListener('click', () => setZoom(1.0));
$('exportBtn').addEventListener('click', exportExcel);

$('loginBtn').addEventListener('click', login);
$('adminPass').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
$('logoutBtn').addEventListener('click', logout);
$('changePassBtn').addEventListener('click', changePassword);
$('saveDivBtn').addEventListener('click', addOrUpdateDivision);
$('saveStoresBtn').addEventListener('click', saveStores);

loadConfig();
loadAuth().catch(err => console.error(err));
