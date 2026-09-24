// Service worker para notificaciones push (recordatorios de registro diario).
self.addEventListener("push", (event) => {
  let data = { title: "NutriProgress", body: "Tienes una notificación nueva." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // ignore payloads no JSON
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "NutriProgress", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
