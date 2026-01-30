# Bulk API Key Checker (Static + Vercel Serverless)

Deskripsi singkat:

- Frontend statis untuk mengunggah/paste daftar API key.
- Serverless function di `api/validate.js` yang memeriksa setiap key (Gemini / OpenAI).
- Dua tombol download: hasil `aktif.txt` dan `invalid.txt`.

File yang harus di-push ke GitHub (root of repo):

- `index.html`
- folder `assets/` (css dan js)
- folder `api/` (serverless function `validate.js`)
- `README.md` (opsional)

Cara deploy ke Vercel:

1. Buat repository baru di GitHub dan push semua file di atas.
2. Di Vercel, pilih "Import Project" → "From Git Repository" → pilih repo Anda.
3. Vercel akan deploy static site dan membuat serverless endpoint dari folder `api/` otomatis.

Environment Variables untuk Vercel:

- Tidak ada variable wajib untuk penggunaan default. Fungsi serverless menggunakan API key yang Anda kirim dari frontend per-request.
- Opsi (opsional): jika Anda ingin mengganti endpoint default di runtime, tambahkan `VALIDATION_ENDPOINT` di Environment Variables dan modifikasi `api/validate.js` untuk membacanya.

Batasan & catatan:

- Vercel serverless memiliki batas waktu eksekusi per-invocation; untuk banyak key (ratusan/lebih), jalankan dengan batch kecil di frontend (opsi `batchSize`). Frontend default batchSize = 8.
- Jika Anda ingin memproses ribuan key, gunakan worker/queue atau server dengan waktu eksekusi lebih panjang.

Bagian yang saya buat/ubah:

- `index.html` — UI frontend
- `assets/css/styles.css` — gaya
- `assets/js/app.js` — logika frontend (upload, batch, panggil `/api/validate`)
- `api/validate.js` — serverless function yang menerima `keys: []` dan mengembalikan per-key hasil

Jika Anda mau, saya bisa:

- Menambahkan autentikasi sederhana (password) supaya endpoint tidak disalahgunakan.
- Menambahkan progress yang lebih rinci atau kemampuan menyimpan log di bucket.
