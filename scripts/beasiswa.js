// Dijalankan GitHub Actions: tiap pagi 05:30 WIB dan setiap push (deploy). Menulis ke Realtime Database: scholarships + scholarMeta.
import fs from "fs";
import crypto from "crypto";
import { collect, defaultSources } from "./beasiswa-lib.js";
const DRY = !!process.env.DRY_RUN, today = process.env.TODAY || new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
let db = null;
if (!DRY) { const admin = (await import("firebase-admin")).default; admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)), databaseURL: process.env.DB_URL }); db = admin.database(); }
const val = async p => db ? (await db.ref(p).once("value")).val() : null;
const cfg = (await val("config")) || {}, hidden = cfg.scholarHidden || {}, old = (await val("scholarships")) || {};
const extra = String(cfg.scholarSources || "").split(/\s+/).filter(u => /^https?:\/\//.test(u)).map(url => ({ name: new URL(url).hostname.replace(/^www\./, ""), url }));
const fx = process.env.FIXTURES ? JSON.parse(fs.readFileSync(process.env.FIXTURES, "utf8")) : null;
const get = async url => {
  if (fx) { if (!(url in fx)) throw new Error("404"); return fx[url]; }
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; KampusPingBot/1.0)", accept: "text/html,application/rss+xml,application/xml,*/*" }, signal: AbortSignal.timeout(15000), redirect: "follow" });
  if (!r.ok) throw new Error("HTTP " + r.status); return (await r.text()).slice(0, 600000);
};
const { entries, status } = await collect({ sources: [...defaultSources(+today.slice(0, 4)), ...extra], get, today, log: console.log });
const id = u => crypto.createHash("sha1").update(u).digest("hex").slice(0, 12), map = {};
for (const [k, o] of Object.entries(old)) if (!hidden[k] && (o.d ? o.d >= today : o.f > Date.now() - 30 * 864e5)) map[k] = o; // simpan yang lama selama masih aktif
for (const e of entries) { const k = id(e.u); if (!hidden[k]) map[k] = { ...e, f: Date.now() }; }
const meta = { updated: Date.now(), sources: Object.fromEntries(Object.entries(status).map(([n, s]) => [n.replace(/[.$#[\]/]/g, "_"), s])) };
console.log(`Hasil: ${entries.length} baru, ${Object.keys(map).length} aktif tersimpan`);
if (DRY) console.log(JSON.stringify({ map, meta }, null, 1));
else { await db.ref("scholarships").set(Object.keys(map).length ? map : null); await db.ref("scholarMeta").set(meta); }
process.exit(Object.values(status).some(s => s.ok) ? 0 : 1);
