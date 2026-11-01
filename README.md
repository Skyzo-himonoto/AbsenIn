# AbsenIn — AbsenIn (UI v2)

Prototipe web absensi dengan login responsif gaya mobile krem-oranye, dashboard anggota/pengurus, pemindaian QR, pengajuan izin, status kas, riwayat, ekspor CSV, tema terang/gelap, service worker, dan kerangka notifikasi web push.

## Firebase
Lihat `FIREBASE_SETUP.md` untuk mengaktifkan login Firebase dan menyiapkan Firestore.

## Jalankan demo
1. Ekstrak ZIP.
2. Jalankan dari server lokal, bukan `file://`, misalnya `python -m http.server 8000` di folder proyek.
3. Buka `http://localhost:8000`.
4. Login dengan `SISWA024` (anggota) atau `ADMIN001` (pengurus).

## Yang bisa dicoba
- Login ID unik dan formulir permintaan akun.
- Dashboard anggota: riwayat, pengajuan izin Firestore, status kas, pemindai QR, dan izin notifikasi browser.
- Dashboard pengurus: buka sesi QR, verifikasi izin melalui Firestore, kelola anggota dan status kas, ekspor CSV.
- Layar QR: token berotasi di demo dan QR disembunyikan saat tab kehilangan fokus/menjadi tidak aktif.
- Tema terang/gelap dan PWA shell melalui `manifest.webmanifest` + `sw.js`.

## Penting: demo bukan sistem produksi
Data demo menggunakan `localStorage`; tiap browser/perangkat memiliki data terpisah. Login ID saja bukan autentikasi aman. QR demo juga dibuat di sisi klien dan tidak tahan pemalsuan. Jangan gunakan untuk rekap resmi atau masukkan data pribadi sungguhan.

### Notifikasi HP
Tombol notifikasi meminta izin browser pada perangkat saat ini. `sw.js` sudah memiliki handler event `push`, tetapi notifikasi lintas perangkat **belum aktif** sampai backend push dipasang. Agar pengurus membuka sesi lalu semua anggota menerima notifikasi, backend perlu menyimpan subscription tiap perangkat dan mengirim Web Push dengan VAPID key. Google Apps Script saja bukan implementasi Web Push lengkap yang aman; gunakan backend/serverless function untuk mengirim push dan simpan private VAPID key hanya di server.

### Screenshot dan titip absen
Web biasa tidak memiliki API lintas-browser yang andal untuk memblokir screenshot OS. Layar QR di demo hanya menyembunyikan QR ketika tab tidak aktif dan menambahkan watermark; pengguna masih dapat mengambil screenshot saat QR terlihat atau memotret dengan perangkat lain. Untuk mengurangi penyalahgunaan, produksi perlu QR singkat umur, nonce sekali pakai yang divalidasi atomik di server, pembatasan lokasi, limit percobaan, log audit, serta verifikasi perangkat. Deteksi dua HP berdekatan juga tidak dapat dijamin oleh web biasa; GPS dapat meleset atau dimanipulasi.

**Kebijakan QR sekali pakai global** berarti setiap scan valid menghabiskan token untuk semua anggota. Pengurus harus membuat token baru setelah setiap scan, atau sistem bisa menggunakan token per anggota/perangkat agar sesi ramai tidak tersendat. Pilih kebijakan ini sebelum produksi.

## Data Sheets
Lihat `DATA_SCHEMA.md` untuk 7 tab dan kolom yang diminta: `users`, `sessions`, `attendances`, `leave_requests`, `avatar_frames`, `kas_transactions`, `system_logs`.

## Deploy
Frontend statis dapat dipasang di Vercel/Netlify. Kamera dan geolokasi membutuhkan localhost atau HTTPS. Untuk produksi, pindahkan otorisasi, token QR, validasi radius, perekaman presensi, izin, kas, dan log ke backend. Jangan menyimpan private key, OTP polos, atau kredensial admin di frontend.

### QR Online (Firebase v3)

- `Buka layar QR` membuat sesi bersama di Firestore (`sessions/current`).
- `Lihat layar QR` membuka sesi aktif yang sama.
- Token berotasi tiap 30 detik dan layar QR menerima update realtime.
- `Tutup sesi` menonaktifkan sesi di Firestore untuk semua perangkat.
- Aturan Firestore wajib diperbarui menggunakan `firestore.rules` yang disertakan.


## v5 — Manajemen akun anggota
Dashboard pengurus sekarang membuat akun anggota melalui Firebase Authentication dan profil Firestore. Tersedia pembuatan satu akun dan impor CSV berformat `ID,NAMA,KELAS`; password awal dibuat acak dan diunduh dalam CSV hasil. Lindungi file kredensial dan bagikan secara pribadi. Struktur file dan fitur versi sebelumnya dipertahankan.
