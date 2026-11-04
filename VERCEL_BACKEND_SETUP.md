# AbsenIn v6 — Backend tambah anggota

## Penting
GitHub Pages hanya menyajikan frontend statis. Endpoint `/api/admin/create-member` harus dijalankan di Vercel. Sebelum backend dideploy dan variabel rahasia disetel, fitur tambah anggota memang belum akan berhasil.

## 1. Siapkan service account dengan aman
1. Firebase Console → Project settings → Service accounts → Generate new private key.
2. Simpan file JSON tersebut secara privat. **Jangan pernah masukkan ke ZIP frontend, GitHub, SPCK, atau chat.**
3. Di Vercel project → Settings → Environment Variables, buat `FIREBASE_SERVICE_ACCOUNT_JSON` dan isi dengan seluruh isi JSON service account (satu baris JSON juga boleh). Pilih Production dan Preview sesuai kebutuhan.

## 2. Deploy
1. Upload/commit isi folder proyek ini ke repository GitHub (termasuk folder `api/` dan `package.json`).
2. Import repository ke Vercel, Framework Preset: Other.
3. Deploy. Vercel akan memasang `firebase-admin` dari package.json dan menjalankan `api/admin/create-member.js` sebagai Function.
4. Setelah deploy, pastikan frontend dan API menggunakan domain project Vercel yang sama. Untuk GitHub Pages, endpoint relatif `/api/...` tidak akan ada.

## 3. Uji
Login sebagai pengurus yang profil Firestore `users/{UID}`-nya memiliki `role: "PENGURUS"`. Tambahkan satu anggota uji. Periksa Firebase Authentication dan Firestore `users/{UID}`.

## Keamanan
- Backend memverifikasi Firebase ID token dan role PENGURUS dari Firestore sebelum membuat akun.
- Service account hanya berada di Environment Variables Vercel, tidak di browser.
- Backend membuat akun Auth dan profil Firestore; jika penulisan profil gagal, backend mencoba menghapus akun Auth yang baru dibuat.
- Jangan mengubah Firestore Rules menjadi public read/write.
- Password awal hanya dikirim melalui HTTPS ke endpoint; jangan catat atau unggah file CSV kredensial ke repository.

## Catatan struktur data
Endpoint membuat `users/{Firebase UID}` dengan `user_id`, `nama`, `role: "SISWA"`, `kelas`, `created_at`, dan `status: "AKTIF"`, sesuai pola login AbsenIn.
