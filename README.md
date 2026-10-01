# Vilza VVIP Rental Transport

Aplikasi web sederhana untuk pengelolaan rental kendaraan dan laporan persediaan armada menggunakan HTML, CSS, JavaScript, dan Supabase.

## Struktur

```text
vilza-rental/
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── backend/
│   ├── app.js
│   ├── policy.sql
│   └── schema.sql
├── .gitignore
└── README.md
```

> Catatan: folder `backend/` berisi koneksi Supabase yang dipanggil langsung dari browser; tidak ada server Node.js di proyek ini.

## Menjalankan proyek

1. Buat project di Supabase.
2. Jalankan `backend/schema.sql` di **SQL Editor**.
3. Jalankan `backend/policy.sql` setelah schema berhasil dibuat.
4. Pastikan `SUPABASE_URL` dan **publishable key** di `backend/app.js` sesuai dengan project Supabase yang digunakan.
5. Buka `frontend/index.html` melalui local web server/static hosting.

## Keamanan

- Gunakan **publishable key** (`sb_publishable_...`) di browser.
- **Jangan** memasukkan `service_role` key, secret key, password, atau token privat ke repository.
- `policy.sql` pada proyek ini memberi role `anon` akses baca/tulis penuh ke tabel. Konfigurasi tersebut hanya cocok untuk tugas/demo.
- Untuk penggunaan nyata, gunakan Supabase Auth dan ubah RLS agar hanya pengguna terautentikasi yang memiliki hak sesuai kebutuhannya.
- Pastikan data pada `schema.sql` adalah data dummy sebelum repository dibuat publik. Jangan commit data pelanggan nyata, KTP, nomor telepon, atau informasi pribadi lainnya.

## GitHub

Contoh perintah setelah mengekstrak folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/vilza-rental.git
git push -u origin main
```

## Catatan lisensi

Proyek ini belum menetapkan lisensi open-source. Tambahkan file `LICENSE` jika repository akan dibagikan sebagai proyek open-source.
