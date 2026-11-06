# KampusPing

Struktur: `public/` (web), `scripts/notify.js` (pengirim), `.github/workflows/notify.yml` (cron), `firestore.rules`.
Edit tampilan di `public/css/style.css`, logika halaman di `public/js/app.js`, Gerbang Aksi di `public/js/gate.js`.

## Setup (semua gratis)
1. Firebase Console: buat proyek (Spark), aktifkan **Authentication > Google**, **Firestore**, dan **Hosting**.
2. Project settings > tambah Web app, salin config ke `public/js/firebase-config.js`. Cloud Messaging > Web Push certificates > Generate key pair, salin ke `VAPID`.
3. `npm i -g firebase-tools && firebase login && firebase init` (pilih proyekmu, jangan timpa file) lalu `firebase deploy`.
4. Telegram: chat @BotFather, `/newbot`, simpan token. Chat @userinfobot untuk dapat Chat ID, lalu kirim `/start` ke botmu. Isi Chat ID di tab Atur.
5. Repo GitHub **publik**, push folder ini. Settings > Secrets > Actions: `FIREBASE_SA` (Project settings > Service accounts > Generate private key, isi seluruh JSON), `TG_TOKEN`, `SITE_URL` (alamat webmu).
6. Buka web, login, tab Atur > Aktifkan notifikasi web. Di iPhone, tambahkan web ke layar utama dulu.

## Admin (v3)
1. Firebase Console > Authentication > Sign-in method > aktifkan **Email/Password**.
2. Authentication > Users > **Add user**: isi email dan kata sandi admin. Salin **User UID**-nya.
3. Firestore Database > **Start collection** `admins` > Document ID = UID tadi > tambahkan satu field apa saja (mis. `ok` = true).
4. `firebase deploy --only hosting,firestore:rules` lalu di web klik **Masuk sebagai admin**.
Admin: kelola mata kuliah (tab Jadwal), pengumuman, dan jam tenang. Mahasiswa: login Google, hanya melihat jadwal.
