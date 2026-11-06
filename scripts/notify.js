// GitHub Actions tiap 5 menit. Membaca Realtime Database, mengirim Telegram + FCM.
import admin from "firebase-admin";
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)), databaseURL: process.env.DB_URL });
const db = admin.database(), TG = process.env.TG_TOKEN, SITE = process.env.SITE_URL || "";
const val = async p => (await db.ref(p).once("value")).val();
const H = 36e5, D = 24 * H, now = Date.now(), W = new Date(now + 7 * H), ymd = W.toISOString().slice(0, 10), hm = W.getUTCHours() * 60 + W.getUTCMinutes();
const cfg = (await val("config")) || {}, courses = Object.entries((await val("courses")) || {}).map(([id, x]) => ({ id, ...x }));
if (hm >= (cfg.quietStart ?? 22) * 60 || hm < (cfg.quietEnd ?? 5) * 60) process.exit(0); // jam tenang (atur admin)
const left = t => t >= D ? `${Math.round(t / D)} hari` : t >= H ? `${Math.round(t / H)} jam` : `${Math.round(t / 6e4)} menit`;
async function send(uid, u, title, body) {
  const tokens = Object.keys(u.fcm || {});
  if (u.tgChatId && TG) await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: u.tgChatId, text: `${title}\n${body}${SITE ? "\n" + SITE : ""}` }) }).catch(console.error);
  if (tokens.length) {
    const r = await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body }, webpush: { headers: { Urgency: "high" } } }).catch(console.error);
    r?.responses.forEach((x, i) => { if (!x.success && /not-registered|invalid-registration/.test(x.error?.code || "")) db.ref(`users/${uid}/fcm/${tokens[i]}`).remove(); });
  }
}
const users = (await val("users")) || {}, all = (await val("items")) || {};
for (const [uid, u] of Object.entries(users)) {
  const sent = u.sent || {}, msgs = [], mark = {}, P = u.prefs || {};
  if (!(u.tgChatId && TG) && !Object.keys(u.fcm || {}).length) continue; // belum ada jalur kirim: jangan tandai terkirim
  if (P.class !== false) for (const x of courses) if (x.day === W.getUTCDay()) {
    const [h, m] = x.time.split(":").map(Number), st = Date.UTC(W.getUTCFullYear(), W.getUTCMonth(), W.getUTCDate(), h, m) - 7 * H, k = "c" + x.id + ymd;
    if (now >= st - 30 * 6e4 && now < st && !sent[k]) { msgs.push([`📚 Kuliah ${left(st - now)} lagi`, `${x.title}${x.room ? " di " + x.room : ""}${x.lecturer ? " · " + x.lecturer : ""}`]); mark[k] = true; }
  }
  for (const [id, x] of Object.entries(all[uid] || {})) {
    if (x.done || x.type === "class" || P[x.type] === false) continue;
    const s = x.sent || {}, upd = {};
    if (x.type === "task" || x.type === "scholar") {
      const t = Date.parse(x.when + ":00+07:00") - now, o = x.type === "task" ? [3 * H, D, 3 * D, 7 * D] : [D, 3 * D, 7 * D, 14 * D], i = t > 0 ? o.findIndex(v => t <= v) : -1;
      if (i >= 0 && !s["o" + i]) { for (let j = i; j < o.length; j++) upd["o" + j] = true;
        msgs.push([`${x.type === "task" ? "📝 Tugas" : "🎓 Beasiswa"} tinggal ${left(t)}`, x.title + (x.step ? `\nBerikutnya: ${x.step}` : "")]); }
    }
    if (Object.keys(upd).length) await db.ref(`items/${uid}/${id}/sent`).update(upd);
  }
  const cls = courses.filter(x => x.day === W.getUTCDay()).sort((a, b) => a.time.localeCompare(b.time));
  if (P.report !== false && hm >= 390 && hm < 420 && !sent["m" + ymd]) { msgs.push(["☀️ Ringkasan pagi", `${cls.length} kelas hari ini${cls[0] ? `, pertama ${cls[0].time} ${cls[0].title}` : ""}\nStreak: ${u.streak || 0} hari`]); mark["m" + ymd] = true; }
  if (P.report !== false && hm >= 1260 && !sent["n" + ymd]) { msgs.push(u.lastDone === ymd ? ["✅ Aksi hari ini selesai", `Streak ${u.streak || 0} hari. Catatan: ${u.lastNote || "-"}`] : ["⚠️ Belum ada aksi hari ini", `Streak ${u.streak || 0} hari terancam putus. Buka web dan mulai.`]); mark["n" + ymd] = true; }
  let ann = false;
  if (cfg.announce?.text && u.annId !== cfg.announce.id) { msgs.push(["📢 Pengumuman", cfg.announce.text]); ann = true; }
  for (const [t, b] of msgs) await send(uid, u, t, b);
  if (Object.keys(mark).length) await db.ref(`users/${uid}/sent`).update(mark);
  if (ann) await db.ref(`users/${uid}/annId`).set(cfg.announce.id);
}
process.exit(0);
