// Dijalankan GitHub Actions tiap 5 menit. Hanya MENGIRIM laporan (Telegram + FCM).
import admin from "firebase-admin";
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)) });
const db = admin.firestore(), TG = process.env.TG_TOKEN, SITE = process.env.SITE_URL || "";
const H = 36e5, D = 24 * H, now = Date.now(), W = new Date(now + 7 * H), ymd = W.toISOString().slice(0, 10);
const hm = W.getUTCHours() * 60 + W.getUTCMinutes();
if (hm >= 22 * 60 || hm < 5 * 60) process.exit(0); // jam tenang 22:00-05:00 WIB
const left = t => t >= D ? `${Math.round(t / D)} hari` : t >= H ? `${Math.round(t / H)} jam` : `${Math.round(t / 6e4)} menit`;
async function send(u, title, body) {
  if (u.tgChatId && TG) await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: u.tgChatId, text: `${title}\n${body}${SITE ? "\n" + SITE : ""}` }) }).catch(console.error);
  if (u.fcmTokens?.length) await admin.messaging().sendEachForMulticast({ tokens: u.fcmTokens, notification: { title, body }, webpush: { headers: { Urgency: "high" } } }).catch(console.error);
}
for (const ud of (await db.collection("users").get()).docs) {
  const u = ud.data(), sent = u.sent || {}, msgs = [], mark = {};
  if (!(u.tgChatId && TG) && !u.fcmTokens?.length) continue; // belum ada jalur kirim: jangan tandai terkirim
  const P = u.prefs || {};
  const docs = (await ud.ref.collection("items").where("done", "==", false).get()).docs;
  for (const d of docs) {
    const x = d.data(), s = x.sent || {}, upd = {};
    if (P[x.type] === false) continue;
    if (x.type === "class" && x.day === W.getUTCDay()) {
      const [h, m] = x.time.split(":").map(Number), st = Date.UTC(W.getUTCFullYear(), W.getUTCMonth(), W.getUTCDate(), h, m) - 7 * H, k = "c" + ymd;
      if (now >= st - 30 * 6e4 && now < st && !s[k]) { msgs.push([`📚 Kuliah ${left(st - now)} lagi`, `${x.title}${x.room ? " di " + x.room : ""}`]); upd["sent." + k] = true; }
    }
    if (x.type === "task" || x.type === "scholar") {
      const dl = Date.parse(x.when + ":00+07:00"), t = dl - now, o = x.type === "task" ? [3 * H, D, 3 * D, 7 * D] : [D, 3 * D, 7 * D, 14 * D];
      const i = t > 0 ? o.findIndex(v => t <= v) : -1;
      if (i >= 0 && !s["o" + i]) { for (let j = i; j < o.length; j++) upd["sent.o" + j] = true;
        msgs.push([`${x.type === "task" ? "📝 Tugas" : "🎓 Beasiswa"} tinggal ${left(t)}`, x.title + (x.step ? `\nBerikutnya: ${x.step}` : "")]); }
    }
    if (Object.keys(upd).length) await d.ref.update(upd);
  }
  const cls = docs.map(d => d.data()).filter(x => x.type === "class" && x.day === W.getUTCDay()).sort((a, b) => a.time.localeCompare(b.time));
  if (P.report !== false && hm >= 390 && hm < 420 && !sent["m" + ymd]) { msgs.push(["☀️ Ringkasan pagi", `${cls.length} kelas hari ini${cls[0] ? `, pertama ${cls[0].time} ${cls[0].title}` : ""}\nStreak: ${u.streak || 0} hari`]); mark["m" + ymd] = true; }
  if (P.report !== false && hm >= 1260 && !sent["n" + ymd]) { msgs.push(u.lastDone === ymd ? ["✅ Aksi hari ini selesai", `Streak ${u.streak || 0} hari. Catatan: ${u.lastNote || "-"}`] : ["⚠️ Belum ada aksi hari ini", `Streak ${u.streak || 0} hari terancam putus. Buka web dan mulai 10 menit.`]); mark["n" + ymd] = true; }
  for (const [t, b] of msgs) await send(u, t, b);
  if (Object.keys(mark).length) await ud.ref.set({ sent: mark }, { merge: true });
}
