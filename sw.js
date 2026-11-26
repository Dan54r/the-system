// Service worker v4: receives urgent quests from the server and shows them as notifications.
// The quest is also saved, so the app finds it however it gets opened.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

async function saveQuest(q) {
  const cache = await caches.open("system-data");
  const body = JSON.stringify(q);
  const opts = { headers: { "Content-Type": "application/json" } };
  await cache.put("pending-urgent", new Response(body, opts));
  await cache.put("last-urgent", new Response(body, opts));
}

self.addEventListener("push", e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}
  const q = Object.assign({ t: "20 PUSH-UPS", xp: 20 }, data.quest || {});
  q.at = Date.now();
  if (!q.id) q.id = "push-" + q.at;

  e.waitUntil(Promise.all([
    saveQuest(q).then(async () => {
      // if the app is already open, tell it to pick the quest up now
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      wins.forEach(w => w.postMessage({ type: "check-urgent" }));
    }).catch(() => {}),
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
  const q = e.notification.data || {};
  const url = new URL("./?uq=" + encodeURIComponent(q.t || "") + "&xp=" + (q.xp || 20), self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (wins.length) {
      wins.forEach(w => w.postMessage({ type: "check-urgent" }));
      try { return await wins[0].focus(); } catch (_) {}
    }
    return self.clients.openWindow(url);
  })());
});
