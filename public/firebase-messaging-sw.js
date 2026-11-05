self.addEventListener("push", e => {
  const n = (e.data ? e.data.json() : {}).notification || {};
  e.waitUntil(self.registration.showNotification(n.title || "KampusPing", { body: n.body || "" }));
});
self.addEventListener("notificationclick", e => { e.notification.close(); e.waitUntil(clients.openWindow("/")); });
