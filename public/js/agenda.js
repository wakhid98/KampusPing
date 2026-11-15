// Logika murni (tanpa DOM) yang dipakai web dan scripts/notify.js.
const pad = n => String(n).padStart(2, "0");
export const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const addDays = (s, n) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };

// Apakah agenda x (type "event") terjadi pada tanggal ds (YYYY-MM-DD)?
export function occurs(x, ds) {
  const s = String(x.when || "").slice(0, 10); if (!s || ds < s) return false;
  if (ds === s) return true;
  const a = new Date(s + "T00:00:00Z"), b = new Date(ds + "T00:00:00Z");
  switch (x.repeat) {
    case "daily": return true;
    case "weekly": return a.getUTCDay() === b.getUTCDay();
    case "monthly": return a.getUTCDate() === b.getUTCDate();
    case "yearly": return a.getUTCDate() === b.getUTCDate() && a.getUTCMonth() === b.getUTCMonth();
    default: return false;
  }
}
export const evTime = x => x.allDay ? "" : String(x.when || "").slice(11, 16);
// Waktu mulai (ms) agenda pada tanggal ds. Agenda seharian dihitung pukul 08:00 WIB.
export const evStart = (x, ds) => Date.parse(`${ds}T${x.allDay ? "08:00" : evTime(x) || "08:00"}:00+07:00`);
export const eventsOn = (items, ds) => items.filter(x => x.type === "event" && occurs(x, ds)).sort((a, b) => (evTime(a) || "").localeCompare(evTime(b) || ""));

// Jadwal kuliah efektif untuk satu pengguna: jadwal admin (dengan perubahan pribadi) + kelas buatan sendiri.
// me.co[id] = perubahan atas kelas admin (atau { hide: true }); me.cx[id] = kelas buatan pengguna.
export function effCourses(courses, me, sem) {
  const co = me?.co || {}, cx = me?.cx || {};
  const base = courses.filter(x => !sem || x.sem === sem)
    .map(x => co[x.id] ? { ...x, ...co[x.id], id: x.id, base: true, mod: true } : { ...x, base: true }).filter(x => !x.hide);
  const own = Object.entries(cx).filter(([, x]) => x && (!sem || !x.sem || x.sem === sem)).map(([id, x]) => ({ ...x, id, type: "class", own: true }));
  return [...base, ...own];
}
