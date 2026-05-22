// Bump VERSION on every release. This both invalidates the old cache and
// guarantees the browser sees new bytes for this file, triggering an update.
const VERSION = "v4";
const CACHE_NAME = `holaac-${VERSION}`;

// App shell precached on install so the app works offline from the first run.
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
    // Activate this version immediately instead of waiting for all tabs to close.
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))
        )).then(() => self.clients.claim())
    );
});

// Let the page ask a waiting worker to activate right away.
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

// Network-first: always try the network, fall back to cache when offline.
// Used for app code/config so a new deploy reaches users as soon as they reload.
function networkFirst(request) {
    return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
    }).catch(() => caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
    }));
}

// Cache-first: serve from cache, fetch and store on a miss.
// Used for heavy, rarely-changing assets (pictos, audio, fonts) so the app
// stays fast and fully usable offline.
function cacheFirst(request) {
    return caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
                const url = request.url;
                const cacheable = url.includes("/assets/")
                    || url.includes("fonts.gstatic.com")
                    || url.includes("fonts.googleapis.com");
                if (cacheable) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
            }
            return networkResponse;
        }).catch(() => {
            if (request.mode === "navigate") return caches.match("./index.html");
            return Response.error();
        });
    });
}

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const request = event.request;
    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;
    const isAppCode = sameOrigin && /\.(?:html|js|css|json)$/.test(url.pathname);

    if (request.mode === "navigate" || isAppCode) {
        event.respondWith(networkFirst(request));
    } else {
        event.respondWith(cacheFirst(request));
    }
});
