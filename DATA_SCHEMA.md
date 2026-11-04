# Skema data AbsenIn

Buat 7 tab Google Sheets dengan nama dan kolom berikut (urutan kolom dipertahankan). Jangan simpan password atau secret di tab yang bisa dibaca anggota.

## users
`user_id`, `nama_lengkap`, `kelas`, `no_whatsapp`, `role`, `jabatan`, `otp_backup_code`, `avatar_url`, `active_frame_id`, `theme_preference`, `created_at`

## sessions
`session_id`, `tanggal`, `waktu_buka`, `batas_waktu_hadir`, `dibuat_oleh`, `qr_dynamic_token`, `latitude_lab`, `longitude_lab`, `max_radius_meter`, `status_sesi`

## attendances
`attendance_id`, `session_id`, `user_id`, `tanggal`, `waktu_masuk`, `user_latitude`, `user_longitude`, `distance_meters`, `status`, `metode`, `catatan`, `approval_status`, `approved_by`

## leave_requests
`request_id`, `user_id`, `tipe`, `alasan`, `bukti_file_url`, `status`, `catatan_pengurus`, `updated_at`

## avatar_frames
`frame_id`, `nama_bingkai`, `css_class`, `image_overlay_url`, `unlock_type`, `unlock_value`

## kas_transactions
`transaction_id`, `user_id`, `minggu_ke`, `nominal_wajib`, `nominal_dibayar`, `status`, `tanggal_bayar`

## system_logs
`log_id`, `user_id`, `timestamp`, `action_type`, `device_info`, `coords_data`

## Validasi backend wajib
- `user_id` dan `session_id` harus diverifikasi di server; jangan percaya role yang dikirim frontend.
- Token QR dibuat server dengan kriptografi aman, memiliki `expires_at`, nonce, dan status pemakaian. Validasi token dan pencatatan hadir harus satu operasi atomik agar request paralel tidak memakai token yang sama.
- Untuk kebijakan QR sekali pakai global, backend harus menandai nonce sebagai `USED` setelah scan pertama yang sah; anggota berikutnya harus menunggu token baru dari pengurus. Ini mengurangi titip absen tetapi memperlambat absensi rombongan.
- Hitung jarak di server dari koordinat yang dikirim browser dan simpan hasilnya; lokasi browser tetap bisa dipalsukan di perangkat yang dikompromikan.
- OTP cadangan harus memiliki batas percobaan, kedaluwarsa, dan hanya dapat dipakai sekali. Simpan hash OTP, bukan kode polos.
- Batasi hak akses: anggota hanya boleh membaca datanya sendiri; pengurus hanya bisa menjalankan fungsi sesuai jabatan.
- Catat percobaan token kedaluwarsa, jarak di luar radius, duplikasi, dan perubahan status kas/izin pada `system_logs`.
