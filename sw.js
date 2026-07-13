const CACHE_NAME = "camp-turnier-v2";
const SHELL_FILES = [
  "index.html",
  "manage.html",
  "live.html",
  "css/styles.css",
  "js/app.js",
  "js/manage.js",
  "js/live.js",
  "js/tournament-engine.js",
  "js/csv-parser.js",
  "js/firebase-sync.js",
  "firebase-config.js",
  "manifest.json",
  "icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first: immer die aktuelle Version laden, wenn online. Der Cache dient
// nur als Fallback für Offline-Nutzung (nicht um veraltetes JS auszuliefern).
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // Firebase-Requests unangetastet lassen

  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resp.clone()));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
