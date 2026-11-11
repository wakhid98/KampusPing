import * as S from "./store.js";
import { esc, keepForm } from "./util.js";
import { VAPID } from "./firebase-config.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import * as V from "./views.js";
import * as G from "./pages.js";
const $ = s => document.querySelector(s), root = $("#app"), dlg = $("#dlg"), toast = $("#toast"), overlay = $("#gate");
const user = { uid: S.deviceKey() };
let me = {}, items = [], courses = [], scholars = [], smeta = {}, sems = [], semSel = "", schDay = null, cfg = {}, view = "home", q = "", flt = "active", lst = "*all", calOff = 0, calSel = "", tmr, undo, first = true, conn = false, slow = false;
const ft = { left: 1500, run: false, mode: 25, brk: false, h: null };
const setTheme = n => { const t = n || (document.documentElement.dataset.theme === "light" ? "dark" : "light"); document.documentElement.dataset.theme = t; try { localStorage.setItem("kp-theme", t); } catch { /* penyimpanan dinonaktifkan */ } };
try { setTheme(localStorage.getItem("kp-theme") || "light"); } catch { setTheme("light"); }
const seenWelcome = () => { try { return localStorage.getItem("kp-welcome"); } catch { return 1; } };
const ctx = () => ({ user, me, items, courses, cfg, q, flt, lst, view, ft, calOff, calSel, conn, slow, scholars, smeta, canInstall: !!installEv, sems, semSel, schDay });
const render = () => { root.innerHTML = V.shell(ctx()); };
const refresh = () => { if (!dlg.open) keepForm(root, render); };
let installEv = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEv = e; refresh(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("firebase-messaging-sw.js").catch(() => { /* tanpa service worker, web tetap jalan */ });
function say(msg, fn) { clearTimeout(tmr); undo = fn; toast.innerHTML = `<span>${esc(msg)}</span>${fn ? '<button data-act="undo">Urungkan</button>' : ""}`; toast.className = "show"; tmr = setTimeout(() => toast.className = "", 6000); }
const find = id => items.find(x => x.id === id);
const day = n => new Date(Date.now() + 252e5 - n * 864e5).toISOString().slice(0, 10);
const prefs = o => { me.prefs = { ...(me.prefs || {}), ...o }; return S.patchMe(user.uid, { prefs: o }); };
const openForm = (t, id) => { dlg.innerHTML = V.form(t, id ? find(id) : {}, id, V.lists(items)); dlg.showModal(); };
function act() { // satu aksi per hari menjaga streak
  const k = day(0); if (me.lastDone === k) return;
  const streak = me.lastDone === day(1) ? (me.streak || 0) + 1 : 1, upd = { lastDone: k, streak, best: Math.max(me.best || 0, streak) };
  Object.assign(me, upd); S.patchMe(user.uid, upd);
}
async function enablePush() {
  if (await Notification.requestPermission() !== "granted") return say("Izin notifikasi ditolak browser.");
  const reg = await navigator.serviceWorker.register("firebase-messaging-sw.js");
  const token = await getToken(getMessaging(S.app), { vapidKey: VAPID, serviceWorkerRegistration: reg });
  await S.addToken(user.uid, token); say("Notifikasi web aktif.");
}
function tick() {
  ft.left--; const el = $("#ftime"); if (el) el.textContent = G.mmss(ft.left);
  if (ft.left > 0) return;
  clearInterval(ft.h); ft.run = false; navigator.vibrate?.([300, 150, 300]);
  if (!ft.brk) { const k = day(0), n = (me.focus?.[k] || 0) + 1; me.focus = { ...(me.focus || {}), [k]: n }; S.patchMe(user.uid, { focus: { [k]: n } }); act(); say("Sesi fokus selesai. Istirahat 5 menit."); ft.brk = true; ft.left = 300; }
  else { say("Istirahat selesai."); ft.brk = false; ft.left = ft.mode * 60; }
  if (view === "fokus") render();
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const d = b.dataset, id = d.id;
  switch (d.act) {
    case "copyKey": navigator.clipboard?.writeText(user.uid).then(() => say("Kode disalin.")).catch(() => say("Gagal menyalin. Salin manual dari kolom.")); break;
    case "useKey": { const v = $("#newkey").value.trim(); if (!S.KEY_RE.test(v)) return say("Kode tidak valid (20 sampai 64 huruf atau angka)."); if (confirm("Pindah ke data dengan kode ini? Data di perangkat ini tetap tersimpan dengan kode lamanya.") && S.setDeviceKey(v)) location.reload(); break; }
    case "nav": view = d.v; q = ""; flt = "active"; render(); break;
    case "flt": flt = d.f; render(); break;
    case "lst": lst = d.l; render(); break;
    case "add": openForm(d.t); break;
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
    case "saveChat": { const v = $("#chat").value.trim(); if (v && !/^-?\d{5,20}$/.test(v)) return say("Chat ID harus berupa angka."); await S.patchMe(user.uid, { tgChatId: v }); me.tgChatId = v; say("Chat ID tersimpan."); break; }
    case "push": enablePush().catch(err => say(err.message)); break;
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
    case "theme": setTheme(); break;
    case "export": { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ v: 1, me, items: Object.fromEntries(items.map(({ id: i, ...x }) => [i, x])) })], { type: "application/json" })); a.download = "kampusping-cadangan.json"; a.click(); break; }
    case "ftToggle": ft.run = !ft.run; clearInterval(ft.h); if (ft.run) ft.h = setInterval(tick, 1000); render(); break;
    case "ftReset": clearInterval(ft.h); Object.assign(ft, { run: false, brk: false, left: ft.mode * 60 }); render(); break;
    case "ftMode": clearInterval(ft.h); Object.assign(ft, { mode: +d.m, run: false, brk: false, left: +d.m * 60 }); render(); break;
    case "gAdd": me.grades = [...(me.grades || []), { name: "", sks: 2, nilai: "A", smt: +d.s || 1 }]; S.patchMe(user.uid, { grades: me.grades }); render(); break;
    case "gSem": { const next = Math.max(0, ...(me.grades || []).map(x => x.smt || 1)) + 1; if (next > 14) return say("Maksimal 14 semester."); me.grades = [...(me.grades || []), { name: "", sks: 2, nilai: "A", smt: next }]; S.patchMe(user.uid, { grades: me.grades }); render(); break; }
    case "gDel": me.grades = (me.grades || []).filter((_, i) => i !== +d.i); S.patchMe(user.uid, { grades: me.grades }); render(); break;
  }
});
document.addEventListener("input", e => { if (e.target.id === "q") { q = e.target.value; $("#rows").innerHTML = V.rows(ctx()); } });
document.addEventListener("change", e => {
  const t = e.target.dataset;
  if (t.pref) prefs({ [t.pref]: e.target.checked }).then(() => say("Pengaturan disimpan."));
  if (t.import) { const f = e.target.files[0]; if (f) f.text().then(x => S.restore(user.uid, JSON.parse(x))).then(() => say("Data dipulihkan.")).catch(() => say("File cadangan tidak valid.")); }
  if (t.g) { const [i, k] = t.g.split("."), g = [...(me.grades || [])]; g[i] = { ...g[i], [k]: k === "sks" ? +e.target.value : e.target.value }; me.grades = g; S.patchMe(user.uid, { grades: g }); refresh(); }
});
document.addEventListener("submit", e => {
  if (e.target.id !== "qa") return; e.preventDefault(); const v = $("#qa-t").value.trim(); if (!v) return;
  const o = G.quick(v); S.addItem(user.uid, { type: "task", title: o.title.slice(0, 120), when: o.when, weight: 1, course: "" }).then(() => say(`Tugas ditambahkan: ${o.title}`));
});
dlg.addEventListener("submit", async e => {
  e.preventDefault(); if (e.submitter?.value === "cancel") return dlg.close();
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
S.watchMe(user.uid, v => { me = v || {}; refresh(); });
S.watchConn(v => { conn = v; refresh(); });
S.watchCourses(a => { courses = a; refresh(); });
S.watchCfg(c => { cfg = c; refresh(); });
S.watchScholars(a => { scholars = a; refresh(); });
S.watchSemesters(a => { sems = a; refresh(); });
S.watchScholarMeta(m => { smeta = m; refresh(); });
S.watchItems(user.uid, arr => {
  items = arr;
  if (first) { first = false; if (!arr.length && !seenWelcome()) { overlay.hidden = false; overlay.innerHTML = G.welcome(); } }
  refresh();
});
render();
