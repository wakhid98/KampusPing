import * as S from "./store.js";
import { needGate, runGate, esc } from "./gate.js";
import { VAPID } from "./firebase-config.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import * as V from "./views.js";
import * as G from "./pages.js";
const $ = s => document.querySelector(s), root = $("#app"), dlg = $("#dlg"), toast = $("#toast"), gateEl = $("#gate");
let user, me = {}, items = [], courses = [], cfg = {}, admin = false, view = "home", q = "", flt = "active", gated = false, tmr, undo, adminForm = false, unsub = [];
const ft = { left: 1500, run: false, mode: 25, brk: false, h: null };
const ctx = () => ({ user, me, items, courses, cfg, admin, q, flt, view, ft });
const render = () => { root.innerHTML = user ? V.shell(ctx()) : G.login(adminForm); };
const refresh = () => { if (dlg.open) return; const k = $("#q"), pos = k?.selectionStart; render(); if (k && $("#q")) { $("#q").focus(); $("#q").setSelectionRange(pos, pos); } };
function say(msg, fn) { clearTimeout(tmr); undo = fn; toast.innerHTML = `<span>${esc(msg)}</span>${fn ? '<button data-act="undo">Urungkan</button>' : ""}`; toast.className = "show"; tmr = setTimeout(() => toast.className = "", 6000); }
const find = id => items.find(x => x.id === id) || courses.find(x => x.id === id);
const day = n => new Date(Date.now() + 252e5 - n * 864e5).toISOString().slice(0, 10);
const prefs = o => { me.prefs = { ...(me.prefs || {}), ...o }; return S.patchMe(user.uid, { prefs: o }); };
function openForm(t, id) { dlg.innerHTML = V.form(t, id ? find(id) : {}, id); dlg.showModal(); }
async function enablePush() {
  if (await Notification.requestPermission() !== "granted") return say("Izin notifikasi ditolak browser.");
  const reg = await navigator.serviceWorker.register("firebase-messaging-sw.js");
  const token = await getToken(getMessaging(S.app), { vapidKey: VAPID, serviceWorkerRegistration: reg });
  await S.patchMe(user.uid, { fcmTokens: S.arrayUnion(token) }); say("Notifikasi web aktif.");
}
function tick() {
  ft.left--; const el = $("#ftime"); if (el) el.textContent = G.mmss(ft.left);
  if (ft.left > 0) return;
  clearInterval(ft.h); ft.run = false; navigator.vibrate?.([300, 150, 300]);
  if (!ft.brk) { const k = day(0), n = (me.focus?.[k] || 0) + 1; me.focus = { ...(me.focus || {}), [k]: n }; S.patchMe(user.uid, { focus: { [k]: n } }); say("Sesi fokus selesai. Istirahat 5 menit."); ft.brk = true; ft.left = 300; }
  else { say("Istirahat selesai."); ft.brk = false; ft.left = ft.mode * 60; }
  if (view === "fokus") render();
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const d = b.dataset, id = d.id;
  switch (d.act) {
    case "in": S.login(); break; case "out": S.logout(); break;
    case "adminToggle": adminForm = !adminForm; render(); break;
    case "adminLogin": S.loginEmail($("#em").value.trim(), $("#pw").value).catch(() => say("Email atau kata sandi salah.")); break;
    case "nav": view = d.v; q = ""; flt = "active"; render(); break;
    case "flt": flt = d.f; render(); break;
    case "add": if (d.t === "class" && !admin) return say("Jadwal kuliah dikelola admin."); openForm(d.t); break;
    case "edit": openForm(find(id).type, id); break;
    case "done": { const to = d.to === "true"; await S.patchItem(user.uid, id, { done: to }); say(to ? "Ditandai selesai." : "Dikembalikan ke aktif.", () => S.patchItem(user.uid, id, { done: !to })); break; }
    case "del": { const { id: _, ...data } = find(id), c = find(id).type === "class";
      await (c ? S.delCourse(id) : S.delItem(user.uid, id)); say("Item dihapus.", () => c ? S.setCourse(id, data) : S.setItem(user.uid, id, data)); break; }
    case "undo": toast.className = ""; undo?.(); break;
    case "saveChat": { const v = $("#chat").value.trim(); await S.patchMe(user.uid, { tgChatId: v }); me.tgChatId = v; say("Chat ID tersimpan."); break; }
    case "push": enablePush().catch(err => say(err.message)); break;
    case "clearDone": { const n = items.filter(x => x.done); if (!n.length) say("Tidak ada item selesai."); else if (confirm(`Hapus ${n.length} item yang sudah selesai? Ini tidak bisa diurungkan.`)) { await Promise.all(n.map(x => S.delItem(user.uid, x.id))); say(`${n.length} item dihapus.`); } break; }
    case "saveAdmin": { const t = $("#ann").value.trim(); await S.setCfg({ announce: t ? { id: cfg.announce?.text === t ? cfg.announce.id : Date.now(), text: t } : null, quietStart: +$("#qs").value, quietEnd: +$("#qe").value }).then(() => say("Pengaturan admin tersimpan.")).catch(() => say("Gagal: hanya admin yang boleh menyimpan.")); break; }
    case "ftToggle": ft.run = !ft.run; clearInterval(ft.h); if (ft.run) ft.h = setInterval(tick, 1000); render(); break;
    case "ftReset": clearInterval(ft.h); Object.assign(ft, { run: false, brk: false, left: ft.mode * 60 }); render(); break;
    case "ftMode": clearInterval(ft.h); Object.assign(ft, { mode: +d.m, run: false, brk: false, left: +d.m * 60 }); render(); break;
    case "gAdd": me.grades = [...(me.grades || []), { name: "", sks: 2, nilai: "A" }]; S.patchMe(user.uid, { grades: me.grades }); render(); break;
    case "gDel": me.grades = (me.grades || []).filter((_, i) => i !== +d.i); S.patchMe(user.uid, { grades: me.grades }); render(); break;
  }
});
document.addEventListener("input", e => { if (e.target.id === "q") { q = e.target.value; $("#rows").innerHTML = V.rows(ctx()); } });
document.addEventListener("change", e => {
  const t = e.target.dataset;
  if (t.pref) prefs({ [t.pref]: e.target.checked }).then(() => say("Pengaturan disimpan."));
  if (t.gm) prefs({ gateMin: +e.target.value }).then(() => say("Durasi disimpan."));
  if (t.g) { const [i, k] = t.g.split("."), g = [...(me.grades || [])]; g[i] = { ...g[i], [k]: k === "sks" ? +e.target.value : e.target.value }; me.grades = g; S.patchMe(user.uid, { grades: g }); $("#ipk").textContent = G.calc(g); }
});
dlg.addEventListener("submit", async e => {
  e.preventDefault(); if (e.submitter?.value === "cancel") return dlg.close();
  const f = e.target, o = Object.fromEntries(new FormData(f)), c = f.dataset.t === "class"; if (o.day !== undefined) o.day = +o.day; if (o.weight) o.weight = +o.weight;
  try {
    if (f.dataset.id) await (c ? S.patchCourse(f.dataset.id, o) : S.patchItem(user.uid, f.dataset.id, { ...o, sent: {} }));
    else await (c ? S.addCourse(o) : S.addItem(user.uid, { type: f.dataset.t, ...o }));
    dlg.close(); say("Tersimpan.");
  } catch { say("Gagal menyimpan. Periksa izin akunmu."); }
});
setInterval(() => { if (user && !document.hidden && $("#rows") && !dlg.open) $("#rows").innerHTML = V.rows(ctx()); }, 60000);
S.onUser(async u => {
  unsub.forEach(f => f()); unsub = []; user = u; admin = false;
  if (!u) return render();
  me = await S.getMe(u.uid); admin = await S.isAdmin(u.uid).catch(() => false);
  unsub = [S.watchCourses(a => { courses = a; refresh(); }), S.watchCfg(c => { cfg = c; refresh(); }), S.watchItems(u.uid, arr => {
    items = arr;
    if (!gated) { gated = true; const t = items.filter(x => x.type === "task" && !x.done).sort((a, b) => V.ms(a) - V.ms(b))[0]; if (t && needGate(me)) runGate(gateEl, u.uid, me, t, render); }
    refresh();
  })];
});
render();
