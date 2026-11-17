import * as S from "./store.js";
import { esc, keepForm } from "./util.js";
import { VAPID } from "./firebase-config.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import * as V from "./views.js";
import * as G from "./pages.js";
import * as X from "./extra.js";
import * as A from "./agenda.js";
import * as T from "./theme.js";
const $ = s => document.querySelector(s), root = $("#app"), dlg = $("#dlg"), toast = $("#toast"), overlay = $("#gate");
const user = { uid: S.deviceKey() };
let me = {}, items = [], courses = [], scholars = [], smeta = {}, sems = [], semSel = "", schDay = null, noteSel = "", noteQ = "", noteCat = "*all", noteSort = "upd", cfg = {}, view = "home", q = "", flt = "active", lst = "*all", calOff = 0, calSel = "", tmr, undo, first = true, conn = false, slow = false;
let ui = T.load(), uiAt = 0;
try { if (!localStorage.getItem("kp-ui")) { const o = localStorage.getItem("kp-theme"); if (o === "dark" || o === "light") ui = T.clean({ ...ui, mode: o }); } } catch { /* abaikan */ }
T.apply(ui);
const setUi = o => { ui = T.apply({ ...ui, ...o }); T.save(ui); uiAt = Date.now(); S.setMe(user.uid, "ui", ui).catch(() => {}); refresh(); };
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (ui.mode === "auto") { T.apply(ui); refresh(); } });
const seenWelcome = () => { try { return localStorage.getItem("kp-welcome"); } catch { return 1; } };
const ctx = () => ({ user, me, items, courses, cfg, q, flt, lst, view, calOff, calSel, conn, slow, scholars, smeta, canInstall: !!installEv, perm: perm(), isApp: isApp(), sems, semSel, schDay, ui, noteSel, noteQ, noteCat, noteSort, notesBlocked });
const render = () => { root.innerHTML = V.shell(ctx()); };
const editing = () => view === "note" && document.activeElement?.dataset?.note;
let sheetK = "";
const openSheet = k => { sheetK = k; dlg.innerHTML = X.sheet(k, ctx()); if (!dlg.open) dlg.showModal(); };
const refresh = () => { if (dlg.open) { if (sheetK) keepForm(dlg, () => { dlg.innerHTML = X.sheet(sheetK, ctx()); }); return; } if (!editing()) keepForm(root, render); };
let installEv = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEv = e; refresh(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("firebase-messaging-sw.js").catch(() => { /* tanpa service worker, web tetap jalan */ });
function say(msg, fn) { clearTimeout(tmr); undo = fn; toast.innerHTML = `<span>${esc(msg)}</span>${fn ? '<button data-act="undo">Urungkan</button>' : ""}`; toast.className = "show"; tmr = setTimeout(() => toast.className = "", 6000); }
const find = id => items.find(x => x.id === id);
const day = n => new Date(Date.now() + 252e5 - n * 864e5).toISOString().slice(0, 10);
const prefs = o => { me.prefs = { ...(me.prefs || {}), ...o }; return S.patchMe(user.uid, { prefs: o }); };
const openForm = (t, id, pre) => { dlg.innerHTML = V.form(t, id ? find(id) : pre || {}, id, V.lists(items)); dlg.showModal(); };
const findCls = id => A.effCourses(courses, me, "").find(x => x.id === id);
const today = () => new Date(Date.now() + 252e5).toISOString().slice(0, 10);
function act() { // satu aksi per hari menjaga streak
  const k = day(0); if (me.lastDone === k) return;
  const streak = me.lastDone === day(1) ? (me.streak || 0) + 1 : 1, upd = { lastDone: k, streak, best: Math.max(me.best || 0, streak) };
  Object.assign(me, upd); S.patchMe(user.uid, upd);
}
const perm = () => typeof Notification === "undefined" ? "unsupported" : Notification.permission || "default";
const isApp = () => { try { return matchMedia("(display-mode: standalone)").matches || document.referrer.startsWith("android-app://") || !!navigator.standalone; } catch { return false; } };
async function enablePush(silent) { // silent: hanya menyinkronkan token bila izin sudah diberikan
  if (perm() === "unsupported" || !("serviceWorker" in navigator)) return silent ? undefined : say("Perangkat ini tidak mendukung notifikasi web.");
  if (perm() === "denied") return silent ? undefined : say("Notifikasi diblokir. Buka Pengaturan HP, Aplikasi, KampusPing, Notifikasi, lalu izinkan.");
  if (silent && perm() !== "granted") return;
  if (await Notification.requestPermission() !== "granted") { refresh(); return say("Izin notifikasi ditolak."); }
  const reg = await navigator.serviceWorker.register("firebase-messaging-sw.js"); await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(S.app), { vapidKey: VAPID, serviceWorkerRegistration: reg });
  await S.addToken(user.uid, token); refresh(); if (!silent) say("Notifikasi aktif di perangkat ini.");
}
async function testPush() {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification("KampusPing", { body: "Tes berhasil. Notifikasi dari KampusPing akan tampil seperti ini.", icon: "icons/icon-192.png", requireInteraction: true, vibrate: [300, 150, 300] });
}
const nid = () => "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
let nTimer = 0;
const redrawList = () => { const l = $("#nlist"); if (l) l.innerHTML = X.noteList(ctx()); };
// Catatan disimpan ke database; bila database menolak/gagal, salinan aman di perangkat dan dicoba lagi otomatis.
let pend = null, notesBlocked = false, flushing = false;
const PK = () => "kp-pn-" + user.uid.slice(0, 16);
const pendLoad = () => { if (!pend) { try { pend = JSON.parse(localStorage.getItem(PK()) || "{}") || {}; } catch { pend = {}; } } return pend; };
const pendSave = () => { try { localStorage.setItem(PK(), JSON.stringify(pend)); } catch { /* penyimpanan dinonaktifkan */ } };
const mergeNotes = n => { const m = { ...(n || {}) }; for (const [id, v] of Object.entries(pendLoad())) { if (v === null) delete m[id]; else m[id] = v; } return m; };
const cleanNote = n => ({ title: String(n.title || "").slice(0, 100), body: String(n.body || "").slice(0, 10000), cat: String(n.cat || "").slice(0, 30), color: /^[ygbpv]$/.test(n.color) ? n.color : "", pin: !!n.pin, arch: !!n.arch, c: +n.c || Date.now(), t: +n.t || Date.now() });
async function flushNotes() {
  if (flushing) return; flushing = true;
  try {
    for (const [id, v] of Object.entries(pendLoad())) {
      try { await S.putQuiet(`users/${user.uid}/notes/${id}`, v); delete pend[id]; pendSave(); if (notesBlocked) { notesBlocked = false; refresh(); } }
      catch (e) { const bl = e?.code === "PERMISSION_DENIED"; if (bl !== notesBlocked) { notesBlocked = bl; refresh(); } break; }
    }
  } finally { flushing = false; }
}
const syncNote = id => { pendLoad()[id] = me.notes?.[id] ? cleanNote(me.notes[id]) : null; pendSave(); flushNotes(); };
async function saveNote() {
  clearTimeout(nTimer); const id = noteSel, el = $("#nt-body"); if (!id || !me.notes?.[id] || !el) return;
  const v = { title: $("#nt-title").value.trim().slice(0, 100), cat: $("#nt-cat").value.trim().slice(0, 30), body: el.value.slice(0, 10000) }, o = me.notes[id];
  if (v.title === (o.title || "") && v.cat === (o.cat || "") && v.body === (o.body || "")) return;
  me.notes = { ...me.notes, [id]: { ...o, ...v, t: Date.now() } }; redrawList(); syncNote(id);
}
const patchNote = f => { const id = noteSel; if (!id || !me.notes?.[id]) return; me.notes = { ...me.notes, [id]: { ...me.notes[id], ...f } }; syncNote(id); keepForm(root, render); };
function newNote() {
  saveNote(); const id = nid(), now = Date.now(), n = { title: "", body: "", cat: noteCat && !noteCat.startsWith("*") ? noteCat : "", color: "", pin: noteCat === "*pin", arch: false, c: now, t: now };
  if (noteCat === "*arch") noteCat = "*all"; me.notes = { ...(me.notes || {}), [id]: n }; noteSel = id; render(); syncNote(id); $("#nt-title")?.focus();
}
const shown = new Set();
async function remind() { // pengingat agenda saat aplikasi terbuka; server (notify.js) mengirim saat aplikasi tertutup
  if ((me.prefs || {}).event === false) return;
  const W = Date.now(), d0 = today(), d1 = A.addDays(d0, 1);
  for (const x of items) {
    if (x.type !== "event" || !(x.remind >= 0)) continue;
    for (const d of [d0, d1]) {
      const st = A.evStart(x, d), key = "e" + d; if (!A.occurs(x, d) || W < st - x.remind * 6e4 || W > st + 30 * 6e4 || x.sent?.[key] || shown.has(x.id + key)) continue;
      shown.add(x.id + key); const body = (x.allDay ? "Hari ini" : A.evTime(x)) + (x.place ? " · " + x.place : "") + (x.note ? "\n" + x.note : "");
      if (perm() === "granted") { try { const reg = await navigator.serviceWorker.ready; await reg.showNotification("📅 " + x.title, { body, icon: "icons/icon-192.png", tag: x.id + key, requireInteraction: true, vibrate: [300, 150, 300] }); } catch { say("Pengingat: " + x.title); } }
      else say("Pengingat: " + x.title + " · " + body.split("\n")[0]);
      S.patchItem(user.uid, x.id, { ["sent/" + key]: true }).catch(() => {});
    }
  }
}
setInterval(() => { if (!document.hidden) remind(); }, 30000);
document.addEventListener("click", async e => {
  if (e.target === dlg && sheetK) return dlg.close();
  const b = e.target.closest("[data-act]"); if (!b) return;
  const d = b.dataset, id = d.id;
  switch (d.act) {
    case "copyKey": navigator.clipboard?.writeText(user.uid).then(() => say("Kode disalin.")).catch(() => say("Gagal menyalin. Salin manual dari kolom.")); break;
    case "useKey": { const v = $("#newkey").value.trim(); if (!S.KEY_RE.test(v)) return say("Kode tidak valid (20 sampai 64 huruf atau angka)."); if (confirm("Pindah ke data dengan kode ini? Data di perangkat ini tetap tersimpan dengan kode lamanya.") && S.setDeviceKey(v)) location.reload(); break; }
    case "nav": view = d.v; q = ""; flt = "active"; render(); break;
    case "flt": flt = d.f; render(); break;
    case "lst": lst = d.l; render(); break;
    case "add": if (d.t === "note") newNote(); else openForm(d.t, null, d.t === "event" ? { when: `${calSel || today()}T08:00`, remind: 15 } : undefined); break;
    case "edit": openForm(find(id).type, id); break;
    case "done": {
      const it = find(id), to = d.to === "true";
      if (to && it.repeat) {
        const w = G.nextWhen(it.when, it.repeat), subs = it.subs ? Object.fromEntries(Object.entries(it.subs).map(([k, s]) => [k, { ...s, d: false }])) : null;
        await S.patchItem(user.uid, id, { when: w, sent: null, subs, doneAt: Date.now() }); act();
        say(`Berulang: jadwal berikutnya ${w.replace("T", " ")}`, () => S.patchItem(user.uid, id, { when: it.when, subs: it.subs || null })); break;
      }
      await S.patchItem(user.uid, id, { done: to, doneAt: to ? Date.now() : null }); if (to) act();
      say(to ? "Ditandai selesai." : "Dikembalikan ke aktif.", () => S.patchItem(user.uid, id, { done: !to, doneAt: !to ? Date.now() : null })); break;
    }
    case "star": S.patchItem(user.uid, id, { star: !find(id).star }); break;
    case "sub": S.patchItem(user.uid, id, { [`subs/${d.k}/d`]: !find(id).subs?.[d.k]?.d }); break;
    case "del": { const data = { ...find(id) }; delete data.id; await S.delItem(user.uid, id); say("Item dihapus.", () => S.setItem(user.uid, id, data)); break; }
    case "undo": toast.className = ""; undo?.(); break;
    case "saveChat": { const v = $("#chat").value.trim(); if (v && !/^-?\d{5,20}$/.test(v)) return say("Chat ID harus berupa angka."); await S.patchMe(user.uid, { tgChatId: v }); me.tgChatId = v; say("Chat ID tersimpan."); if (sheetK) dlg.close(); else refresh(); break; }
    case "push": enablePush(false).catch(err => say(err.message)); break;
    case "pushTest": testPush().then(() => say("Notifikasi uji dikirim ke perangkat ini.")).catch(err => say(err.message)); break;
    case "clearDone": { const n = items.filter(x => x.done); if (!n.length) say("Tidak ada item selesai."); else if (confirm(`Hapus ${n.length} item yang sudah selesai? Ini tidak bisa diurungkan.`)) { await Promise.all(n.map(x => S.delItem(user.uid, x.id))); say(`${n.length} item dihapus.`); } break; }
    case "att": { const k = day(0), cur = me.attend || {}; me.attend = { ...cur, [id]: { ...(cur[id] || {}), [k]: d.s } }; await S.patchMe(user.uid, { attend: { [id]: { [k]: d.s } } }); say("Presensi dicatat."); refresh(); break; }
    case "start": try { localStorage.setItem("kp-welcome", "1"); } catch { /* abaikan */ } overlay.hidden = true; break;
    case "track": { const s = scholars.find(x => x.id === id); if (!s || !s.d) return; await S.addItem(user.uid, { type: "scholar", title: s.t.slice(0, 120), when: s.d + "T23:59", step: "Cek persyaratan di situs resmi", link: /^https:\/\//.test(s.u) ? s.u.slice(0, 300) : "" }); say("Ditambahkan ke Radar Beasiswa."); break; }
    case "install": installEv?.prompt(); installEv = null; refresh(); break;
    case "semSel": semSel = d.s; render(); break;
    case "schDay": schDay = +d.d; render(); break;
    case "calNav": calOff += +d.n; render(); break;
    case "calToday": calOff = 0; calSel = ""; render(); break;
    case "calDay": calSel = d.d; render(); break;
    case "theme": setUi({ mode: document.documentElement.dataset.theme === "dark" ? "light" : "dark" }); break;
    case "export": { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ v: 1, me, items: Object.fromEntries(items.map(({ id: i, ...x }) => [i, x])) })], { type: "application/json" })); a.download = "kampusping-cadangan.json"; a.click(); break; }
    case "sheet": openSheet(d.k); break;
    case "sheetClose": dlg.close(); break;
    case "catur": location.href = "catur.html"; break;
    case "uiBg": setUi({ bg: d.k }); break;
    case "uiMas": setUi({ mas: d.k }); break;
    case "uiMasPos": setUi({ masPos: d.v }); break;
    case "uiBgDel": T.setImg("bg", ""); setUi(ui.bg === "u" ? { bg: "" } : {}); break;
    case "uiMasDel": T.setImg("mas", ""); setUi(ui.mas === "u" ? { mas: "" } : {}); break;
    case "uiMode": setUi({ mode: d.k }); break;
    case "uiBgL": setUi({ bgL: d.k }); break;
    case "uiBgD": setUi({ bgD: d.k }); break;
    case "uiAcc": setUi({ acc: d.k }); break;
    case "uiR": setUi({ r: +d.v }); break;
    case "uiFs": setUi({ fs: +d.v }); break;
    case "uiReset": setUi({ ...T.DEF }); say("Tema dikembalikan ke bawaan."); break;
    case "saveSiakad": { const v = $("#siakad").value.trim(); if (v && !/^https:\/\//.test(v)) return say("Alamat harus diawali https://"); await S.setMe(user.uid, "siakad", v ? v.slice(0, 300) : null); me.siakad = v; say(v ? "Alamat SIAKAD-mu disimpan." : "Memakai alamat bawaan admin."); if (sheetK) dlg.close(); else refresh(); break; }
    case "resetSiakad": await S.setMe(user.uid, "siakad", null); delete me.siakad; say("Memakai alamat bawaan admin."); if (sheetK) dlg.close(); else refresh(); break;
    case "clsAdd": dlg.innerHTML = V.form("cls", { day: new Date(Date.now() + 252e5).getUTCDay() }, ""); dlg.showModal(); break;
    case "clsEdit": { const x = findCls(id); if (!x) return; dlg.innerHTML = V.form("cls", x, id); dlg.showModal(); break; }
    case "clsReset": if (confirm("Kembalikan semua perubahan pada jadwal admin (termasuk yang disembunyikan)? Jadwal pribadi yang kamu tambah tetap ada.")) { await S.setMe(user.uid, "co", null); delete me.co; say("Jadwal admin dikembalikan."); refresh(); } break;
    case "noteNew": newNote(); break;
    case "noteOpen": saveNote(); noteSel = id; render(); break;
    case "noteBack": saveNote(); noteSel = ""; render(); break;
    case "noteCat": saveNote(); noteCat = d.k; noteSel = ""; render(); break;
    case "notePin": patchNote({ pin: !me.notes?.[noteSel]?.pin }); break;
    case "noteColor": patchNote({ color: d.k }); break;
    case "noteArch": { const n = me.notes?.[noteSel]; if (!n) return; const k = noteSel, to = !n.arch; await saveNote(); patchNote({ arch: to }); if (to && noteCat !== "*arch") { noteSel = ""; render(); } say(to ? "Diarsipkan." : "Dikeluarkan dari arsip.", () => { me.notes = { ...me.notes, [k]: { ...me.notes[k], arch: !to } }; syncNote(k); refresh(); }); break; }
    case "noteCopy": { const n = me.notes?.[noteSel]; if (n) navigator.clipboard?.writeText(`${$("#nt-title")?.value || n.title}\n\n${$("#nt-body")?.value ?? n.body}`).then(() => say("Catatan disalin.")).catch(() => say("Gagal menyalin.")); break; }
    case "noteDel": { const k = noteSel, n = me.notes?.[k]; if (!n) return; clearTimeout(nTimer); const data = { ...n }; const m = { ...me.notes }; delete m[k]; me.notes = m; noteSel = ""; render(); syncNote(k); say("Catatan dihapus.", () => { me.notes = { ...me.notes, [k]: data }; syncNote(k); refresh(); }); break; }
    case "noteExport": { const t = X.noteArr(me).sort((a, b) => (b.t || 0) - (a.t || 0)).map(n => `# ${n.title || "Tanpa judul"}${n.cat ? "  [" + n.cat + "]" : ""}${n.arch ? "  (arsip)" : ""}\n${n.body || ""}\n`).join("\n----------------\n\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t || "Belum ada catatan."], { type: "text/plain" })); a.download = "kampusping-catatan.txt"; a.click(); break; }
    case "gAdd": me.grades = [...(me.grades || []), { name: "", sks: 2, nilai: "A", smt: +d.s || 1 }]; S.patchMe(user.uid, { grades: me.grades }); render(); break;
    case "gSem": { const next = Math.max(0, ...(me.grades || []).map(x => x.smt || 1)) + 1; if (next > 14) return say("Maksimal 14 semester."); me.grades = [...(me.grades || []), { name: "", sks: 2, nilai: "A", smt: next }]; S.patchMe(user.uid, { grades: me.grades }); render(); break; }
    case "gDel": me.grades = (me.grades || []).filter((_, i) => i !== +d.i); S.patchMe(user.uid, { grades: me.grades }); render(); break;
  }
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset?.ui && t.type === "range") { ui = T.apply({ ...ui, [t.dataset.ui]: +t.value }); const em = t.parentElement.querySelector("em"); if (em) em.textContent = t.value; }
  if (t.id === "q") { q = t.value; $("#rows").innerHTML = V.rows(ctx()); }
  if (t.id === "nq") { noteQ = t.value; redrawList(); }
  if (t.dataset?.note) { clearTimeout(nTimer); nTimer = setTimeout(saveNote, 700); const b = $("#nt-body"), c = $("#nt-count"); if (b && c) c.textContent = `${(b.value.trim().match(/\S+/g) || []).length} kata · ${b.value.length}/10000 karakter · menyimpan...`; }
});
document.addEventListener("focusout", e => { if (e.target.dataset?.note) saveNote().then(() => setTimeout(refresh, 50)); });
document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); } });
document.addEventListener("change", e => {
  const t = e.target.dataset;
  if (e.target.id === "nsort") { noteSort = e.target.value; redrawList(); }
  if (t.ui) setUi({ [t.ui]: e.target.type === "range" ? +e.target.value : e.target.value });
  if (t.up) { const f = e.target.files[0], k = t.up; e.target.value = ""; if (f) T.fileToData(f, k).then(u => { if (!T.setImg(k, u)) throw new Error("Penyimpanan perangkat penuh. Hapus gambar lain dulu."); setUi(k === "bg" ? { bg: "u" } : { mas: "u" }); say("Gambar dipasang."); }).catch(err => say(err.message)); }
  if (t.pref) prefs({ [t.pref]: e.target.checked }).then(() => say("Pengaturan disimpan."));
  if (t.import) { const f = e.target.files[0]; if (f) f.text().then(x => S.restore(user.uid, JSON.parse(x))).then(() => say("Data dipulihkan.")).catch(() => say("File cadangan tidak valid.")); }
  if (t.g) { const [i, k] = t.g.split("."), g = [...(me.grades || [])]; g[i] = { ...g[i], [k]: k === "sks" ? +e.target.value : e.target.value }; me.grades = g; S.patchMe(user.uid, { grades: g }); refresh(); }
});
document.addEventListener("submit", e => {
  if (e.target.id !== "qa") return; e.preventDefault(); const v = $("#qa-t").value.trim(); if (!v) return;
  const o = G.quick(v); S.addItem(user.uid, { type: "task", title: o.title.slice(0, 120), when: o.when, weight: 1, course: "" }).then(() => say(`Tugas ditambahkan: ${o.title}`));
});
async function saveEvent(f) {
  const fd = new FormData(f), g = k => String(fd.get(k) || "").trim(), id = f.dataset.id, allDay = fd.get("allDay") === "on", date = g("date"), time = g("time"), end = g("end");
  if (!g("title") || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return say("Isi judul dan tanggal.");
  if (!allDay && !/^\d{2}:\d{2}$/.test(time)) return say("Isi jam mulai.");
  if (!allDay && end && end <= time) return say("Jam selesai harus setelah jam mulai.");
  const o = { title: g("title").slice(0, 120), when: `${date}T${allDay ? "00:00" : time}`, allDay, end: allDay ? "" : end, place: g("place").slice(0, 80), note: g("note").slice(0, 500), repeat: g("repeat"), remind: +g("remind") };
  try {
    if (id) await S.patchItem(user.uid, id, { ...o, sent: null }); else await S.addItem(user.uid, { type: "event", ...o });
    dlg.close(); say(+o.remind >= 0 && perm() !== "granted" && !me.tgChatId ? "Agenda tersimpan. Aktifkan notifikasi di Atur agar pengingat masuk ke HP." : "Agenda tersimpan.");
    calSel = date; if (view === "cal") { const W = new Date(Date.now() + 252e5); calOff = (+date.slice(0, 4) - W.getUTCFullYear()) * 12 + (+date.slice(5, 7) - 1 - W.getUTCMonth()); render(); }
  } catch { say("Gagal menyimpan agenda."); }
}
async function saveCls(f, how) {
  const fd = new FormData(f), g = k => String(fd.get(k) || "").trim(), id = f.dataset.id, x = id ? findCls(id) : null, uid = user.uid;
  try {
    if (how === "reset") await S.setMe(uid, `co/${id}`, null);
    else if (how === "del") { if (x.own) await S.setMe(uid, `cx/${id}`, null); else await S.setMe(uid, `co/${id}/hide`, true); }
    else {
      const o = { title: g("title").slice(0, 100), day: +g("day"), time: g("time"), end: g("end"), room: g("room").slice(0, 60), lecturer: g("lecturer").slice(0, 80) };
      if (!o.title || !/^\d{2}:\d{2}$/.test(o.time)) return say("Isi nama dan jam mulai.");
      if (o.end && o.end <= o.time) return say("Jam selesai harus setelah jam mulai.");
      if (!id) await S.setMe(uid, `cx/${nid()}`, { ...o, sem: cfg.activeSemester || "" });
      else if (x.own) await S.setMe(uid, `cx/${id}`, { ...o, sem: x.sem || "" });
      else { const b = courses.find(c => c.id === id) || {}, diff = {}; for (const k of Object.keys(o)) if (String(o[k] ?? "") !== String(b[k] ?? "")) diff[k] = o[k]; await S.setMe(uid, `co/${id}`, Object.keys(diff).length ? diff : null); }
    }
    dlg.close(); say(how === "reset" ? "Dikembalikan ke jadwal admin." : how === "del" ? (x.own ? "Jadwal dihapus." : "Kelas disembunyikan. Pulihkan lewat Kembalikan jadwal admin.") : "Jadwal tersimpan.");
  } catch { say("Gagal menyimpan jadwal."); }
}
dlg.addEventListener("close", () => { sheetK = ""; setTimeout(refresh, 0); });
dlg.addEventListener("submit", async e => {
  e.preventDefault(); if (e.submitter?.value === "cancel") return dlg.close();
  if (e.target.dataset.t === "cls") return saveCls(e.target, e.submitter?.value);
  if (e.target.dataset.t === "event") return saveEvent(e.target);
  const f = e.target, fd = new FormData(f), o = Object.fromEntries(fd), id = f.dataset.id, old = id ? find(id) : null;
  if (o.weight) o.weight = +o.weight;
  if (o.link && !/^https:\/\//.test(o.link)) return say("Tautan harus diawali https://");
  if (f.dataset.t === "task") {
    o.star = fd.get("star") === "on"; o.list = (o.list || "").trim().slice(0, 40) || "Utama";
    const lines = (o.subs || "").split("\n").map(s => s.trim()).filter(Boolean).slice(0, 20), was = Object.values(old?.subs || {});
    o.subs = lines.length ? Object.fromEntries(lines.map((t, i) => ["s" + i, { t: t.slice(0, 120), d: !!was.find(s => s.t === t && s.d) }])) : null;
  }
  try { await (id ? S.patchItem(user.uid, id, { ...o, sent: null }) : S.addItem(user.uid, { type: f.dataset.t, ...o })); dlg.close(); say("Tersimpan."); }
  catch { say("Gagal menyimpan. Periksa isian."); }
});
setInterval(() => { if (user && !document.hidden && $("#rows") && !dlg.open) $("#rows").innerHTML = V.rows(ctx()); }, 60000);
S.setDbErr(e => say(e?.code === "PERMISSION_DENIED" || /permission/i.test(e?.message || "") ? "Ditolak oleh aturan database. Jalankan: firebase deploy --only database" : "Koneksi ke database bermasalah. Periksa internet."));
setTimeout(() => { if (!conn) { slow = true; refresh(); } }, 4000);
S.watchMe(user.uid, v => { me = v || {}; me.notes = mergeNotes(me.notes); if (Object.keys(pendLoad()).length) flushNotes(); if (me.ui && Date.now() - uiAt > 5000) { const n = T.clean(me.ui); if (JSON.stringify(n) !== JSON.stringify(ui)) { ui = T.apply(n); T.save(ui); } } refresh(); });
S.watchConn(v => { conn = v; refresh(); });
S.watchCourses(a => { courses = a; refresh(); });
S.watchCfg(c => { cfg = c; refresh(); });
S.watchScholars(a => { scholars = a; refresh(); });
S.watchSemesters(a => { sems = a; refresh(); });
S.watchScholarMeta(m => { smeta = m; refresh(); });
if (perm() === "granted") enablePush(true).catch(() => { /* token disinkronkan lagi saat berikutnya */ });
S.watchItems(user.uid, arr => {
  items = arr;
  if (first) { first = false; if (!arr.length && !seenWelcome()) { overlay.hidden = false; overlay.innerHTML = G.welcome(); } }
  refresh();
});
render();
