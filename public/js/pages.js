import { esc } from "./util.js";
export const mmss = s => `${String(s / 60 | 0).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const SC = { A: 4, "B+": 3.5, B: 3, "C+": 2.5, C: 2, D: 1, E: 0 };
export const calc = (g, smt) => { const r = smt == null ? g : g.filter(x => (x.smt || 1) === smt), t = r.reduce((a, x) => a + (+x.sks || 0), 0); return t ? (r.reduce((a, x) => a + (+x.sks || 0) * (SC[x.nilai] ?? 0), 0) / t).toFixed(2) : "0.00"; };
export function ipk(c) {
  const g = c.me.grades || [], smts = [...new Set(g.map(x => x.smt || 1))].sort((a, b) => a - b);
  const row = (x, i) => `<div class="grow-g"><input data-g="${i}.name" value="${esc(x.name)}" placeholder="Mata kuliah" aria-label="Nama" maxlength="100"><input data-g="${i}.sks" type="number" min="1" max="6" value="${esc(x.sks)}" aria-label="SKS">
  <select data-g="${i}.nilai" aria-label="Nilai">${Object.keys(SC).map(n => `<option${n === x.nilai ? " selected" : ""}>${n}</option>`).join("")}</select><button class="ib" data-act="gDel" data-i="${i}" aria-label="Hapus">✕</button></div>`;
  const blocks = smts.map(s => `<div class="card stack"><div class="row2"><h3 style="margin:0">Semester ${s}</h3><div class="actions"><span class="badge">IPS ${calc(g, s)}</span><button class="btn ghost" data-act="gAdd" data-s="${s}">+ Mata kuliah</button></div></div>${g.map((x, i) => (x.smt || 1) === s ? row(x, i) : "").join("")}</div>`).join("");
  return `<div class="card"><div class="row2"><div><h3>IPK kumulatif</h3><div class="num" id="ipk">${calc(g)}</div></div><button class="btn" data-act="gSem">+ Semester berikutnya</button></div></div>
  <div class="stack" style="margin-top:14px">${blocks || '<div class="empty"><p>Belum ada nilai. Mulai dari semester pertama. Skala: A=4, B+=3,5, B=3, C+=2,5, C=2, D=1, E=0.</p><button class="btn" data-act="gSem">Tambah semester 1</button></div>'}</div>`;
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
export const welcome = () => `<div class="wel"><span class="logo">K</span><h1>Kuliah semakin mudah, semua dalam satu genggaman.</h1><p class="muted">Pengingat jadwal, presensi, tugas, agenda, dan catatan. Tanpa daftar, tanpa ribet.</p>
<div class="fcards">${[["Pengingat jadwal", "Notifikasi sebelum kelas dimulai."], ["Presensi mandiri", "Catat hadir, izin, sakit, dan pantau persentasenya."], ["Tugas & lampiran", "Deadline bertingkat plus tautan berkas."], ["Kalender & agenda", "Tambah agenda sendiri dan dapat pengingat."], ["Catatan rapi", "Notepad dengan kategori, warna, dan arsip."], ["Kalkulator IPK", "Hitung IPS dan IPK kapan saja."], ["Pengumuman", "Info penting dari admin langsung ke HP."]].map(([t, d]) => `<div class="card"><b>${t}</b><p class="muted">${d}</p></div>`).join("")}</div>
<button class="btn big" data-act="start" style="max-width:360px">Mulai sekarang</button><p class="muted" style="font-size:13px">Tanpa login. Data tersimpan di perangkatmu dan dilindungi aturan keamanan.</p></div>`;
export function nextWhen(w, r) { // tugas berulang: jadwal berikutnya yang masih di masa depan
  const d = new Date(w + ":00Z"), now = Date.now() + 252e5;
  for (let i = 0; i < 400 && (i === 0 || d.getTime() <= now); i++) { if (r === "daily") d.setUTCDate(d.getUTCDate() + 1); else if (r === "weekly") d.setUTCDate(d.getUTCDate() + 7); else d.setUTCMonth(d.getUTCMonth() + 1); }
  return d.toISOString().slice(0, 16);
}
