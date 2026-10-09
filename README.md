# Top Sales Generator

Webapp statis (GitHub Pages) untuk membuat laporan Top N SKU per divisi dari file CSV, lengkap dengan export Excel.

## File

- `index.html` — tampilan & logika laporan.
- `config.json` — konfigurasi divisi (kode dept) dan kolom store. Dibaca setiap halaman dibuka.
- `admin.json` — GitHub token admin dalam bentuk **terenkripsi** dengan password admin (dibuat otomatis saat setup).

## Setup password admin (sekali saja, oleh pemilik repo)

1. Buat GitHub token: https://github.com/settings/personal-access-tokens/new
   - Repository access: **Only select repositories** → `Top-Sales-Generator`
   - Repository permissions → **Contents: Read and write**
2. Buka webapp → klik **Setup / reset password admin** → isi token + password admin baru → **Simpan**.

Setelah itu admin cukup login dengan password. Token tidak perlu diketik lagi.
Lupa password atau token kadaluarsa? Ulangi langkah di atas dengan token baru.

Gunakan password yang tidak mudah ditebak (minimal 8 karakter, lebih panjang lebih aman):
`admin.json` bisa dilihat publik, jadi keamanan token bergantung pada kekuatan password.

## Mengubah divisi / store

Login admin → ubah divisi atau kolom store → **Simpan**. Perubahan langsung di-commit ke `config.json`.
Di perangkat admin langsung berlaku; user lain mendapat versi baru setelah GitHub Pages selesai update
(±1 menit, lalu refresh). Tidak perlu download / upload ulang HTML.

---

# Versi hosting (PHP + MySQL) — folder `hosting/`

Untuk shared hosting (cPanel). Konfigurasi divisi & store disimpan di database MySQL, admin login dengan password biasa.

1. **phpMyAdmin**: jalankan `hosting/database/schema.sql` (membuat tabel `tsg_settings` & `tsg_login_attempts` + data awal).
2. Salin `hosting/config/db.example.php` menjadi `config/db.php` dan isi nama database, user, password.
3. Upload **isi** folder `hosting/` ke server (misal `public_html/top-sales/`), termasuk `.htaccess`.
4. Buka webapp → login admin dengan password awal **`admin12345`** → wajib ganti password.

Perubahan divisi / store langsung tersimpan di server dan berlaku untuk semua user (cukup refresh).

Data sales: admin upload CSV → pratinjau → isi tanggal "Data sales s/d" → **Simpan ke Server**.
Data tersimpan di tabel `tsg_uploads` (10 upload terakhir) dan langsung tampil untuk semua user,
dengan keterangan tanggal di atas tabel. User biasa yang memilih CSV hanya melihatnya di perangkatnya sendiri.
Jika tampilan belum berubah setelah upload file baru: purge cache Cloudflare.
