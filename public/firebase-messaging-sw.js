// Service worker: notifikasi push + halaman offline + cache cadangan (jaringan dulu).
const V = "kp-v14";
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => Promise.all(["offline.html", "css/style.css", "icons/icon-192.png"].map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== self.location.origin) return; // hanya berkas web ini; data Firebase tidak disentuh
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then(m => m || (r.mode === "navigate" ? caches.match("offline.html") : Response.error()))));
});
self.addEventListener("push", e => {
  let n = {}; try { n = (e.data ? e.data.json() : {}).notification || {}; } catch { /* payload bukan JSON */ }
  e.waitUntil(self.registration.showNotification(n.title || "KampusPing", { body: n.body || "", icon: "icons/icon-192.png", requireInteraction: true, vibrate: [400, 200, 400, 200, 800], tag: "kp" + Date.now() }));
});
self.addEventListener("notificationclick", e => { e.notification.close(); e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => (l.length ? l[0].focus() : clients.openWindow("/")))); });
