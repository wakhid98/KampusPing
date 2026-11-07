import { esc } from "./util.js";
export const mmss = s => `${String(s / 60 | 0).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const SC = { A: 4, "B+": 3.5, B: 3, "C+": 2.5, C: 2, D: 1, E: 0 };
export const calc = g => { const s = g.reduce((a, x) => a + (+x.sks || 0), 0); return s ? (g.reduce((a, x) => a + (+x.sks || 0) * (SC[x.nilai] ?? 0), 0) / s).toFixed(2) : "0.00"; };
export function fokus(c) {
  const f = c.me.focus || {}, k = n => new Date(Date.now() + 252e5 - n * 864e5).toISOString().slice(0, 10), t = c.ft;
  let wk = 0; for (let i = 0; i < 7; i++) wk += f[k(i)] || 0;
  return `<div class="grid"><div class="card big s4" style="text-align:center"><h3>${t.brk ? "Istirahat" : "Fokus"}</h3><div class="clock" id="ftime">${mmss(t.left)}</div>
  <div class="actions" style="justify-content:center"><button class="btn" data-act="ftToggle">${t.run ? "Jeda" : "Mulai"}</button><button class="btn ghost" data-act="ftReset">Ulang</button></div>
  <div class="tools" style="justify-content:center;margin-top:14px">${[15, 25, 45].map(m => `<button class="chip${t.mode === m ? " on" : ""}" data-act="ftMode" data-m="${m}">${m} menit</button>`).join("")}</div></div>
  <div class="card s2"><h3>Sesi hari ini</h3><div class="num">${f[k(0)] || 0}</div><p class="muted">${wk} sesi dalam 7 hari</p></div></div>`;
}
export function ipk(c) {
  const g = c.me.grades || [];
  return `<div class="card stack"><div class="row2"><div><h3>IPK / IPS</h3><div class="num" id="ipk">${calc(g)}</div></div><button class="btn" data-act="gAdd">+ Mata kuliah</button></div>
  ${g.map((x, i) => `<div class="grow-g"><input data-g="${i}.name" value="${esc(x.name)}" placeholder="Mata kuliah" aria-label="Nama"><input data-g="${i}.sks" type="number" min="1" max="6" value="${x.sks}" aria-label="SKS">
  <select data-g="${i}.nilai" aria-label="Nilai">${Object.keys(SC).map(n => `<option${n === x.nilai ? " selected" : ""}>${n}</option>`).join("")}</select><button class="ib" data-act="gDel" data-i="${i}" aria-label="Hapus">✕</button></div>`).join("")
  || '<p class="muted">Tambahkan mata kuliah dan nilainya. Skala: A=4, B+=3,5, B=3, C+=2,5, C=2, D=1, E=0.</p>'}</div>`;
}
// Tambah tugas cepat: "Laporan fisika besok 23.59" -> judul + deadline (WIB)
export function quick(txt) {
  const W = new Date(Date.now() + 252e5), d = new Date(Date.UTC(W.getUTCFullYear(), W.getUTCMonth(), W.getUTCDate())), p = n => String(n).padStart(2, "0"), names = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
  let t = txt, hh = 23, mm = 59, off = 1;
  t = t.replace(/\b(\d{1,2})[.:](\d{2})\b/, (_, h, m) => { hh = +h; mm = +m; return ""; }).replace(/\bjam (\d{1,2})\b/i, (_, h) => { hh = +h; mm = 0; return ""; });
  const w = (re, o) => re.test(t) ? (off = o, t = t.replace(re, ""), true) : false;
  if (!w(/\bhari ini\b/i, 0) && !w(/\blusa\b/i, 2) && !w(/\bbesok\b/i, 1)) { const i = names.findIndex(n => new RegExp("\\b" + n + "\\b", "i").test(t)); if (i >= 0) { off = (i - W.getUTCDay() + 7) % 7 || 7; t = t.replace(new RegExp("\\b" + names[i] + "\\b", "i"), ""); } }
  d.setUTCDate(d.getUTCDate() + off);
  return { title: t.replace(/\s+/g, " ").trim() || txt, when: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(Math.min(hh, 23))}:${p(Math.min(mm, 59))}` };
}
export const welcome = () => `<div class="wel"><span class="logo">K</span><h1>Kuliah semakin mudah, semua dalam satu genggaman.</h1><p class="muted">Pengingat jadwal, presensi, tugas, dan fokus belajar. Tanpa daftar, tanpa ribet.</p>
<div class="fcards">${[["Pengingat jadwal", "Notifikasi sebelum kelas dimulai."], ["Presensi mandiri", "Catat hadir, izin, sakit, dan pantau persentasenya."], ["Tugas & lampiran", "Deadline bertingkat plus tautan berkas."], ["Timer fokus", "Sesi Pomodoro dan rekap mingguan."], ["Kalkulator IPK", "Hitung IPS dan IPK kapan saja."], ["Pengumuman", "Info penting dari admin langsung ke HP."]].map(([t, d]) => `<div class="card"><b>${t}</b><p class="muted">${d}</p></div>`).join("")}</div>
<button class="btn big" data-act="start" style="max-width:360px">Mulai sekarang</button><p class="muted" style="font-size:13px">Tanpa login. Data tersimpan di perangkatmu dan dilindungi aturan keamanan.</p></div>`;
export function nextWhen(w, r) { // tugas berulang: jadwal berikutnya yang masih di masa depan
  const d = new Date(w + ":00Z"), now = Date.now() + 252e5;
  for (let i = 0; i < 400 && (i === 0 || d.getTime() <= now); i++) { if (r === "daily") d.setUTCDate(d.getUTCDate() + 1); else if (r === "weekly") d.setUTCDate(d.getUTCDate() + 7); else d.setUTCMonth(d.getUTCMonth() + 1); }
  return d.toISOString().slice(0, 16);
}
const WHY = { "auth/operation-not-allowed": "Metode Anonymous belum diaktifkan di Firebase Authentication.", "auth/admin-restricted-operation": "Metode Anonymous belum diaktifkan di Firebase Authentication.",
  "auth/network-request-failed": "Tidak ada koneksi internet. Periksa jaringanmu.", "auth/too-many-requests": "Terlalu banyak percobaan dari jaringan ini. Tunggu beberapa menit lalu coba lagi.",
  "auth/invalid-api-key": "Konfigurasi Firebase belum benar (cek firebase-config.js).", "auth/unauthorized-domain": "Alamat web ini belum diizinkan di Firebase Authentication." };
export const boot = err => err
  ? `<div class="login"><span class="logo">K</span><h1>Belum bisa masuk</h1><p class="muted">${esc(WHY[err.code] || "Terjadi kesalahan tak terduga.")}</p><button class="btn" data-act="retry">Coba lagi</button><p class="muted" style="font-size:12px">Kode: ${esc(err.code || "tidak diketahui")}</p></div>`
  : '<div class="login"><span class="logo pulse">K</span><p class="muted">Memuat KampusPing...</p></div>';
