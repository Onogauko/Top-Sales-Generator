/**
 * Top Sales Generator - backend Google Apps Script.
 *
 * Konfigurasi divisi & store disimpan di Script Properties (key APP_CONFIG),
 * jadi perubahan dari panel admin langsung berlaku untuk semua user tanpa
 * perlu edit / upload ulang HTML.
 *
 * Setup sekali: Project Settings > Script Properties > tambah
 *   ADMIN_PASSWORD = <password admin>
 */

const CONFIG_KEY = 'APP_CONFIG';

// Dipakai hanya jika belum pernah ada konfigurasi yang disimpan.
const DEFAULT_CONFIG = {
  divisions: {
    GROCERY: ['2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '5201', '5202', '5203', '5204', '5205'],
    DND: ['2025', '2026', '2027', '2028', '2029', '2030'],
    FISH: ['2031', '2032'],
    MEAT: ['2033', '2034', '2035', '2036', '5212'],
    PRODUCE: ['2037', '2038', '5213'],
    DELICA: ['2039', '2040', '5214'],
    BAKERY: ['2041', '2042', '5216'],
    HBC: ['2018', '2019', '2020', '2021', '2022', '2023', '5210', '2024', '2702', '2703', '2704', '2705', '2706', '2707', '5207', '5208', '5209', '5701', '5702', '5703', '5704', '5705'],
    NONFOODS: ['2014', '2015', '2016', '2017', '2701', '5206']
  },
  // col = kolom CSV (huruf Excel), name = label opsional (kosong = pakai header CSV)
  stores: ['M', 'O', 'Q', 'S', 'U', 'W', 'Y', 'AA', 'AC', 'AE', 'AG', 'AI', 'AK'].map(col => ({ col, name: '' }))
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Top 10 Sales Generator - Jenta Zebua')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function getConfig() {
  const raw = PropertiesService.getScriptProperties().getProperty(CONFIG_KEY);
  return raw ? JSON.parse(raw) : DEFAULT_CONFIG;
}

function checkAdmin(password) {
  return password === getAdminPassword_();
}

function saveConfig(password, config) {
  if (!checkAdmin(password)) throw new Error('Password admin salah.');
  const clean = validateConfig_(config);
  PropertiesService.getScriptProperties().setProperty(CONFIG_KEY, JSON.stringify(clean));
  return clean;
}

function getAdminPassword_() {
  const pw = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!pw) throw new Error('ADMIN_PASSWORD belum diatur di Project Settings > Script Properties.');
  return pw;
}

function validateConfig_(config) {
  if (!config || typeof config !== 'object') throw new Error('Konfigurasi tidak valid.');

  const divisions = {};
  Object.keys(config.divisions || {}).forEach(name => {
    const div = String(name).trim().toUpperCase();
    const codes = [...new Set((config.divisions[name] || []).map(c => String(c).trim()).filter(c => /^\d+$/.test(c)))];
    if (div && codes.length) divisions[div] = codes;
  });

  const seen = new Set();
  const stores = [];
  (config.stores || []).forEach(s => {
    const col = String(s && s.col || '').trim().toUpperCase();
    if (!/^[A-Z]{1,3}$/.test(col) || seen.has(col)) return;
    seen.add(col);
    stores.push({ col, name: String(s.name || '').trim() });
  });
  if (!stores.length) throw new Error('Minimal harus ada 1 kolom store.');

  return { divisions, stores };
}
