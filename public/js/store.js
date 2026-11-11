// Penyimpanan: Realtime Database lewat REST (HTTP), tanpa login. Identitas = kode perangkat acak di localStorage.
// Data disegarkan tiap 8 detik dan langsung setelah setiap perubahan, tanpa bergantung pada koneksi WebSocket.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { firebaseConfig } from "./firebase-config.js";
import { fbCfg } from "./util.js";
const cfg = fbCfg(firebaseConfig);
export const app = initializeApp(cfg);
export const KEY_RE = /^[A-Za-z0-9]{20,64}$/;
let dbErr = () => {}, mem = "", connCb = () => {}, up = null, lastErr = 0, tm = 0;
export const setDbErr = f => { dbErr = f; };
const mk = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[b % 62]).join("");
export function deviceKey() {
  let k = mem; try { k = localStorage.getItem("kp-key") || mem; } catch { /* penyimpanan dinonaktifkan */ }
  if (!KEY_RE.test(k)) { k = mk(); try { localStorage.setItem("kp-key", k); } catch { /* abaikan */ } }
  return mem = k;
}
export const setDeviceKey = k => { if (!KEY_RE.test(k)) return false; try { localStorage.setItem("kp-key", k); return true; } catch { return false; } };
async function rq(m, p, body) {
  const ac = new AbortController(), url = `${cfg.databaseURL}/${p.split("/").map(encodeURIComponent).join("/")}.json`;
  const lim = new Promise((_, no) => setTimeout(() => { ac.abort(); no(Object.assign(new Error("Waktu habis"), { code: "TIMEOUT" })); }, 10000));
  const r = await Promise.race([fetch(url, { method: m, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: ac.signal }), lim]);
  if (!r.ok) throw Object.assign(new Error("HTTP " + r.status), { code: r.status === 401 || r.status === 403 ? "PERMISSION_DENIED" : "HTTP_" + r.status });
  return r.json();
}
const setUp = v => { if (v !== up) { up = v; connCb(v); } };
const subs = [];
async function poll(s) {
  if (s.busy) return; s.busy = true;
  try { const v = await rq("GET", s.path); setUp(true); const sig = JSON.stringify(v); if (sig !== s.sig) { s.sig = sig; s.cb(s.map(v)); } }
  catch (e) { setUp(false); if (Date.now() - lastErr > 20000) { lastErr = Date.now(); dbErr(e); } }
  finally { s.busy = false; }
}
const pollAll = () => subs.forEach(poll);
const kick = () => { clearTimeout(tm); tm = setTimeout(pollAll, 10); };
setInterval(() => { if (!document.hidden) pollAll(); }, 8000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) pollAll(); });
window.addEventListener("online", pollAll);
const watch = (path, map) => cb => { const s = { path, cb, map, sig: null, busy: false }; subs.push(s); poll(s); return () => { subs.splice(subs.indexOf(s), 1); }; };
const rows = (extra = {}) => v => Object.entries(v || {}).map(([id, x]) => ({ id, ...extra, ...x }));
export const watchItems = (u, cb) => watch(`items/${u}`, rows())(cb);
export const watchCourses = cb => watch("courses", rows({ type: "class" }))(cb);
export const watchCfg = cb => watch("config", v => v || {})(cb);
export const watchScholars = cb => watch("scholarships", rows())(cb);
export const watchScholarMeta = cb => watch("scholarMeta", v => v || {})(cb);
export const watchSemesters = cb => watch("semesters", rows())(cb);
export const watchMe = (u, cb) => watch(`users/${u}`, v => v || {})(cb);
export const watchConn = cb => { connCb = cb; if (up !== null) cb(up); return () => { connCb = () => {}; }; };
const op = async (m, p, body) => { try { const v = await rq(m, p, body); kick(); return v; } catch (e) { dbErr(e); throw e; } };
const put = (base, o) => Promise.all(Object.entries(o).map(([k, v]) => op("PUT", `${base}/${k}`, v === undefined ? null : v)));
export const addItem = async (u, x) => (await op("POST", `items/${u}`, { ...x, done: false })).name;
export const setItem = (u, id, x) => op("PUT", `items/${u}/${id}`, x);
export const delItem = (u, id) => op("DELETE", `items/${u}/${id}`);
export const patchItem = (u, id, x) => put(`items/${u}/${id}`, x);
const flat = (o, p = "", out = {}) => { for (const [k, v] of Object.entries(o)) v && typeof v === "object" && !Array.isArray(v) ? flat(v, p + k + "/", out) : out[p + k] = v; return out; };
export const patchMe = (u, x) => put(`users/${u}`, flat(x));
export const addToken = (u, t) => op("PUT", `users/${u}/fcm/${t}`, true);
const OK = ["streak", "best", "lastDone", "lastNote", "prefs", "focus", "grades", "attend", "tgChatId"];
export const restore = (u, d) => { // impor disaring: hanya kolom yang dikenal
  const items = {}; for (const [id, x] of Object.entries(d.items || {})) if (x && ["task", "scholar"].includes(x.type) && typeof x.title === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(x.when || ""))
    items[id.replace(/[.$#[\]/]/g, "_").slice(0, 40)] = { type: x.type, title: x.title.slice(0, 120), course: String(x.course || "").slice(0, 80), when: x.when, weight: Math.min(3, Math.max(1, +x.weight || 1)), step: String(x.step || "").slice(0, 200), done: !!x.done, list: String(x.list || "Utama").slice(0, 40), star: !!x.star, note: String(x.note || "").slice(0, 500), repeat: ["daily", "weekly", "monthly"].includes(x.repeat) ? x.repeat : "" };
  return Promise.all([op("PUT", `items/${u}`, Object.keys(items).length ? items : null), ...OK.filter(k => d.me?.[k] !== undefined).map(k => op("PUT", `users/${u}/${k}`, d.me[k]))]);
};
