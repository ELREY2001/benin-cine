/* Bénin Ciné, service worker (hors-ligne)
   Stratégie : réseau d'abord pour les pages, cache d'abord pour les assets. */
const VERSION = "bc-v1";
const ASSETS = [
  "./", "index.html", "browse.html", "title.html", "watch.html", "plans.html",
  "studio.html", "about.html", "auth.html", "account.html", "admin.html",
  "manifest.webmanifest",
  "assets/css/app.css",
  "assets/js/core.js", "assets/js/home.js", "assets/js/browse.js", "assets/js/title.js",
  "assets/js/watch.js", "assets/js/plans.js", "assets/js/studio.js", "assets/js/about.js",
  "assets/js/auth.js", "assets/js/account.js", "assets/js/admin.js",
  "assets/brand/logo-96.png", "assets/brand/logo-256.png", "assets/brand/logo-512.png",
  "assets/brand/apple-touch-icon.png", "assets/brand/favicon.ico", "assets/brand/og-image.jpg",
  "assets/img/hero.jpg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
      return r;
    }).catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(resp => {
    const copy = resp.clone();
    caches.open(VERSION).then(c => c.put(req, copy));
    return resp;
  })));
});
