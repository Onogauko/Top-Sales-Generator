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
