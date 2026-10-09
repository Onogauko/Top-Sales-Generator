// State bersama seluruh aplikasi.
export const state = {
    rawData: [],          // baris CSV (tanpa header) yang sedang ditampilkan
    saved: null,          // info data sales tersimpan di server {id, filename, rowCount, salesUntil, uploadedAt}
    preview: null,        // file CSV yang baru dipilih & belum disimpan {file, rowCount}
    headers: [],          // baris header CSV
    config: { divisions: {}, stores: [] },
    configVersion: 0,     // versi config dari server, dikirim balik saat simpan (deteksi bentrok)
    admin: false,
    mustChange: false,    // admin masih memakai password awal
    csrf: '',
    zoom: 1.0,
};
