# AbsenIn — integrasi Firebase tahap awal

## Sudah disiapkan
- `firebase.js` menginisialisasi Firebase Web SDK, Authentication, dan Firestore.
- Form login sekarang meminta ID unik + password.
- ID dipetakan ke email internal: `{user_id lowercase}@absenin.local`.
- Setelah login, profil dibaca dari dokumen Firestore `users/{Firebase Auth UID}`.
- `firestore.rules` berisi baseline aturan akses untuk koleksi inti.

## Konfigurasi di Firebase Console
1. Authentication → Sign-in method → aktifkan Email/Password.
2. Firestore → Rules → salin `firestore.rules` → Publish.
3. Buat akun tiap anggota/pengurus di Authentication. Email akun wajib berbentuk `robot_id01@absenin.local` untuk ID `ROBOT_ID01`; atur password secara terpisah.
4. Di Firestore buat dokumen pada koleksi `users`, Document ID harus sama dengan UID akun Authentication.
5. Isi field dokumen: `user_id` (string), `nama` (string), `role` (string `SISWA` atau `PENGURUS`), `kelas` (string). Untuk admin, `role` harus `PENGURUS`.

## Batasan yang masih harus dikerjakan sebelum dipakai sungguhan
Dashboard riwayat, izin, kas, serta QR masih menyimpan/membaca sebagian data dari `localStorage` pada versi dasar. Belum semua operasi dipindah ke Firestore. QR juga belum memiliki validasi server-side anti-pemalsuan dan pencegahan scan ganda secara atomik. Jangan gunakan untuk absensi resmi sampai migrasi data dan pengujian keamanan selesai.

Hosting tetap GitHub → Vercel. Firebase hanya untuk Authentication dan Firestore. Jangan pernah memasukkan service-account key/private key ke frontend.


## Status integrasi v2
- Login memakai Firebase Authentication.
- Profil dibaca dari `users/{Firebase UID}`.
- Riwayat absensi siswa dibaca dari koleksi `attendances` berdasarkan `user_id`.
- Pencatatan absensi memakai transaksi Firestore dengan ID dokumen `USERID_YYYY-MM-DD` untuk mencegah duplikasi per hari.
- Dashboard pengurus membaca daftar profil dan absensi dari Firestore.
- QR sesi masih lokal di browser pengurus dan belum dapat dibagikan/validasi aman lintas perangkat. Jangan gunakan untuk absensi resmi sebelum backend sesi QR dibuat.
- Pengajuan izin versi ini sudah menggunakan koleksi Firestore `leave_requests`: anggota dapat membuat dan membaca pengajuannya sendiri, sedangkan pengurus dapat membaca seluruh pengajuan dan mengubah statusnya.
- Status kas masih lokal pada tahap ini.

Profil setiap anggota harus dibuat di Authentication dan dokumen `users/{UID}` harus disiapkan dengan field `user_id`, `nama`, `role` (`SISWA` atau `PENGURUS`), dan `kelas`.

## QR Online (Firebase v3)

Versi ini memindahkan sesi QR ke Cloud Firestore pada dokumen `sessions/current`.

1. Buka Firebase Console → Firestore Database → Rules.
2. Ganti seluruh Rules dengan isi file `firestore.rules` dari ZIP ini, lalu klik Publish.
3. Pastikan akun pengurus sudah login dan dokumen profilnya berada di `users/{UID}` dengan `user_id`, `nama`, dan `role: "PENGURUS"`.
4. Di dashboard pengurus, isi latitude dan longitude lokasi kegiatan, lalu klik **Buka layar QR**.
5. Tombol **Lihat layar QR** membuka layar sesi yang sama. Layar QR mengikuti perubahan token melalui Firestore realtime.
6. Token QR berganti setiap 30 detik. Tombol **Tutup sesi** menonaktifkan sesi untuk semua perangkat.
7. Anggota login di perangkat masing-masing, pilih Scan QR, izinkan kamera dan lokasi, lalu pindai QR.

Data sesi disimpan di `sessions/current`; catatan hadir ditulis ke `attendances/{USER_ID}_{YYYY-MM-DD}`. Firestore Rules memeriksa token sesi aktif dan mencegah anggota membuat dokumen absensi yang sudah ada.

**Catatan keamanan:** token diputar oleh halaman layar QR yang dibuka pengurus, sedangkan pemeriksaan token dilakukan oleh Firestore Security Rules di server. Perangkat pengurus harus tetap membuka layar QR agar token terus berotasi. Validasi lokasi browser bukan bukti anti-spoofing yang kuat; untuk kebutuhan berisiko tinggi, tambahkan backend tepercaya/attestation dan audit keamanan sebelum operasional resmi.


## Pengajuan izin Firestore (v4)

Pastikan Firestore Rules terbaru dari file `firestore.rules` sudah dipublikasikan. Koleksi `leave_requests` dibuat otomatis saat anggota pertama kali mengirim formulir izin. Dokumen berisi `user_id`, `nama`, `date`, `reason`, `detail`, `status`, dan `created_at`. Anggota hanya dapat membaca pengajuannya sendiri; pengurus dengan `role: "PENGURUS"` dapat melihat semua pengajuan dan menyetujui/menolak. Tidak perlu membuat koleksi atau dokumen izin secara manual.


## Pembuatan akun anggota (v5)
- Login sebagai pengurus yang sudah memiliki dokumen `users/{UID}` dengan `role: "PENGURUS"`.
- Form Tambah Anggota membuat akun Email/Password melalui instance Firebase Authentication kedua agar sesi pengurus tidak terganti, lalu membuat profil `users/{UID}` di Firestore.
- Impor massal menerima format CSV sederhana: `ID,NAMA,KELAS` (satu anggota per baris). Jangan masukkan password ke textarea; password awal acak dibuat otomatis.
- Setelah proses, browser mengunduh `absenin-akun-anggota.csv` berisi ID, email internal, password awal, dan status. File ini sangat sensitif: simpan offline, bagikan password masing-masing secara pribadi, lalu hapus file setelah distribusi. Jangan unggah CSV kredensial ke GitHub/Vercel.
- Pembuatan akun dari browser tetap tunduk pada batas kuota dan rate limit Firebase Authentication. Jalankan impor dalam batch kecil; jika sebagian gagal, ulangi hanya baris yang gagal.
- Pengurus harus sudah login dan Rules Firestore harus mengizinkan admin membuat dokumen `users`. Tidak ada service-account key atau private key di frontend.
- Fitur ini membuat akun baru; tidak mengubah atau menghapus akun `ADMIN001` yang sudah ada.
