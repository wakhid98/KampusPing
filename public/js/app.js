import * as S from "./store.js";
import { needGate, runGate, esc } from "./gate.js";
import { VAPID } from "./firebase-config.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import * as V from "./views.js";
const $ = s => document.querySelector(s), root = $("#app"), dlg = $("#dlg"), toast = $("#toast"), gateEl = $("#gate");
let user, me = {}, items = [], view = "home", q = "", flt = "active", gated = false, tmr, undo;
const ctx = () => ({ user, me, items, q, flt, view });
const render = () => { root.innerHTML = user ? V.shell(ctx()) : V.login(); };
function say(msg, fn) { clearTimeout(tmr); undo = fn; toast.innerHTML = `<span>${esc(msg)}</span>${fn ? '<button data-act="undo">Urungkan</button>' : ""}`; toast.className = "show"; tmr = setTimeout(() => toast.className = "", 6000); }
const find = id => items.find(x => x.id === id);
function openForm(t, id) { dlg.innerHTML = V.form(t, id ? find(id) : {}, id); dlg.showModal(); }
const prefs = o => { me.prefs = { ...(me.prefs || {}), ...o }; return S.patchMe(user.uid, { prefs: o }); };
async function enablePush() {
  if (await Notification.requestPermission() !== "granted") return say("Izin notifikasi ditolak browser.");
  const reg = await navigator.serviceWorker.register("firebase-messaging-sw.js");
  const token = await getToken(getMessaging(S.app), { vapidKey: VAPID, serviceWorkerRegistration: reg });
  await S.patchMe(user.uid, { fcmTokens: S.arrayUnion(token) }); say("Notifikasi web aktif.");
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const d = b.dataset, id = d.id;
  switch (d.act) {
    case "in": S.login(); break; case "out": S.logout(); break;
    case "nav": view = d.v; q = ""; flt = "active"; render(); break;
    case "flt": flt = d.f; render(); break;
    case "add": openForm(d.t); break; case "edit": openForm(find(id).type, id); break;
    case "done": { const to = d.to === "true"; await S.patchItem(user.uid, id, { done: to }); say(to ? "Ditandai selesai." : "Dikembalikan ke aktif.", () => S.patchItem(user.uid, id, { done: !to })); break; }
    case "del": { const { id: _, ...data } = find(id); await S.delItem(user.uid, id); say("Item dihapus.", () => S.setItem(user.uid, id, data)); break; }
    case "undo": toast.className = ""; undo?.(); break;
    case "saveChat": { const v = $("#chat").value.trim(); await S.patchMe(user.uid, { tgChatId: v }); me.tgChatId = v; say("Chat ID tersimpan."); break; }
    case "push": enablePush().catch(err => say(err.message)); break;
    case "clearDone": { const n = items.filter(x => x.done); if (n.length && confirm(`Hapus ${n.length} item yang sudah selesai? Ini tidak bisa diurungkan.`)) { await Promise.all(n.map(x => S.delItem(user.uid, x.id))); say(`${n.length} item dihapus.`); } else if (!n.length) say("Tidak ada item selesai."); break; }
  }
});
document.addEventListener("input", e => { if (e.target.id === "q") { q = e.target.value; $("#rows").innerHTML = V.rows(ctx()); } });
document.addEventListener("change", e => {
  if (e.target.dataset.pref) prefs({ [e.target.dataset.pref]: e.target.checked }).then(() => say("Pengaturan disimpan."));
  if (e.target.dataset.gm) prefs({ gateMin: +e.target.value }).then(() => say("Durasi disimpan."));
});
dlg.addEventListener("submit", async e => {
  e.preventDefault(); if (e.submitter?.value === "cancel") return dlg.close();
  const f = e.target, o = Object.fromEntries(new FormData(f)); if (o.day !== undefined) o.day = +o.day; if (o.weight) o.weight = +o.weight;
  if (f.dataset.id) await S.patchItem(user.uid, f.dataset.id, { ...o, sent: {} }); else await S.addItem(user.uid, { type: f.dataset.t, ...o });
  dlg.close(); say("Tersimpan.");
});
setInterval(() => { if (user && !document.hidden && $("#rows") && !dlg.open) $("#rows").innerHTML = V.rows(ctx()); }, 60000);
S.onUser(async u => {
  user = u; if (!u) return render();
  me = await S.getMe(u.uid);
  S.watchItems(u.uid, arr => {
    items = arr;
    if (!gated) { gated = true; const t = items.filter(x => x.type === "task" && !x.done).sort((a, b) => V.ms(a) - V.ms(b))[0]; if (t && needGate(me)) runGate(gateEl, u.uid, me, t, render); }
    if (!dlg.open) { const k = $("#q"), pos = k?.selectionStart; render(); if (k && $("#q")) { $("#q").focus(); $("#q").setSelectionRange(pos, pos); } }
  });
});
render();
