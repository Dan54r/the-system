// Service worker: receives urgent quests from the server and shows them as notifications.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}
  const q = data.quest || { t: "50 PUSH-UPS", xp: 30 };
  e.waitUntil(self.registration.showNotification("⚠ URGENT QUEST", {
    body: q.t + "  ·  +" + q.xp + " EXP\nTap to accept. Time limit: midnight.",
    icon: "icon-512.png",
    tag: "urgent-quest",
    data: q
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const q = e.notification.data || {};
  const url = new URL("./?uq=" + encodeURIComponent(q.t || "") + "&xp=" + (q.xp || 30) +
    (q.note ? "&note=" + encodeURIComponent(q.note) : ""), self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (wins.length) {
      wins[0].postMessage({ type: "urgent", quest: q });
      return wins[0].focus();
    }
    return self.clients.openWindow(url);
  })());
});
