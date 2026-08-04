/* 21天 Service Worker：接收手机推送 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* ignore */
  }
  const options = {
    body: data.body || "该打卡啦！",
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    data: { url: data.url || self.registration.scope },
  };
  event.waitUntil(self.registration.showNotification(data.title || "21天提醒", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
