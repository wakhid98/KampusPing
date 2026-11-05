import * as S from "./store.js";
import { needGate, runGate, esc } from "./gate.js";
import { VAPID } from "./firebase-config.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
const root = document.querySelector("#app"), gateEl = document.querySelector("#gate");
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const TABS = [["home", "Beranda"], ["task", "Tugas"], ["class", "Jadwal"], ["scholar", "Beasiswa"], ["set", "Atur"]];
let user, me = {}, items = [], view = "home", gated = false;
const ms = x => Date.parse(x.when + ":00+07:00");
const fmt = x => new Date(ms(x)).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const by = t => items.filter(x => x.type === t && !x.done);
const FORMS = {
  task: `<input name="title" placeholder="Judul tugas" required><input name="course" placeholder="Mata kuliah"><input name="when" type="datetime-local" required>
    <select name="weight"><option value="1">Bobot ringan</option><option value="2">Sedang</option><option value="3">Berat</option></select><input name="step" placeholder="Langkah pertama (10 menit)">`,
  class: `<input name="title" placeholder="Mata kuliah" required><select name="day">${DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join("")}</select>
    <input name="time" type="time" required><input name="room" placeholder="Ruang">`,
  scholar: `<input name="title" placeholder="Nama beasiswa (mis. Beasiswa Unggulan)" required><input name="when" type="datetime-local" required><input name="step" placeholder="Berkas berikutnya yang harus disiapkan">`
};
function home() {
  const tasks = by("task").sort((a, b) => ms(a) - ms(b)), wk = tasks.filter(x => ms(x) - Date.now() < 6048e5);
  const load = wk.reduce((s, x) => s + (+x.weight || 1), 0), lv = load < 6 ? ["hijau", "Aman"] : load < 12 ? ["kuning", "Padat"] : ["merah", "Overload"];
  const dow = new Date(Date.now() + 252e5).getUTCDay(), cls = by("class").filter(x => x.day === dow).sort((a, b) => a.time.localeCompare(b.time));
  const sch = by("scholar").sort((a, b) => ms(a) - ms(b))[0];
  const li = (x, s) => `<div class="row"><b>${esc(x.title)}</b><small>${s}</small></div>`;
  return `<div class="hero"><h1>Halo, ${esc(user.displayName?.split(" ")[0] || "kamu")}.<br><span class="muted">Hari ini mau mulai dari mana?</span></h1></div>
  <div class="grid">
   <div class="card big s3"><h3>Streak aksi</h3><div class="num" style="color:var(--sig)">${me.streak || 0} hari</div><p class="muted">Rekor ${me.best || 0} hari</p></div>
   <div class="card s3"><h3>Beban minggu ini</h3><div class="num ${lv[0]}">${lv[1]}</div><p class="muted">${wk.length} tugas jatuh tempo dalam 7 hari</p></div>
   <div class="card s4"><h3>Tugas terdekat</h3>${tasks.slice(0, 4).map(x => li(x, fmt(x))).join("") || '<p class="muted">Belum ada tugas. Tambahkan di tab Tugas.</p>'}</div>
   <div class="card s2"><h3>Kuliah hari ini</h3>${cls.map(x => li(x, x.time)).join("") || '<p class="muted">Tidak ada kelas.</p>'}</div>
   <div class="card s6"><h3>Radar Beasiswa</h3>${sch ? li(sch, "tutup " + fmt(sch)) + `<p class="muted">Berikutnya: ${esc(sch.step || "lengkapi berkas")}</p>` : '<p class="muted">Tambahkan beasiswa incaranmu di tab Beasiswa.</p>'}</div>
  </div>`;
}
function list(t) {
  const arr = by(t).sort((a, b) => t === "class" ? a.day - b.day || a.time.localeCompare(b.time) : ms(a) - ms(b));
  return `<div class="hero"><h1>${TABS.find(x => x[0] === t)[1]}</h1></div>
  <form id="f" data-t="${t}">${FORMS[t]}<button class="btn">Simpan</button></form>
  <div class="card">${arr.map(x => `<div class="row"><b>${esc(x.title)}<br><small>${t === "class" ? DAYS[x.day] + " " + x.time + " " + esc(x.room || "") : fmt(x) + " " + esc(x.course || "")}</small></b>
   ${t !== "class" ? `<button class="ib" data-done="${x.id}" title="Selesai">✓</button>` : ""}<button class="ib" data-del="${x.id}" title="Hapus">✕</button></div>`).join("") || '<p class="muted">Masih kosong. Isi formulir di atas.</p>'}</div>`;
}
const settings = () => `<div class="hero"><h1>Pengaturan</h1></div><div class="card" style="display:grid;gap:12px">
  <label>Telegram Chat ID (laporan masuk ke sini)<input id="chat" value="${esc(me.tgChatId || "")}" placeholder="mis. 123456789"></label>
  <button class="btn" id="saveChat">Simpan Chat ID</button><button class="btn ghost" id="push">Aktifkan notifikasi web</button><button class="btn ghost" id="out">Keluar</button></div>`;
function render() {
  if (!user) { root.innerHTML = `<div class="login"><h1>KampusPing</h1><p class="muted">Kuliahmu jalan, kamu tetap pegang kendali.</p><div><button class="btn big" id="in" style="max-width:320px">Masuk dengan Google</button></div></div>`; return; }
  root.innerHTML = `<div class="wrap">${view === "home" ? home() : view === "set" ? settings() : list(view)}</div><nav>${TABS.map(([k, n]) => `<button data-v="${k}" class="${k === view ? "on" : ""}">${n}</button>`).join("")}</nav>`;
}
async function enablePush() {
  if (await Notification.requestPermission() !== "granted") return alert("Izin notifikasi ditolak.");
  const reg = await navigator.serviceWorker.register("firebase-messaging-sw.js");
  const token = await getToken(getMessaging(S.app), { vapidKey: VAPID, serviceWorkerRegistration: reg });
  await S.patchMe(user.uid, { fcmTokens: S.arrayUnion(token) }); alert("Notifikasi web aktif.");
}
document.addEventListener("click", async e => {
  const d = e.target.dataset;
  if (e.target.id === "in") S.login(); else if (e.target.id === "out") S.logout();
  else if (d.v) { view = d.v; render(); } else if (d.done) S.patchItem(user.uid, d.done, { done: true });
  else if (d.del) S.delItem(user.uid, d.del);
  else if (e.target.id === "saveChat") { await S.patchMe(user.uid, { tgChatId: document.querySelector("#chat").value.trim() }); me.tgChatId = document.querySelector("#chat").value.trim(); alert("Tersimpan."); }
  else if (e.target.id === "push") enablePush().catch(err => alert(err.message));
});
document.addEventListener("submit", e => {
  e.preventDefault(); const f = e.target, o = Object.fromEntries(new FormData(f));
  if (o.day !== undefined) o.day = +o.day; if (o.weight) o.weight = +o.weight;
  S.addItem(user.uid, { type: f.dataset.t, ...o }); f.reset();
});
S.onUser(async u => {
  user = u; if (!u) return render();
  me = await S.getMe(u.uid);
  S.watchItems(u.uid, arr => {
    items = arr;
    if (!gated) { gated = true; const t = by("task").sort((a, b) => ms(a) - ms(b))[0]; if (t && needGate(me)) runGate(gateEl, u.uid, me, t, render); }
    render();
  });
});
render();
