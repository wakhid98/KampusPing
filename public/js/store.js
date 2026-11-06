// Penyimpanan: Firebase Realtime Database + login anonim otomatis (tanpa login untuk pengguna).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, update, remove, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
export const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getDatabase(app);
export const onUser = cb => onAuthStateChanged(auth, u => u ? cb(u) : signInAnonymously(auth).catch(() => cb(null)));
const list = (p, extra = {}) => cb => onValue(ref(db, p), s => cb(Object.entries(s.val() || {}).map(([id, v]) => ({ id, ...extra, ...v }))));
export const watchItems = (u, cb) => list(`items/${u}`)(cb);
export const watchCourses = cb => list("courses", { type: "class" })(cb);
export const watchCfg = cb => onValue(ref(db, "config"), s => cb(s.val() || {}));
export const addItem = (u, x) => push(ref(db, `items/${u}`), { ...x, done: false });
export const patchItem = (u, id, x) => update(ref(db, `items/${u}/${id}`), x);
export const delItem = (u, id) => remove(ref(db, `items/${u}/${id}`));
export const setItem = (u, id, x) => set(ref(db, `items/${u}/${id}`), x);
export const getMe = async u => (await get(ref(db, `users/${u}`))).val() || {};
const flat = (o, p = "", out = {}) => { for (const [k, v] of Object.entries(o)) v && typeof v === "object" && !Array.isArray(v) ? flat(v, p + k + "/", out) : out[p + k] = v; return out; };
export const patchMe = (u, x) => update(ref(db, `users/${u}`), flat(x));
export const addToken = (u, t) => set(ref(db, `users/${u}/fcm/${t}`), true);
const OK = ["streak", "best", "lastDone", "lastNote", "prefs", "focus", "grades", "attend", "tgChatId"];
export const restore = (u, d) => { // impor disaring: hanya kolom yang dikenal
  const items = {}; for (const [id, x] of Object.entries(d.items || {})) if (x && ["task", "scholar"].includes(x.type) && typeof x.title === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(x.when || ""))
    items[id.replace(/[.$#\[\]\/]/g, "_").slice(0, 40)] = { type: x.type, title: x.title.slice(0, 120), course: String(x.course || "").slice(0, 80), when: x.when, weight: Math.min(3, Math.max(1, +x.weight || 1)), step: String(x.step || "").slice(0, 200), done: !!x.done };
  return update(ref(db), { [`items/${u}`]: Object.keys(items).length ? items : null, ...Object.fromEntries(OK.filter(k => d.me?.[k] !== undefined).map(k => [`users/${u}/${k}`, d.me[k]])) });
};
