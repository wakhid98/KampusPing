# KampusPing (tanpa login untuk pengguna)

Struktur: `public/` (web + `admin.html` + `cek.html`), `scripts/notify.js` (pengirim), `database.rules.json`, `.github/workflows/notify.yml`.

## Cara kerja
- Pengguna biasa **tidak login**. Data terikat ke *kode sinkron* acak di perangkat (Pengaturan > Kode sinkron).
- **Login hanya untuk admin** (email + kata sandi) di `/admin.html`: kelola mata kuliah, pengumuman, jam tenang, dan hapus data.

## Setup
1. Firebase Console > **Realtime Database > Create database**. Salin URL-nya ke `databaseURL` di `public/js/firebase-config.js`.
2. Authentication > Sign-in method: aktifkan **Email/Password** (Anonymous tidak diperlukan lagi).
3. Authentication > Users > **Add user** (admin), salin **User UID**. Di Realtime Database > Data buat node `admins` > child bernama UID itu, nilai `true`.
4. `firebase deploy --only hosting,database`
5. GitHub Secrets (pengirim notifikasi): `FIREBASE_SA`, `TG_TOKEN`, `SITE_URL`, `DB_URL`.
6. Jika ada masalah koneksi, buka `/cek.html`.

## Keamanan
- Kode sinkron bersifat seperti kata sandi: siapa pun yang memilikinya bisa melihat dan mengubah data. Aturan database hanya mengizinkan akses ke jalur dengan kode yang cocok, dan daftar pengguna hanya bisa dibaca admin.
- Aturan memvalidasi tipe dan panjang setiap kolom. Karena tanpa login, sebaiknya aktifkan **App Check** dan batasi API key ke alamat webmu (Google Cloud Console > Credentials).

## Beasiswa otomatis
- `.github/workflows/beasiswa.yml` menjalankan `scripts/beasiswa.js` setiap pagi 05:30 WIB dan setiap kali proyek di-push ke GitHub (setelah deploy).
- Pencari membaca berita beasiswa, membaca tanggal (hari, bulan, tahun), membuang yang sudah lewat, lalu menyimpannya ke `scholarships` di Realtime Database. Perlu secret `FIREBASE_SA` dan `DB_URL` (sama seperti pengirim notifikasi).
- Admin dapat menambah sumber (RSS atau halaman daftar berita) dan menyembunyikan hasil yang tidak cocok di Dasbor Admin, tab Beasiswa. Tanggal hasil otomatis bisa meleset, jadi selalu cek situs resmi.

## Jadikan aplikasi Android (APK)
Web ini sudah siap dipasang sebagai aplikasi (ikon, manifest, service worker, halaman offline).
1. Deploy: `firebase deploy --only hosting`.
2. Buka **pwabuilder.com**, masukkan alamat webmu, klik **Start**. Pastikan Manifest dan Service Worker berstatus hijau.
3. Klik **Package for stores**, pilih **Android**, isi: Package ID (mis. `com.robonix.kampusping`), App name `KampusPing`, lalu **Signing key: New**. Klik **Generate** dan unduh zip-nya.
4. Di dalam zip: file `.apk` (untuk dipasang langsung di HP), `.aab` (untuk Play Store), keystore + `signing-key-info.txt` (SIMPAN, jangan hilang), dan `assetlinks.json`.
5. Isi file `public/.well-known/assetlinks.json` di proyek ini dengan isi `assetlinks.json` dari zip, lalu deploy hosting lagi. Ini menghilangkan bilah alamat sehingga tampil layar penuh seperti aplikasi.
6. Kirim `.apk` ke HP dan pasang (izinkan "pasang dari sumber tidak dikenal").

## Semester dan SIAKAD (v16)
- Admin: Dasbor Admin, tab Mata kuliah, bagian **Semester**. Semester pertama otomatis aktif dan mengambil mata kuliah yang sudah ada. Tombol **Tambah semester berikutnya** membuat semester baru; ganti yang aktif dengan **Jadikan aktif**. Hanya jadwal semester aktif yang dipakai di beranda, kalender, dan notifikasi.
- Mahasiswa: tab Nilai kini per semester (IPS tiap semester + IPK kumulatif) dengan tombol **+ Semester berikutnya**.
- Tombol **Buka SIAKAD** di halaman Jadwal membuka SIAKAD di tab baru. SIAKAD butuh login dan tidak bisa ditanam di dalam web ini.

## Notifikasi di aplikasi Android (APK)
1. Di PWABuilder (Android options) pastikan **Notification delegation / Enable notifications** aktif, dan isi `public/.well-known/assetlinks.json` dari zip lalu deploy (tanpa ini aplikasi hanya jadi tab Chrome).
2. Setelah APK dipasang: buka aplikasi, Pengaturan, **Aktifkan notifikasi**, pilih Izinkan. Tekan **Kirim notifikasi uji** untuk memastikan tampil.
3. Android: Pengaturan HP, Aplikasi, KampusPing, Notifikasi harus aktif; hemat baterai jangan membatasi aplikasi. Pada Android 13 ke atas izin notifikasi muncul sebagai kotak dialog.
4. Telegram tetap menjadi cadangan bila notifikasi aplikasi terlambat.
