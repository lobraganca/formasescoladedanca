// App da Área da Irene: permite instalar no celular e abrir mesmo sem internet (mostra a última cópia).
const CACHE = "formas-adm-v2";
const SHELL = ["/adm", "/adm-icon-192.png", "/adm.webmanifest"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate" && /^\/adm\/?$/.test(url.pathname)) {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("/adm", cp)); }
      return r;
    }).catch(() => caches.match("/adm")));
    return;
  }
  if (SHELL.includes(url.pathname)) e.respondWith(caches.match(url.pathname).then((m) => m || fetch(req)));
});

// Avisos no celular: novos contatos, fila de espera e pedidos do Camarim
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Formas", {
    body: d.body || "", icon: "/adm-icon-192.png", badge: "/adm-icon-192.png", tag: "formas-" + Date.now(),
    data: { url: d.url || "/adm" }, vibrate: [120, 60, 120],
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/adm";
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) if (new URL(c.url).pathname.startsWith("/adm")) { await c.focus(); try { await c.navigate(url); } catch {} return; }
    await self.clients.openWindow(url);
  })());
});
