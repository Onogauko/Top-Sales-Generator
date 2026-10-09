# Top Sales Generator

Webapp Google Apps Script untuk membuat laporan Top N SKU per divisi dari file CSV, lengkap dengan export Excel.

## File

- `Code.gs` — backend: menyajikan halaman, menyimpan konfigurasi divisi & store di Script Properties, cek password admin.
- `index.html` — tampilan & logika laporan.

## Setup / Deploy

1. Di project Apps Script, buat file `Code.gs` dan file HTML bernama `index`, lalu salin isi kedua file ini.
2. **Project Settings → Script Properties → Add script property**: `ADMIN_PASSWORD` = password admin.
3. **Deploy → Manage deployments → Edit → Version: New version → Deploy** (URL Web App tetap sama).

## Mengubah divisi / store

Login admin di halaman → ubah divisi atau kolom store → **Simpan**. Perubahan langsung tersimpan di server
dan berlaku untuk semua user (cukup refresh halaman). Tidak perlu download atau deploy ulang HTML.

Konfigurasi awal diambil dari `DEFAULT_CONFIG` di `Code.gs` sampai admin menyimpan perubahan pertama.
