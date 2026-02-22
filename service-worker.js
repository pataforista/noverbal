const CACHE_NAME = "holaac-v2";
const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.json",
    "./library.json",
    "./assets/pictos/hola.png",
    "./assets/pictos/gracias.png",
    "./assets/pictos/por_favor.png",
    "./assets/pictos/si.png",
    "./assets/pictos/no.png",
    "./assets/pictos/quiero.png",
    "./assets/pictos/comer.png",
    "./assets/pictos/tomar.png",
    "./assets/pictos/baño.png",
    "./assets/pictos/contento.png",
    "./assets/pictos/triste.png",
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // Only handle GET requests
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then((networkResponse) => {
                // Cache local assets dynamically (pictos, audio, etc)
                if (event.request.url.includes("/assets/")) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                }

                // Cache external assets like fonts
                if (event.request.url.includes("fonts.gstatic.com") || event.request.url.includes("fonts.googleapis.com")) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                }
                return networkResponse;
            }).catch(() => {
                // Fallback for offline mode if asset is not in cache
                return caches.match("./index.html");
            });
        })
    );
});
