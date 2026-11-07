// Pemeriksaan mandiri: konfigurasi, browser, login anonim, database, dan pemblokiran CSP.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { initializeAuth, inMemoryPersistence, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { esc, fbCfg } from "./util.js";
const out = document.querySelector("#out"), rows = [], blocked = [];
document.addEventListener("securitypolicyviolation", e => blocked.push(`${e.violatedDirective}: ${e.blockedURI}`));
const add = (n, ok, d = "") => { rows.push([n, ok, d]); out.innerHTML = rows.map(([t, o, x]) => `<div class="item"><span class="badge ${o ? "ok" : "bad"}">${o ? "OK" : "GAGAL"}</span><div class="grow"><b>${esc(t)}</b><small>${esc(x)}</small></div></div>`).join(""); };
const lim = (p, ms = 8000) => Promise.race([p, new Promise((_, r) => setTimeout(() => r({ code: "timeout", message: "Tidak ada respons. Periksa databaseURL dan wilayah database." }), ms))]);
const er = e => `${e.code || "error"}: ${(e.message || "").slice(0, 140)}`;
const miss = ["apiKey", "authDomain", "projectId", "appId", "databaseURL"].filter(k => !firebaseConfig[k]);
add("Konfigurasi Firebase", !miss.length, miss.length ? "Belum terisi: " + miss.join(", ") : "Semua kolom penting terisi");
let ls = false; try { localStorage.setItem("kp-t", "1"); ls = localStorage.getItem("kp-t") === "1"; localStorage.removeItem("kp-t"); } catch { /* diblokir */ }
const inapp = /FBAN|FBAV|Instagram|Line\/|Telegram|; wv\)/i.test(navigator.userAgent);
add("Browser", navigator.onLine && ls && !!window.indexedDB, `${navigator.onLine ? "online" : "OFFLINE"} · penyimpanan ${ls ? "ok" : "DIBLOKIR"} · indexedDB ${window.indexedDB ? "ok" : "tidak ada"}${inapp ? " · browser dalam aplikasi (sebaiknya buka di Chrome/Safari)" : ""}`);
if (!miss.length) {
  const app = initializeApp(fbCfg(firebaseConfig), "cek"), auth = initializeAuth(app, { persistence: [inMemoryPersistence] }), db = getDatabase(app);
  try { await lim(signInAnonymously(auth)); add("Login anonim", true, "Berhasil, UID " + (auth.currentUser?.uid || "").slice(0, 6) + "…"); }
  catch (e) { add("Login anonim", false, er(e) + (e.code === "auth/operation-not-allowed" ? " → aktifkan Anonymous di Authentication" : /blocked/.test(e.code || "") ? " → cek pembatasan API key" : "")); }
  if (auth.currentUser) for (const [n, p] of [["Baca config", "config"], ["Baca courses", "courses"], ["Baca data pengguna", "users/" + auth.currentUser.uid]]) {
    try { await lim(get(ref(db, p))); add("Database: " + n, true, "Terbaca"); }
    catch (e) { add("Database: " + n, false, er(e) + (/permission/i.test(er(e)) ? " → deploy aturan: firebase deploy --only database" : "")); }
  }
}
await new Promise(r => setTimeout(r, 600));
add("Pemblokiran keamanan (CSP)", !blocked.length, blocked.length ? blocked.slice(0, 5).join(" | ") : "Tidak ada permintaan yang diblokir");
