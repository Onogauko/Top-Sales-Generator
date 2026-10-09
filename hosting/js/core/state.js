// State bersama seluruh aplikasi.
export const state = {
    rawData: [],          // baris CSV (tanpa header)
    headers: [],          // baris header CSV
    config: { divisions: {}, stores: [] },
    configVersion: 0,     // versi config dari server, dikirim balik saat simpan (deteksi bentrok)
    admin: false,
    mustChange: false,    // admin masih memakai password awal
    csrf: '',
    zoom: 1.0,
};
