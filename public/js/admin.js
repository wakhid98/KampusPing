// Dasbor admin: login email + kata sandi (Firebase Auth). Data dibaca/ditulis lewat REST dengan token admin.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
import { esc, fbCfg } from "./util.js";
const cfg = fbCfg(firebaseConfig), auth = getAuth(initializeApp(cfg, "admin")); // sesi terpisah dari web pengguna
setPersistence(auth, browserSessionPersistence); // sesi berakhir saat tab ditutup
const $ = s => document.querySelector(s), root = $("#app"), toast = $("#toast");
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], TABS = [["mk", "Mata kuliah"], ["ann", "Pengumuman & pengaturan"], ["sch", "Beasiswa"], ["dat", "Data pengguna"], ["log", "Log aktivitas"]];
let user = null, adm = null, why2 = "", tab = "mk", edit = null, listening = false, idle, timers = [], pollers = [], D = { courses: {}, config: {}, users: {}, items: {}, audit: {}, sch: {}, meta: {} };
let fails = 0, until = 0; try { fails = +localStorage.getItem("kp-f") || 0; until = +localStorage.getItem("kp-u") || 0; } catch { /* penyimpanan dinonaktifkan */ }
const keep = () => { try { localStorage.setItem("kp-f", fails); localStorage.setItem("kp-u", until); } catch { /* abaikan */ } };
// ---- akses database lewat REST dengan token admin
async function rq(m, p, body, q = "") {
  const tok = await user.getIdToken(), url = `${cfg.databaseURL}/${p.split("/").filter(Boolean).map(encodeURIComponent).join("/")}.json?auth=${encodeURIComponent(tok)}${q}`, ac = new AbortController();
  const lim = new Promise((_, no) => setTimeout(() => { ac.abort(); no(Object.assign(new Error("Waktu habis"), { code: "TIMEOUT" })); }, globalThis.__TMO ?? 10000));
  const r = await Promise.race([fetch(url, { method: m, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: ac.signal }), lim]);
  if (!r.ok) throw Object.assign(new Error("HTTP " + r.status), { code: r.status === 401 || r.status === 403 ? "PERMISSION_DENIED" : "HTTP_" + r.status });
  return r.json();
}
const kick = () => pollers.forEach(f => f());
const watch = (p, cb, q = "") => { const go = () => rq("GET", p, undefined, q).then(v => cb(v || {})).catch(() => {}); pollers.push(go); timers.push(setInterval(go, 6000)); go(); };
const put = (p, v) => rq("PUT", p, v), del = p => rq("DELETE", p);
const say = m => { toast.textContent = m; toast.className = "show"; setTimeout(() => toast.className = "", 4500); };
const logA = a => rq("POST", "audit", { t: Date.now(), by: user?.email || "?", a: String(a).slice(0, 200) }).catch(() => {});
const run = (p, m, a) => p.then(() => { say(m); logA(a || m); kick(); }).catch(() => say("Gagal. Periksa izin admin."));
const bump = () => { clearTimeout(idle); if (adm === true) idle = setTimeout(() => { signOut(auth); say("Sesi berakhir karena tidak aktif."); }, 15 * 60e3); };
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
  <button class="btn ghost" data-act="editC" data-id="${esc(id)}">Ubah</button><button class="btn danger" data-act="delC" data-id="${esc(id)}">Hapus</button></div>`).join("") || '<div class="empty">Belum ada mata kuliah.</div>'}</div>`;
}
const ann = () => { const c = D.config; return `<div class="stack"><div class="card stack"><h3>Pengumuman untuk semua pengguna</h3><textarea id="a-t" rows="3" maxlength="500">${esc(c.announce?.text || "")}</textarea>
  <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="post">Terbitkan</button><button class="btn danger" data-act="delAnn">Hapus pengumuman</button></div></div>
  <div class="card stack"><h3>Jam tenang (tanpa notifikasi)</h3><div class="fgrid">${f("Mulai (jam)", "q-s", c.quietStart ?? 22, 'type="number" min="0" max="23"')}${f("Selesai (jam)", "q-e", c.quietEnd ?? 5, 'type="number" min="0" max="23"')}</div>
  <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="saveCfg">Simpan</button></div></div></div>`; };
