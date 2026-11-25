// Service worker: receives urgent quests from the server and shows them as notifications.
// The quest is also saved, so the app finds it however it gets opened.
const PENDING = "pending-urgent";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

async function savePending(q) {
  const cache = await caches.open("system-data");
  await cache.put(PENDING, new Response(JSON.stringify(Object.assign({}, q, { at: Date.now() })),
    { headers: { "Content-Type": "application/json" } }));
}

self.addEventListener("push", e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}
  const q = data.quest || { t: "50 PUSH-UPS", xp: 30 };
  e.waitUntil(Promise.all([
    savePending(q).then(async () => {
      // if the app is already open, tell it to pick the quest up now
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      wins.forEach(w => w.postMessage({ type: "check-urgent" }));
    }),
    self.registration.showNotification("⚠ URGENT QUEST", {
      body: q.t + "  ·  +" + q.xp + " EXP\nTap to accept. Time limit: midnight.",
      icon: "icon-512.png",
      tag: "urgent-quest",
      data: q
    })
  ]));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (wins.length) {
      wins[0].postMessage({ type: "check-urgent" });
      try { return await wins[0].focus(); } catch (_) {}
    }
    return self.clients.openWindow(self.registration.scope);
  })());
});
