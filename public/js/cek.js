// Pemeriksaan mandiri: konfigurasi, browser, login anonim, jangkauan database, WebSocket, pembacaan data, dan CSP.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, enableLogging } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { esc, fbCfg } from "./util.js";
const out = document.querySelector("#out"), st = document.querySelector("#st"), rows = [], blocked = [], res = {}, logs = [];
document.addEventListener("securitypolicyviolation", e => blocked.push(`${e.violatedDirective}: ${e.blockedURI}`));
const add = (n, ok, d = "", k = "") => { if (k) res[k] = ok; rows.push([n, ok, d]); out.innerHTML = rows.map(([t, o, x]) => `<div class="item"><span class="badge ${o ? "ok" : "bad"}">${o ? "OK" : "GAGAL"}</span><div class="grow"><b>${esc(t)}</b><small>${esc(x)}</small></div></div>`).join(""); };
const lim = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r({ code: "timeout", message: "Tidak ada respons dalam " + ms / 1000 + " detik." }), ms))]);
const er = e => `${e.code || "error"}: ${(e.message || "").slice(0, 140)}`;
const miss = ["apiKey", "authDomain", "projectId", "appId", "databaseURL"].filter(k => !firebaseConfig[k]);
add("Konfigurasi Firebase", !miss.length, miss.length ? "Belum terisi: " + miss.join(", ") : "Semua kolom penting terisi");
let ls = false; try { localStorage.setItem("kp-t", "1"); ls = localStorage.getItem("kp-t") === "1"; localStorage.removeItem("kp-t"); } catch { /* diblokir */ }
const inapp = /FBAN|FBAV|Instagram|Line\/|Telegram|; wv\)/i.test(navigator.userAgent);
add("Browser", navigator.onLine && ls && !!window.indexedDB, `${navigator.onLine ? "online" : "OFFLINE"} · penyimpanan ${ls ? "ok" : "DIBLOKIR"} · indexedDB ${window.indexedDB ? "ok" : "tidak ada"}${inapp ? " · browser dalam aplikasi (sebaiknya buka di Chrome/Safari)" : ""}`);
const cfg = fbCfg(firebaseConfig), key = (() => { try { return localStorage.getItem("kp-key") || ""; } catch { return ""; } })(), okKey = /^[A-Za-z0-9]{20,64}$/.test(key); let host = ""; try { host = new URL(cfg.databaseURL).host; } catch { /* tidak valid */ }
add("Alamat database", /(firebasedatabase\.app|firebaseio\.com)$/.test(host), host || "databaseURL kosong atau tidak valid");
if (host) {
  try { const r = await lim(fetch(`https://${host}/.json?shallow=true`, { cache: "no-store" }), 10000);
    add("Database terjangkau (HTTP)", [200, 401, 403].includes(r.status), r.status === 404 ? "404: tidak ada database di alamat ini. Buat Realtime Database atau samakan databaseURL dan wilayahnya dengan yang tertulis di Firebase Console." : r.status === 200 ? "Database ada dan menjawab" : r.status === 401 || r.status === 403 ? `Status ${r.status}: database ada dan menjawab (aturan menolak akses anonim ke root, itu normal)` : `Status ${r.status}`, "rest"); }
  catch (e) { add("Database terjangkau (HTTP)", false, e.code === "timeout" ? e.message : "Tidak terjangkau dari jaringan atau browser ini: alamat salah, atau diblokir jaringan/ekstensi.", "rest"); }
  const ws = await new Promise(done => { let d = false; const fin = v => { if (!d) { d = true; done(v); } };
    try { const s = new WebSocket(`wss://${host}/.ws?v=5&ns=${host.split(".")[0]}`); s.onopen = () => { fin(true); s.close(); }; s.onerror = () => fin(false); s.onclose = () => fin(false); setTimeout(() => fin(false), 6000); } catch { fin(false); } });
  const rq = async (m, p, body) => { try { return (await lim(fetch(`https://${host}/${p}.json`, { method: m, body, cache: "no-store" }), 10000)).status; } catch (e) { return e.code === "timeout" ? "timeout" : "error"; } };
  const rc = await rq("GET", "config");
  add("Aturan: config bisa dibaca publik", rc === 200, rc === 200 ? "Aturan baru aktif" : rc === 401 ? "401: aturan lama masih aktif. Jalankan: firebase deploy --only database" : "Status " + rc, "rules");
  if (okKey) { const wr = await rq("PUT", `users/${key}/focus/2000-01-01`, "0"); add("Aturan: tulis data pribadi", wr === 200, wr === 200 ? "Penulisan diizinkan" : wr === 401 ? "401: ditolak aturan. Deploy aturan terbaru: firebase deploy --only database" : "Status " + wr, "wr"); if (wr === 200) await rq("DELETE", `users/${key}/focus/2000-01-01`); }
  add("WebSocket ke database", ws, ws ? "Tersambung" : "Gagal atau lambat. Aplikasi jatuh ke long-polling (bisa lambat sampai sekitar 30 detik). Jaringan, ISP, atau ekstensi mungkin memblokir WebSocket.", "ws");
}
if (!miss.length) {
  enableLogging(m => { logs.push(String(m)); });
  const db = getDatabase(initializeApp(cfg, "cek")), paths = [["config", "config"], ["courses", "courses"]];
  if (okKey) paths.push(["data kamu", "users/" + key]);
  st.textContent = "Menguji pembacaan database (maksimal 40 detik)...";
  await Promise.all(paths.map(async ([n, p]) => {
    const t0 = Date.now();
    try { await lim(get(ref(db, p)), 40000); add("Database: baca " + n, true, `Terbaca dalam ${Math.round((Date.now() - t0) / 1000)} detik`, "read"); }
    catch (e) { add("Database: baca " + n, false, er(e) + (/permission/i.test(er(e)) ? " → deploy aturan: firebase deploy --only database" : ""), "read"); }
  }));
  if (rows.some(([n, o]) => n.startsWith("Database: baca") && !o)) add("Log SDK database", false, logs.slice(-6).join(" | ").slice(0, 700) || "(kosong)");
}
await new Promise(r => setTimeout(r, 500));
add("Pemblokiran keamanan (CSP)", !blocked.length, blocked.length ? blocked.slice(0, 5).join(" | ") : "Tidak ada permintaan yang diblokir");
st.textContent = res.rules === false ? "Kesimpulan: aturan database lama masih aktif. Jalankan: firebase deploy --only database (lalu muat ulang halaman ini)."
  : res.wr === false ? "Kesimpulan: aturan database menolak penulisan data pribadi. Deploy ulang aturan terbaru: firebase deploy --only database."
  : res.rest === false ? "Kesimpulan: database tidak ditemukan atau tidak terjangkau. Periksa URL di Firebase Console, Realtime Database, lalu samakan dengan databaseURL."
  : res.ws === false ? "Kesimpulan: WebSocket diblokir. Coba jaringan atau HP lain, dan matikan ekstensi pemblokir."
  : res.read === false ? "Kesimpulan: SDK realtime tidak menerima data (web utama tetap berjalan lewat HTTP, dasbor admin memakai SDK dan mungkin terpengaruh). Lihat baris Log SDK."
  : Object.values(res).every(Boolean) && !blocked.length ? "Kesimpulan: semua pemeriksaan lolos." : "Kesimpulan: lihat baris yang GAGAL di atas.";
