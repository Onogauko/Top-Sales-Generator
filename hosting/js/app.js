// Entry point: menghubungkan tombol/input dengan modul fitur.
import { state } from './core/state.js';
import { renderReport } from './report.js';
import { exportExcel } from './export.js';
import { loadConfig, loadAuth, login, logout, openSettings, closeLoginModal, closePanel, changePassword, addOrUpdateDivision, saveStores } from './admin.js';
import { loadSavedData, handleFileUpload, saveUpload, cancelPreview } from './data.js';

const $ = id => document.getElementById(id);

function setZoom(zoom) {
    state.zoom = Math.min(2.0, Math.max(0.5, zoom));
    document.body.style.zoom = state.zoom;
    $('zoomLabel').innerText = Math.round(state.zoom * 100) + "%";
}

$('csvFile').addEventListener('change', handleFileUpload);
$('rankLimit').addEventListener('change', renderReport);

let searchTimer;
$('searchInput').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.search = e.target.value; renderReport(); }, 200);
});
$('divChips').addEventListener('click', e => {
    const chip = e.target.closest('button[data-div]');
    if (!chip) return;
    state.filterDiv = chip.dataset.div;
    renderReport();
});
$('zoomInBtn').addEventListener('click', () => setZoom(state.zoom + 0.1));
$('zoomOutBtn').addEventListener('click', () => setZoom(state.zoom - 0.1));
$('zoomResetBtn').addEventListener('click', () => setZoom(1.0));
$('exportBtn').addEventListener('click', exportExcel);

$('settingsBtn').addEventListener('click', openSettings);
$('loginForm').addEventListener('submit', login);
$('loginCancelBtn').addEventListener('click', closeLoginModal);
$('loginModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeLoginModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLoginModal(); });
$('closePanelBtn').addEventListener('click', closePanel);
$('logoutBtn').addEventListener('click', logout);
$('changePassBtn').addEventListener('click', changePassword);
$('saveDivBtn').addEventListener('click', addOrUpdateDivision);
$('saveStoresBtn').addEventListener('click', saveStores);
$('saveUploadBtn').addEventListener('click', saveUpload);
$('cancelUploadBtn').addEventListener('click', cancelPreview);

// PWA: daftarkan service worker & tampilkan tombol "Pasang" jika browser mendukung.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW:', err));
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    $('installBtn').classList.remove('hidden');
});
$('installBtn').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $('installBtn').classList.add('hidden');
});
window.addEventListener('appinstalled', () => $('installBtn').classList.add('hidden'));

loadConfig();
loadAuth().catch(err => console.error(err));
loadSavedData();
