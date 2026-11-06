// Dasbor admin: login email, kelola mata kuliah, pengumuman, pengaturan, dan hapus data.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, onValue, push, update, remove, set, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
const app = initializeApp(firebaseConfig, "admin"), auth = getAuth(app), db = getDatabase(app); // sesi terpisah dari web pengguna
const $ = s => document.querySelector(s), root = $("#app"), toast = $("#toast");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], TABS = [["mk", "Mata kuliah"], ["ann", "Pengumuman & pengaturan"], ["dat", "Data pengguna"]];
let user = null, adm = null, tab = "mk", edit = null, listening = false, D = { courses: {}, config: {}, users: {}, items: {} };
const say = m => { toast.textContent = m; toast.className = "show"; setTimeout(() => toast.className = "", 4000); };
const run = (p, m) => p.then(() => say(m)).catch(() => say("Gagal. Periksa izin admin."));
const f = (l, id, v = "", a = "") => `<label>${l}<input id="${id}" value="${esc(v)}" ${a}></label>`;
function mk() {
  const e = edit ? D.courses[edit] || {} : {}, rows = Object.entries(D.courses).sort((a, b) => a[1].day - b[1].day || String(a[1].time).localeCompare(b[1].time));
  return `<div class="card stack"><h3>${edit ? "Ubah" : "Tambah"} mata kuliah</h3><div class="fgrid">${f("Mata kuliah", "c-t", e.title)}
  <label>Hari<select id="c-d">${DAYS.map((d, i) => `<option value="${i}"${i === (e.day ?? 1) ? " selected" : ""}>${d}</option>`).join("")}</select></label>
  ${f("Jam mulai", "c-h", e.time, 'type="time"')}${f("Ruang", "c-r", e.room)}${f("Dosen", "c-l", e.lecturer)}</div>
  <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="saveC">Simpan</button>${edit ? '<button class="btn ghost" data-act="cancelC">Batal</button>' : ""}</div></div>
  <div style="margin-top:14px">${rows.map(([id, x]) => `<div class="item"><div class="dayb">${DAYS[x.day].slice(0, 3)}</div><div class="grow"><b>${esc(x.title)}</b><small>${esc(x.time)}${x.room ? " · " + esc(x.room) : ""}${x.lecturer ? " · " + esc(x.lecturer) : ""}</small></div>
  <button class="btn ghost" data-act="editC" data-id="${id}">Ubah</button><button class="btn danger" data-act="delC" data-id="${id}">Hapus</button></div>`).join("") || '<div class="empty">Belum ada mata kuliah.</div>'}</div>`;
}
const ann = () => { const c = D.config; return `<div class="stack"><div class="card stack"><h3>Pengumuman untuk semua pengguna</h3><textarea id="a-t" rows="3">${esc(c.announce?.text || "")}</textarea>
  <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="post">Terbitkan</button><button class="btn danger" data-act="delAnn">Hapus pengumuman</button></div></div>
  <div class="card stack"><h3>Jam tenang (tanpa notifikasi)</h3><div class="fgrid">${f("Mulai (jam)", "q-s", c.quietStart ?? 22, 'type="number" min="0" max="23"')}${f("Selesai (jam)", "q-e", c.quietEnd ?? 5, 'type="number" min="0" max="23"')}</div>
  <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="saveCfg">Simpan</button></div></div></div>`; };
