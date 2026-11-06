// Dasbor admin: login aman (batas percobaan, sesi per-tab, auto-logout), audit log, kelola data.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, update, remove, get, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
const app = initializeApp(firebaseConfig, "admin"), auth = getAuth(app), db = getDatabase(app); // sesi terpisah dari web pengguna
setPersistence(auth, browserSessionPersistence); // sesi berakhir saat tab ditutup
const $ = s => document.querySelector(s), root = $("#app"), toast = $("#toast");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], TABS = [["mk", "Mata kuliah"], ["ann", "Pengumuman & pengaturan"], ["dat", "Data pengguna"], ["log", "Log aktivitas"]];
let user = null, adm = null, tab = "mk", edit = null, listening = false, idle, D = { courses: {}, config: {}, users: {}, items: {}, audit: {} };
let fails = 0, until = 0; try { fails = +localStorage.getItem("kp-f") || 0; until = +localStorage.getItem("kp-u") || 0; } catch {}
const keep = () => { try { localStorage.setItem("kp-f", fails); localStorage.setItem("kp-u", until); } catch {} };
const say = m => { toast.textContent = m; toast.className = "show"; setTimeout(() => toast.className = "", 4500); };
const logA = a => push(ref(db, "audit"), { t: Date.now(), by: user?.email || "?", a: String(a).slice(0, 200) }).catch(() => {});
const run = (p, m, a) => p.then(() => { say(m); logA(a || m); }).catch(() => say("Gagal. Periksa izin admin."));
const bump = () => { clearTimeout(idle); if (adm) idle = setTimeout(() => { signOut(auth); say("Sesi berakhir karena tidak aktif."); }, 15 * 60e3); };
["click", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, bump, { passive: true }));
const f = (l, id, v = "", a = "") => `<label>${l}<input id="${id}" value="${esc(v)}" ${a}></label>`;
const shield = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>';
function mk() {
  const e = edit ? D.courses[edit] || {} : {}, rows = Object.entries(D.courses).sort((a, b) => a[1].day - b[1].day || String(a[1].time).localeCompare(b[1].time));
  return `<div class="card stack"><h3>${edit ? "Ubah" : "Tambah"} mata kuliah</h3><div class="fgrid">${f("Mata kuliah", "c-t", e.title, 'maxlength="100"')}
  <label>Hari<select id="c-d">${DAYS.map((d, i) => `<option value="${i}"${i === (e.day ?? 1) ? " selected" : ""}>${d}</option>`).join("")}</select></label>
  ${f("Jam mulai", "c-h", e.time, 'type="time"')}${f("Ruang", "c-r", e.room, 'maxlength="60"')}${f("Dosen", "c-l", e.lecturer, 'maxlength="80"')}</div>
  <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="saveC">Simpan</button>${edit ? '<button class="btn ghost" data-act="cancelC">Batal</button>' : ""}</div></div>
  <div style="margin-top:14px">${rows.map(([id, x]) => `<div class="item"><div class="dayb">${DAYS[x.day].slice(0, 3)}</div><div class="grow"><b>${esc(x.title)}</b><small>${esc(x.time)}${x.room ? " · " + esc(x.room) : ""}${x.lecturer ? " · " + esc(x.lecturer) : ""}</small></div>
  <button class="btn ghost" data-act="editC" data-id="${id}">Ubah</button><button class="btn danger" data-act="delC" data-id="${id}">Hapus</button></div>`).join("") || '<div class="empty">Belum ada mata kuliah.</div>'}</div>`;
}
const ann = () => { const c = D.config; return `<div class="stack"><div class="card stack"><h3>Pengumuman untuk semua pengguna</h3><textarea id="a-t" rows="3" maxlength="500">${esc(c.announce?.text || "")}</textarea>
  <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="post">Terbitkan</button><button class="btn danger" data-act="delAnn">Hapus pengumuman</button></div></div>
  <div class="card stack"><h3>Jam tenang (tanpa notifikasi)</h3><div class="fgrid">${f("Mulai (jam)", "q-s", c.quietStart ?? 22, 'type="number" min="0" max="23"')}${f("Selesai (jam)", "q-e", c.quietEnd ?? 5, 'type="number" min="0" max="23"')}</div>
  <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="saveCfg">Simpan</button></div></div></div>`; };
