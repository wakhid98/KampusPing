import { esc } from "./gate.js";
export const mmss = s => `${String(s / 60 | 0).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const SC = { A: 4, "B+": 3.5, B: 3, "C+": 2.5, C: 2, D: 1, E: 0 };
export const calc = g => { const s = g.reduce((a, x) => a + (+x.sks || 0), 0); return s ? (g.reduce((a, x) => a + (+x.sks || 0) * (SC[x.nilai] ?? 0), 0) / s).toFixed(2) : "0.00"; };
export const login = adm => `<div class="land"><section class="hero-l"><span class="logo">K</span><h1>KampusPing</h1>
<p>Asisten kuliah yang mengingatkan sebelum telat, dan memastikan kamu benar-benar mulai.</p>
<ul class="feat"><li>Pengingat jadwal, tugas, dan beasiswa</li><li>Gerbang Aksi dan timer fokus</li><li>Kalkulator IPK dan pengumuman kampus</li></ul></section>
<section class="auth card"><h2>${adm ? "Masuk admin" : "Selamat datang"}</h2>${adm
  ? `<label>Email<input id="em" type="email" autocomplete="username"></label><label>Kata sandi<input id="pw" type="password" autocomplete="current-password"></label><button class="btn big" data-act="adminLogin">Masuk</button>`
  : `<p class="muted">Masuk dengan akun Google untuk mulai.</p><button class="btn big" data-act="in">Masuk dengan Google</button>`}
<button class="link" data-act="adminToggle">${adm ? "Kembali ke login mahasiswa" : "Masuk sebagai admin"}</button></section></div>`;
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
export const adminCard = c => !c.admin ? "" : `<div class="card stack"><h3>Pengaturan admin</h3><p class="muted">Mata kuliah dikelola di tab Jadwal.</p>
  <label>Pengumuman untuk semua pengguna<textarea id="ann" rows="3">${esc(c.cfg.announce?.text || "")}</textarea></label>
  <div class="row2"><label>Jam tenang mulai<input id="qs" type="number" min="0" max="23" value="${c.cfg.quietStart ?? 22}"></label><label>Jam tenang selesai<input id="qe" type="number" min="0" max="23" value="${c.cfg.quietEnd ?? 5}"></label></div>
  <button class="btn" data-act="saveAdmin">Simpan pengaturan admin</button></div>`;
