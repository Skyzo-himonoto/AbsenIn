# Backend tambah anggota AbsenIn (Vercel)

## File baru/perubahan
- `api/members.js`: endpoint server tepercaya untuk membuat akun Firebase Auth + profil Firestore.
- `package.json`: dependensi Firebase Admin SDK.
- `vercel.json`: runtime Node.js untuk Vercel Functions.
- `app.js`: form tambah anggota dan impor massal memanggil `/api/members`; tidak lagi membuat akun melalui browser.
- `firebase.js`: menghapus Firebase Auth kedua di browser.

## Sebelum backend aktif
1. Buat/ambil service account dari Firebase Console → Project settings → Service accounts → Generate new private key. File JSON ini sangat rahasia. Jangan pernah upload ke GitHub atau kirim ke chat.
2. Di Vercel Project → Settings → Environment Variables, buat `FIREBASE_SERVICE_ACCOUNT_JSON` dan isi seluruh isi JSON service account sebagai satu nilai. Aktifkan untuk environment yang akan dipakai.
3. Deploy project ke Vercel setelah konfigurasi environment disiapkan. Vercel akan memasang `firebase-admin` dari `package.json`.
4. Login sebagai pengurus dan uji tambah anggota. Endpoint memverifikasi Firebase ID token dan mengecek `users/{uid}.role == PENGURUS` sebelum membuat akun.

Firebase Admin SDK berjalan di server dan melewati Firestore Rules; jangan pernah menaruh service account JSON di frontend. Rules Firestore tidak perlu dilonggarkan untuk endpoint ini.

## Catatan
Backend ini memerlukan Vercel Functions, sehingga uji endpoint tidak akan berfungsi jika website hanya dibuka dari SPCK atau GitHub Pages. Untuk saat ini kode dapat disimpan di GitHub; aktifkan setelah Vercel deployment disiapkan. Akun dibuat oleh Admin SDK, sehingga sesi pengurus pada browser tidak berubah.
