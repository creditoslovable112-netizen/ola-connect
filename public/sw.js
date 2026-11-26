/* NEXUS FINANCE service worker: push display only; no app-shell caching. */
self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try { payload = event.data.json(); }
    catch { payload = { body: event.data.text() }; }
  }

  const title = typeof payload.title === "string" && payload.title.trim()
    ? payload.title.trim()
    : "NEXUS FINANCE";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "Você tem uma atualização financeira.",
    icon: "/nexus-mark.webp",
    badge: "/nexus-mark.webp",
    tag: typeof payload.tag === "string" ? payload.tag : "nexus-finance",
    renotify: false,
    data: { url: typeof payload.url === "string" ? payload.url : "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    let target = new URL("/", self.location.origin);
    try {
      const candidate = new URL(event.notification.data?.url || "/", self.location.origin);
      if (candidate.origin === self.location.origin) target = candidate;
    } catch { /* Keep the safe app-home fallback. */ }

    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client && client.url !== target.href) await client.navigate(target.href);
        return;
      }
    }
    await self.clients.openWindow(target.href);
  })());
});