function dat() {
  const U = Object.entries(D.users), n = id => Object.keys(D.items[id] || {}).length, tot = Object.keys(D.items).reduce((s, id) => s + n(id), 0);
  return `<div class="grid"><div class="card s3"><h3>Pengguna</h3><div class="num">${U.length}</div></div><div class="card s3"><h3>Total tugas & item</h3><div class="num">${tot}</div></div></div>
  <div class="actions" style="justify-content:flex-start;margin:14px 0"><button class="btn danger" data-act="purgeDone">Hapus semua item selesai (semua pengguna)</button></div>
  ${U.map(([id, u]) => `<div class="item"><div class="grow"><b>Pengguna ${esc(id.slice(0, 6))}</b><small>${n(id)} item · streak ${esc(u.streak || 0)} · aksi terakhir ${esc(u.lastDone || "-")}</small></div><button class="btn danger" data-act="delUser" data-id="${esc(id)}">Hapus data</button></div>`).join("") || '<div class="empty">Belum ada pengguna.</div>'}`;
}
const logv = () => Object.values(D.audit).sort((a, b) => b.t - a.t).map(x => `<div class="item"><div class="grow"><b>${esc(x.a)}</b><small>${new Date(x.t).toLocaleString("id-ID")} · ${esc(x.by)}</small></div></div>`).join("") || '<div class="empty">Belum ada aktivitas tercatat.</div>';
function render() {
  if (!user) return root.innerHTML = `<div class="login"><span class="logo">${shield}</span><h1>Masuk Admin</h1><p class="muted">Area khusus pengelola KampusPing. Semua aktivitas dicatat.</p>
  <form id="lf" class="stack" style="width:100%;text-align:left"><label>Email<input id="em" type="email" autocomplete="username" required maxlength="120"></label><label>Kata sandi<input id="pw" type="password" autocomplete="current-password" required maxlength="128"></label>
  <label class="sw"><input type="checkbox" data-act="showpw"> Tampilkan kata sandi</label><button class="btn big">Masuk</button></form>
  <button class="link" data-act="reset">Lupa kata sandi?</button><a class="link" href="/">Kembali ke KampusPing</a><p class="muted" style="font-size:12px">Sesi berakhir otomatis setelah 15 menit tidak aktif atau saat tab ditutup.</p></div>`;
  if (adm === null) return root.innerHTML = '<div class="login"><p class="muted">Memeriksa akses...</p></div>';
  if (!adm) return root.innerHTML = '<div class="login"><h1>Akses ditolak</h1><p class="muted">Akun ini bukan admin.</p><button class="btn" data-act="out">Keluar</button></div>';
  root.innerHTML = `<div style="max-width:980px;margin:auto;padding-bottom:40px"><header class="top"><h1>Dasbor Admin</h1><div class="actions"><small class="muted">${esc(user.email)}</small><a class="btn ghost" href="/">Lihat web</a><button class="btn ghost" data-act="out">Keluar</button></div></header>
  <div class="page"><div class="tools">${TABS.map(([k, n]) => `<button class="chip${k === tab ? " on" : ""}" data-act="tab" data-t="${k}">${n}</button>`).join("")}</div>${tab === "mk" ? mk() : tab === "ann" ? ann() : tab === "dat" ? dat() : logv()}</div></div>`;
}
function listen() {
  if (listening) return; listening = true;
  for (const k of ["courses", "config"]) onValue(ref(db, k), s => { D[k] = s.val() || {}; render(); });
  for (const k of ["users", "items"]) onValue(ref(db, k), s => { D[k] = s.val() || {}; if (tab === "dat") render(); });
  onValue(query(ref(db, "audit"), limitToLast(50)), s => { D.audit = s.val() || {}; if (tab === "log") render(); });
}
onAuthStateChanged(auth, u => {
  user = u; adm = null; render(); if (!u) return;
  get(ref(db, `admins/${u.uid}`)).then(s => { adm = s.exists(); render(); if (adm) { listen(); bump(); logA("Login admin"); } else signOut(auth); }).catch(() => { adm = false; render(); });
});
async function login() {
  if (Date.now() < until) return say(`Terlalu banyak percobaan. Coba lagi ${Math.ceil((until - Date.now()) / 1000)} detik.`);
  try { await signInWithEmailAndPassword(auth, $("#em").value.trim(), $("#pw").value); fails = 0; keep(); }
  catch (e) { fails++; if (fails >= 5) until = Date.now() + Math.min(60 * 2 ** (fails - 5), 1800) * 1000; keep(); say(e.code === "auth/too-many-requests" ? "Terlalu banyak percobaan. Coba lagi nanti." : "Email atau kata sandi salah."); }
}
document.addEventListener("submit", e => { if (e.target.id === "lf") { e.preventDefault(); login(); } });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const d = b.dataset, v = id => $(id).value.trim();
  switch (d.act) {
    case "showpw": $("#pw").type = b.checked ? "text" : "password"; break;
    case "reset": { const em = $("#em").value.trim(); if (!em) return say("Isi email dulu."); sendPasswordResetEmail(auth, em).catch(() => {}).finally(() => say("Jika email terdaftar, tautan reset sudah dikirim.")); break; }
    case "out": logA("Logout admin").finally(() => signOut(auth)); break;
    case "tab": tab = d.t; render(); break;
    case "saveC": { const o = { title: v("#c-t"), day: +$("#c-d").value, time: v("#c-h"), room: v("#c-r"), lecturer: v("#c-l") }; if (!o.title || !o.time) return say("Isi nama dan jam mulai.");
      run(edit ? update(ref(db, `courses/${edit}`), o) : push(ref(db, "courses"), o), "Mata kuliah tersimpan.", `${edit ? "Ubah" : "Tambah"} mata kuliah: ${o.title}`); edit = null; break; }
    case "editC": edit = d.id; render(); break; case "cancelC": edit = null; render(); break;
    case "delC": if (confirm("Hapus mata kuliah ini?")) run(remove(ref(db, `courses/${d.id}`)), "Mata kuliah dihapus.", `Hapus mata kuliah: ${D.courses[d.id]?.title || d.id}`); break;
    case "post": { const t = v("#a-t"); if (t) run(set(ref(db, "config/announce"), { id: Date.now(), text: t.slice(0, 500) }), "Pengumuman diterbitkan.", "Terbitkan pengumuman"); break; }
    case "delAnn": run(remove(ref(db, "config/announce")), "Pengumuman dihapus.", "Hapus pengumuman"); break;
    case "saveCfg": run(update(ref(db, "config"), { quietStart: Math.min(23, Math.max(0, +$("#q-s").value || 0)), quietEnd: Math.min(23, Math.max(0, +$("#q-e").value || 0)) }), "Pengaturan tersimpan.", "Ubah jam tenang"); break;
    case "delUser": if (confirm("Hapus semua data pengguna ini? Tidak bisa diurungkan.")) run(update(ref(db), { [`users/${d.id}`]: null, [`items/${d.id}`]: null }), "Data pengguna dihapus.", `Hapus data pengguna ${d.id.slice(0, 6)}`); break;
    case "purgeDone": { const m = {}; for (const [u, its] of Object.entries(D.items)) for (const [id, x] of Object.entries(its)) if (x.done) m[`items/${u}/${id}`] = null;
      const n = Object.keys(m).length; if (!n) return say("Tidak ada item selesai."); if (confirm(`Hapus ${n} item selesai?`)) run(update(ref(db), m), "Item selesai dihapus.", `Hapus ${n} item selesai`); break; }
  }
});
