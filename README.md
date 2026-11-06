# KampusPing (Realtime Database, tanpa login)

Struktur: `public/` (web + `admin.html`), `scripts/notify.js` (pengirim), `database.rules.json`, `.github/workflows/notify.yml`.

## Setup v4
1. Firebase Console > **Build > Realtime Database > Create database** (lokasi Singapore). Salin URL-nya (mis. `https://ID-default-rtdb.asia-southeast1.firebasedatabase.app`).
2. Authentication > Sign-in method: aktifkan **Anonymous** (agar pengguna masuk tanpa login) dan **Email/Password** (untuk admin).
3. Tambahkan baris ini di `public/js/firebase-config.js` pada `firebaseConfig`: `databaseURL: "URL dari langkah 1",`
4. Authentication > Users > **Add user** (email + kata sandi admin), salin **User UID**.
5. Realtime Database > tab Data > tambahkan node `admins` > child dengan nama = UID tadi, nilai `true`.
6. `firebase deploy --only hosting,database` (hapus saja file `firestore.rules` lama).
7. GitHub > Settings > Secrets > Actions: tambah secret baru `DB_URL` (URL langkah 1). Secret lain tetap.
8. Web pengguna: `/` (tanpa login). Dasbor admin: `/admin.html` (login email).

## Keamanan (v6)
- `firebase deploy --only hosting,database` memasang header keamanan (CSP, anti-clickjacking, HSTS) dan aturan database dengan validasi ketat.
- Jika ada yang tidak tampil setelah deploy, ganti `Content-Security-Policy` di `firebase.json` menjadi `Content-Security-Policy-Report-Only`, deploy ulang, lalu cek Console browser (F12).
- Google Cloud Console > APIs & Services > Credentials > API key web: batasi ke **HTTP referrers** (alamat web-mu) dan hanya API yang dipakai.
- Opsional: aktifkan **App Check** (reCAPTCHA) di Firebase untuk menahan bot, lalu tegakkan untuk Realtime Database.
- Admin: kata sandi kuat (12+ karakter), sesi per-tab, auto-logout 15 menit, batas percobaan masuk, dan log aktivitas.
- Hapus file `firestore.rules` yang lama.
