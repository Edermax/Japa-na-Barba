const CACHE_NAME = "ogritech-shell-v3";
const APP_SHELL = [
  "./", "./index.html", "./login.html", "./cliente.html", "./style.css",
  "./auth.js", "./script.js", "./cliente.js", "./login.js", "./business-config.js",
  "./supabase-config.js", "./pwa.js", "./manifest.webmanifest",
  "./ogritech-brand-symbol.png", "./ogritech-favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((response) => response || caches.match("./login.html"))));
    return;
  }

  const destination = event.request.destination;
  const needsFreshCode = ["script", "style", "document"].includes(destination);

  if (needsFreshCode) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
