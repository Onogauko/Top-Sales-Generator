# Top Sales Generator

Webapp statis (GitHub Pages) untuk membuat laporan Top N SKU per divisi dari file CSV, lengkap dengan export Excel.

## File

- `index.html` — tampilan & logika laporan.
- `config.json` — konfigurasi divisi (kode dept) dan kolom store. Dibaca setiap halaman dibuka.

## Mengubah divisi / store

1. Login admin dengan **GitHub Token** (lihat di bawah).
2. Ubah divisi atau kolom store → **Simpan**.
3. Perubahan langsung di-commit ke `config.json` di repo ini. Di perangkat admin langsung berlaku;
   user lain mendapat versi baru setelah GitHub Pages selesai update (±1-2 menit, lalu refresh).

Tidak perlu download / upload ulang HTML. `config.json` juga bisa diedit langsung di GitHub.

## Membuat GitHub Token admin (sekali saja)

GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token:

- Repository access: **Only select repositories** → `top-sales-generator`
- Permissions → Repository permissions → **Contents: Read and write**

Token hanya memberi akses ke repo ini. Jangan centang "Ingat di perangkat ini" di komputer bersama.
