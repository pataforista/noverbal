const CACHE_NAME = "holaac-v3";
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
                // Only cache successful responses (avoid storing 404s)
                if (networkResponse && networkResponse.ok) {
                    const url = event.request.url;
                    const cacheable = url.includes("/assets/")
                        || url.includes("fonts.gstatic.com")
                        || url.includes("fonts.googleapis.com");
                    if (cacheable) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                    }
                }
                return networkResponse;
            }).catch(() => {
                // Offline fallback: only serve the app shell for navigations.
                // Other requests (audio, images) fail cleanly so the app can
                // use its own fallbacks (e.g. TTS instead of a missing clip).
                if (event.request.mode === "navigate") {
                    return caches.match("./index.html");
                }
                return Response.error();
            });
        })
    );
});
