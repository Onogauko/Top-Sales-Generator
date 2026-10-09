import { state } from './core/state.js';
import { api } from './core/api.js';
import { renderReport } from './report.js';
import { renderDataInfo } from './data.js';

const $ = id => document.getElementById(id);

function setStatus(text, color = 'text-slate-500') {
    const status = $('saveStatus');
    status.textContent = text;
    status.className = `mt-3 text-xs font-bold ${color}`;
}

export function applyConfig(config, version) {
    state.config = config;
    state.configVersion = version;
    $('configStatus').classList.add('hidden');
    if (state.admin) renderAdminPanel();
    renderReport();
    renderDataInfo();
}

export async function loadConfig() {
    try {
        const data = await api('api/config.php');
        applyConfig(data.config, data.version);
    } catch (err) {
        $('configStatus').textContent = "Gagal memuat konfigurasi: " + err.message;
        $('configStatus').classList.remove('hidden');
    }
}

function applyAuth(data) {
    if (data.csrf) state.csrf = data.csrf;
    state.admin = !!data.admin;
    state.mustChange = !!data.mustChange;
    $('adminDot').classList.toggle('hidden', !state.admin);
    if (!state.admin) showPanel(false);
    else if (state.mustChange) showPanel(true); // password awal: panel langsung dibuka untuk ganti password
    $('mustChangeNotice').classList.toggle('hidden', !state.mustChange);
    $('adminTools').classList.toggle('hidden', state.mustChange);
    if (state.admin) renderAdminPanel();
    renderDataInfo();
}

export async function loadAuth() {
    applyAuth(await api('api/auth.php'));
}

function showPanel(open) {
    $('adminPanel').classList.toggle('hidden', !open);
}

function showLoginError(message) {
    $('loginError').textContent = message;
    $('loginError').classList.toggle('hidden', !message);
}

export function closeLoginModal() {
    $('loginModal').classList.add('hidden');
    $('adminPass').value = "";
    showLoginError('');
}

export function closePanel() {
    showPanel(false);
}

// Tombol ⚙️: admin yang sudah login langsung buka/tutup panel; selain itu minta password.
export function openSettings() {
    if (state.admin) return showPanel($('adminPanel').classList.contains('hidden'));
    $('loginModal').classList.remove('hidden');
    $('adminPass').focus();
}

export async function login(e) {
    e?.preventDefault();
    const password = $('adminPass').value;
    if (!password) return showLoginError("Masukkan password admin.");
    $('loginBtn').disabled = true;
    try {
        applyAuth(await api('api/auth.php?action=login', { method: 'POST', body: { password } }));
        closeLoginModal();
        showPanel(true);
        setStatus('');
    } catch (err) {
        showLoginError(err.message);
        $('adminPass').select();
    } finally {
        $('loginBtn').disabled = false;
    }
}

export async function logout() {
    try {
        applyAuth(await api('api/auth.php?action=logout', { method: 'POST' }));
    } catch (err) {
        alert(err.message);
    }
}

export async function changePassword() {
    const currentPassword = $('currentPass').value;
    const newPassword = $('newPass').value;
    if (newPassword.length < 8) return alert("Password baru minimal 8 karakter.");
    if (newPassword !== $('newPass2').value) return alert("Ulangi password baru tidak sama.");
    $('changePassBtn').disabled = true;
    try {
        await api('api/auth.php?action=change_password', { method: 'POST', body: { currentPassword, newPassword } });
        ['currentPass', 'newPass', 'newPass2'].forEach(id => $(id).value = "");
        applyAuth({ admin: true, mustChange: false });
        setStatus("✓ Password admin berhasil diganti.", "text-green-700");
    } catch (err) {
        setStatus("Gagal ganti password: " + err.message, "text-red-600");
    } finally {
        $('changePassBtn').disabled = false;
    }
}

function renderAdminPanel() {
    renderDivisionList();
    $('storeConfigInput').value = state.config.stores.map(s => s.name ? `${s.col} = ${s.name}` : s.col).join('\n');
}

function renderDivisionList() {
    const list = $('divisionListDisplay');
    list.innerHTML = "";
    Object.keys(state.config.divisions).forEach(div => {
        const divEl = document.createElement('div');
        divEl.className = "flex justify-between items-center bg-white p-2 border rounded mb-1";
        divEl.innerHTML = `<span><strong></strong> (${state.config.divisions[div].length} Dept)</span><div><button class="text-blue-600 mr-3 text-xs">Edit</button><button class="text-red-600 text-xs">Hapus</button></div>`;
        divEl.querySelector('strong').textContent = div;
        const [editBtn, delBtn] = divEl.querySelectorAll('button');
        editBtn.addEventListener('click', () => editDivision(div));
        delBtn.addEventListener('click', () => deleteDivision(div));
        list.appendChild(divEl);
    });
}

// Simpan ke server; tampilan diperbarui setelah server mengonfirmasi.
async function saveConfig(newConfig) {
    const buttons = document.querySelectorAll('#adminPanel .save-btn');
    buttons.forEach(b => b.disabled = true);
    setStatus("Menyimpan...");
    try {
        const data = await api('api/config.php', { method: 'POST', body: { config: newConfig, version: state.configVersion } });
        applyConfig(data.config, data.version);
        setStatus("✓ Tersimpan & langsung berlaku untuk semua user (cukup refresh halaman).", "text-green-700");
        return true;
    } catch (err) {
        if (err.status === 409) await loadConfig();
        if (err.status === 401) applyAuth({ admin: false });
        setStatus("Gagal menyimpan: " + err.message, "text-red-600");
        return false;
    } finally {
        buttons.forEach(b => b.disabled = false);
    }
}

export async function addOrUpdateDivision() {
    const name = $('newDivName').value.trim().toUpperCase();
    const codes = $('newDivCodes').value.split(',').map(c => c.trim()).filter(c => c !== "");
    if (!name || codes.length === 0) return alert("Isi Nama Divisi dan Kode Dept!");
    const bad = codes.filter(c => !/^\d+$/.test(c));
    if (bad.length) return alert("Kode Dept harus angka: " + bad.join(', '));
    const divisions = { ...state.config.divisions, [name]: codes };
    if (await saveConfig({ ...state.config, divisions })) {
        $('newDivName').value = "";
        $('newDivCodes').value = "";
    }
}

function editDivision(name) {
    $('newDivName').value = name;
    $('newDivCodes').value = state.config.divisions[name].join(', ');
}

function deleteDivision(name) {
    if (!confirm(`Hapus divisi ${name}?`)) return;
    const divisions = { ...state.config.divisions };
    delete divisions[name];
    saveConfig({ ...state.config, divisions });
}

export function saveStores() {
    const lines = $('storeConfigInput').value.split('\n').map(l => l.trim()).filter(Boolean);
    const stores = [];
    for (const line of lines) {
        const [colPart, ...nameParts] = line.split('=');
        const col = colPart.trim().toUpperCase();
        if (!/^[A-Z]{1,3}$/.test(col)) return alert(`Kolom tidak valid: "${line}"`);
        if (stores.some(s => s.col === col)) return alert(`Kolom ${col} dobel.`);
        stores.push({ col, name: nameParts.join('=').trim() });
    }
    if (!stores.length) return alert("Minimal harus ada 1 kolom store!");
    saveConfig({ ...state.config, stores });
}