function dat() {
  const U = Object.entries(D.users), n = id => Object.keys(D.items[id] || {}).length, tot = Object.keys(D.items).reduce((s, id) => s + n(id), 0);
  return `<div class="grid"><div class="card s3"><h3>Pengguna</h3><div class="num">${U.length}</div></div><div class="card s3"><h3>Total tugas & item</h3><div class="num">${tot}</div></div></div>
  <div class="actions" style="justify-content:flex-start;margin:14px 0"><button class="btn danger" data-act="purgeDone">Hapus semua item selesai (semua pengguna)</button></div>
  ${U.map(([id, u]) => `<div class="item"><div class="grow"><b>Pengguna ${esc(id.slice(0, 6))}</b><small>${n(id)} item · streak ${u.streak || 0} · aksi terakhir ${esc(u.lastDone || "-")}</small></div><button class="btn danger" data-act="delUser" data-id="${id}">Hapus data</button></div>`).join("") || '<div class="empty">Belum ada pengguna.</div>'}`;
}
function render() {
  if (!user) return root.innerHTML = `<div class="login"><span class="logo">K</span><h1>Dasbor Admin</h1><label>Email<input id="em" type="email" autocomplete="username"></label><label>Kata sandi<input id="pw" type="password" autocomplete="current-password"></label><button class="btn big" data-act="login">Masuk</button><a class="link" href="/">Kembali ke KampusPing</a></div>`;
  if (adm === null) return root.innerHTML = '<div class="login"><p class="muted">Memeriksa akses...</p></div>';
  if (!adm) return root.innerHTML = '<div class="login"><h1>Akses ditolak</h1><p class="muted">Akun ini bukan admin.</p><button class="btn" data-act="out">Keluar</button></div>';
  root.innerHTML = `<div style="max-width:980px;margin:auto;padding-bottom:40px"><header class="top"><h1>Dasbor Admin</h1><div class="actions"><a class="btn ghost" href="/">Lihat web</a><button class="btn ghost" data-act="out">Keluar</button></div></header>
  <div class="page"><div class="tools">${TABS.map(([k, n]) => `<button class="chip${k === tab ? " on" : ""}" data-act="tab" data-t="${k}">${n}</button>`).join("")}</div>${tab === "mk" ? mk() : tab === "ann" ? ann() : dat()}</div></div>`;
}
function listen() {
  if (listening) return; listening = true;
  for (const k of ["courses", "config"]) onValue(ref(db, k), s => { D[k] = s.val() || {}; render(); });
  for (const k of ["users", "items"]) onValue(ref(db, k), s => { D[k] = s.val() || {}; if (tab === "dat") render(); });
}
onAuthStateChanged(auth, u => {
  user = u; adm = null; render(); if (!u) return;
  get(ref(db, `admins/${u.uid}`)).then(s => { adm = s.exists(); render(); if (adm) listen(); }).catch(() => { adm = false; render(); });
});
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const d = b.dataset, v = id => $(id).value.trim();
  switch (d.act) {
    case "login": signInWithEmailAndPassword(auth, v("#em"), $("#pw").value).catch(() => say("Email atau kata sandi salah.")); break;
    case "out": signOut(auth); break;
    case "tab": tab = d.t; render(); break;
    case "saveC": { const o = { title: v("#c-t"), day: +$("#c-d").value, time: v("#c-h"), room: v("#c-r"), lecturer: v("#c-l") }; if (!o.title || !o.time) return say("Isi nama dan jam mulai.");
      run(edit ? update(ref(db, `courses/${edit}`), o) : push(ref(db, "courses"), o), "Mata kuliah tersimpan."); edit = null; break; }
    case "editC": edit = d.id; render(); break; case "cancelC": edit = null; render(); break;
    case "delC": if (confirm("Hapus mata kuliah ini?")) run(remove(ref(db, `courses/${d.id}`)), "Mata kuliah dihapus."); break;
    case "post": { const t = v("#a-t"); if (t) run(set(ref(db, "config/announce"), { id: Date.now(), text: t }), "Pengumuman diterbitkan."); break; }
    case "delAnn": run(remove(ref(db, "config/announce")), "Pengumuman dihapus."); break;
    case "saveCfg": run(update(ref(db, "config"), { quietStart: +$("#q-s").value, quietEnd: +$("#q-e").value }), "Pengaturan tersimpan."); break;
    case "delUser": if (confirm("Hapus semua data pengguna ini? Tidak bisa diurungkan.")) run(update(ref(db), { [`users/${d.id}`]: null, [`items/${d.id}`]: null }), "Data pengguna dihapus."); break;
    case "purgeDone": { const m = {}; for (const [u, its] of Object.entries(D.items)) for (const [id, x] of Object.entries(its)) if (x.done) m[`items/${u}/${id}`] = null;
      if (!Object.keys(m).length) return say("Tidak ada item selesai."); if (confirm(`Hapus ${Object.keys(m).length} item selesai?`)) run(update(ref(db), m), "Item selesai dihapus."); break; }
  }
});