const sch = () => {
  const m = D.meta, ss = Object.entries(m.sources || {}), L = Object.entries(D.sch).sort((a, b) => (a[1].d || "9999").localeCompare(b[1].d || "9999"));
  return `<div class="stack"><div class="card stack"><h3>Pencarian otomatis</h3><p class="muted">Berjalan tiap pagi 05:30 WIB dan setiap kali proyek di-push ke GitHub. ${m.updated ? "Terakhir: " + esc(new Date(m.updated).toLocaleString("id-ID")) : "Belum pernah berjalan."}</p>
  ${ss.map(([n, s]) => `<div class="row2"><span>${esc(n)}</span><span class="badge ${s.ok ? "ok" : "bad"}">${s.ok ? `${esc(s.items)} artikel, ${esc(s.kept)} lolos` : "gagal"}</span></div>`).join("")}</div>
  <div class="card stack"><h3>Sumber tambahan (satu URL per baris: RSS atau halaman daftar berita)</h3><textarea id="s-src" rows="4" maxlength="2000">${esc(D.config.scholarSources || "")}</textarea><div class="actions" style="justify-content:flex-start"><button class="btn" data-act="saveSrc">Simpan sumber</button></div></div>
  <div>${L.map(([id, x]) => `<div class="item"><div class="grow"><b>${esc(x.t)}</b><small>${esc(x.s)} · ${x.d ? "tutup " + esc(x.d) + (x.ap ? " (perkiraan)" : "") : "tanggal belum terdeteksi"}</small></div><button class="btn danger" data-act="hideSch" data-id="${esc(id)}">Sembunyikan</button></div>`).join("") || '<div class="empty">Belum ada beasiswa tercatat.</div>'}</div></div>`;
};
function dat() {
  const U = Object.entries(D.users), n = id => Object.keys(D.items[id] || {}).length, tot = Object.keys(D.items).reduce((s, id) => s + n(id), 0);
  return `<div class="grid"><div class="card s3"><h3>Pengguna</h3><div class="num">${U.length}</div></div><div class="card s3"><h3>Total tugas & item</h3><div class="num">${tot}</div></div></div>
  <div class="actions" style="justify-content:flex-start;margin:14px 0"><button class="btn danger" data-act="purgeDone">Hapus semua item selesai (semua pengguna)</button></div>
  ${U.map(([id, u]) => `<div class="item"><div class="grow"><b>Pengguna ${esc(id.slice(0, 6))}</b><small>${n(id)} item · streak ${esc(u.streak || 0)} · aksi terakhir ${esc(u.lastDone || "-")}</small></div><button class="btn danger" data-act="delUser" data-id="${esc(id)}">Hapus data</button></div>`).join("") || '<div class="empty">Belum ada pengguna.</div>'}`;
}
const logv = () => Object.values(D.audit).sort((a, b) => b.t - a.t).map(x => `<div class="item"><div class="grow"><b>${esc(x.a)}</b><small>${esc(new Date(x.t).toLocaleString("id-ID"))} · ${esc(x.by)}</small></div></div>`).join("") || '<div class="empty">Belum ada aktivitas tercatat.</div>';
function render() {
  if (!user) return root.innerHTML = `<div class="login"><span class="logo">${shield}</span><h1>Masuk Admin</h1><p class="muted">Area khusus pengelola KampusPing. Semua aktivitas dicatat.</p>
  <form id="lf" class="stack" style="width:100%;text-align:left"><label>Email<input id="em" type="email" autocomplete="username" required maxlength="120"></label><label>Kata sandi<input id="pw" type="password" autocomplete="current-password" required maxlength="128"></label>
  <label class="sw"><input type="checkbox" data-act="showpw"> Tampilkan kata sandi</label><button class="btn big">Masuk</button></form>
  <button class="link" data-act="reset">Lupa kata sandi?</button><a class="link" href="/">Kembali ke KampusPing</a><p class="muted" style="font-size:12px">Sesi berakhir otomatis setelah 15 menit tidak aktif atau saat tab ditutup.</p></div>`;
  if (adm === null) return root.innerHTML = '<div class="login"><p class="muted">Memeriksa akses...</p><button class="btn ghost" data-act="out">Keluar</button></div>';
  if (adm === "err") return root.innerHTML = `<div class="login"><h1>Tidak bisa memeriksa akses</h1><p class="muted">${esc(why2)}</p><button class="btn" data-act="recheck">Coba lagi</button><button class="btn ghost" data-act="out">Keluar</button></div>`;
  if (!adm) return root.innerHTML = `<div class="login"><h1>Belum terdaftar sebagai admin</h1><p class="muted">Login berhasil sebagai ${esc(user.email)}, tetapi akun ini belum ada di daftar admin.</p>
  <div class="card stack" style="text-align:left"><b>Cara mengaktifkan</b><ol style="padding-left:18px"><li>Buka Firebase Console, Realtime Database, tab Data.</li><li>Tambahkan node <code>admins</code>, lalu child bernama persis UID di bawah dengan nilai <code>true</code>.</li><li>Pastikan aturan sudah dipasang: <code>firebase deploy --only database</code>.</li></ol>
  <label>UID kamu<input readonly value="${esc(user.uid)}"></label><button class="btn ghost" data-act="copyuid">Salin UID</button></div><button class="btn" data-act="out">Keluar</button></div>`;
  root.innerHTML = `<div style="max-width:980px;margin:auto;padding-bottom:40px"><header class="top"><h1>Dasbor Admin</h1><div class="actions"><small class="muted">${esc(user.email)}</small><a class="btn ghost" href="/">Lihat web</a><button class="btn ghost" data-act="out">Keluar</button></div></header>
  <div class="page"><div class="tools">${TABS.map(([k, n]) => `<button class="chip${k === tab ? " on" : ""}" data-act="tab" data-t="${k}">${n}</button>`).join("")}</div>${{ mk, ann, sch, dat, log: logv }[tab]()}</div></div>`;
}
function listen() {
  if (listening) return; listening = true;
  for (const [k, p] of [["courses", "courses"], ["config", "config"], ["sch", "scholarships"], ["meta", "scholarMeta"]]) watch(p, v => { D[k] = v; render(); });
  for (const k of ["users", "items"]) watch(k, v => { D[k] = v; if (tab === "dat") render(); });
  watch("audit", v => { D.audit = v; if (tab === "log") render(); }, "&orderBy=%22%24key%22&limitToLast=50");
}
const check = () => {
  adm = null; render();
  rq("GET", `admins/${user.uid}`).then(v => { adm = v !== null; render(); if (adm) { listen(); bump(); logA("Login admin"); } })
    .catch(e => { adm = "err"; why2 = e.code === "PERMISSION_DENIED" ? "Aturan database menolak pembacaan daftar admin. Jalankan: firebase deploy --only database." : e.code === "TIMEOUT" ? "Database tidak menjawab dalam batas waktu. Periksa koneksi dan databaseURL." : `Gagal memeriksa akses (${e.message || e.code}).`; render(); });
};
onAuthStateChanged(auth, u => { timers.forEach(clearInterval); timers = []; pollers = []; listening = false; user = u; adm = null; why2 = ""; render(); if (u) check(); });
const why = c => c === "auth/operation-not-allowed" ? "Metode Email/Password belum diaktifkan di Firebase Authentication." : c === "auth/too-many-requests" ? "Terlalu banyak percobaan. Coba lagi nanti." : c === "auth/network-request-failed" ? "Tidak ada koneksi internet." : c === "auth/invalid-api-key" || c === "auth/configuration-not-found" ? "Konfigurasi Firebase belum benar (cek firebase-config.js)." : "Email atau kata sandi salah.";
async function login() {
  if (Date.now() < until) return say(`Terlalu banyak percobaan. Coba lagi ${Math.ceil((until - Date.now()) / 1000)} detik.`);
  try { await signInWithEmailAndPassword(auth, $("#em").value.trim(), $("#pw").value); fails = 0; keep(); }
  catch (e) { fails++; if (fails >= 5) until = Date.now() + Math.min(60 * 2 ** (fails - 5), 1800) * 1000; keep(); say(why(e.code)); }
}
document.addEventListener("submit", e => { if (e.target.id === "lf") { e.preventDefault(); login(); } });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const d = b.dataset, v = id => $(id).value.trim();
  switch (d.act) {
    case "showpw": $("#pw").type = b.checked ? "text" : "password"; break;
    case "reset": { const em = $("#em").value.trim(); if (!em) return say("Isi email dulu."); sendPasswordResetEmail(auth, em).catch(() => {}).finally(() => say("Jika email terdaftar, tautan reset sudah dikirim.")); break; }
    case "copyuid": navigator.clipboard?.writeText(user.uid).then(() => say("UID disalin.")); break;
    case "recheck": check(); break;
    case "out": Promise.race([logA("Logout admin"), new Promise(r => setTimeout(r, 1500))]).finally(() => signOut(auth)); break;
    case "tab": tab = d.t; render(); break;
    case "saveC": { const o = { title: v("#c-t"), day: +$("#c-d").value, time: v("#c-h"), room: v("#c-r"), lecturer: v("#c-l") }; if (!o.title || !o.time) return say("Isi nama dan jam mulai.");
      run(edit ? Promise.all(Object.entries(o).map(([k, x]) => put(`courses/${edit}/${k}`, x))) : rq("POST", "courses", o), "Mata kuliah tersimpan.", `${edit ? "Ubah" : "Tambah"} mata kuliah: ${o.title}`); edit = null; break; }
    case "editC": edit = d.id; render(); break; case "cancelC": edit = null; render(); break;
    case "delC": if (confirm("Hapus mata kuliah ini?")) run(del(`courses/${d.id}`), "Mata kuliah dihapus.", `Hapus mata kuliah: ${D.courses[d.id]?.title || d.id}`); break;
    case "post": { const t = v("#a-t"); if (t) run(put("config/announce", { id: Date.now(), text: t.slice(0, 500) }), "Pengumuman diterbitkan.", "Terbitkan pengumuman"); break; }
    case "delAnn": run(del("config/announce"), "Pengumuman dihapus.", "Hapus pengumuman"); break;
    case "saveCfg": run(Promise.all([put("config/quietStart", Math.min(23, Math.max(0, +$("#q-s").value || 0))), put("config/quietEnd", Math.min(23, Math.max(0, +$("#q-e").value || 0)))]), "Pengaturan tersimpan.", "Ubah jam tenang"); break;
    case "saveSrc": run(put("config/scholarSources", v("#s-src").slice(0, 2000)), "Sumber disimpan.", "Ubah sumber beasiswa"); break;
    case "hideSch": run(Promise.all([put(`config/scholarHidden/${d.id}`, true), del(`scholarships/${d.id}`)]), "Beasiswa disembunyikan.", `Sembunyikan beasiswa ${d.id}`); break;
    case "delUser": if (confirm("Hapus semua data pengguna ini? Tidak bisa diurungkan.")) run(Promise.all([del(`users/${d.id}`), del(`items/${d.id}`)]), "Data pengguna dihapus.", `Hapus data pengguna ${d.id.slice(0, 6)}`); break;
    case "purgeDone": { const m = []; for (const [u, its] of Object.entries(D.items)) for (const [id, x] of Object.entries(its)) if (x.done) m.push(`items/${u}/${id}`);
      if (!m.length) return say("Tidak ada item selesai."); if (confirm(`Hapus ${m.length} item selesai?`)) run(Promise.all(m.map(del)), "Item selesai dihapus.", `Hapus ${m.length} item selesai`); break; }
  }
});
