// The deploy workflow (.github/workflows) replaces __BUILD_VERSION__ with the
// commit short hash, so every deploy gets a fresh cache automatically — no more
// hand-bumping a version on each release (P2-16). In local dev the token stays
// as-is and we fall back to a stable "dev" cache name.
const VERSION = "__BUILD_VERSION__";
const CACHE_NAME = /__BUILD_VERSION__/.test(VERSION) ? "holaac-dev" : `holaac-${VERSION}`;

// Essential app shell — must all cache for the app to work offline. Self-hosted
// font included so the SW install no longer depends on Google Fonts (P1-14).
const SHELL = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.json",
    "./library.json",
    "./assets/fonts/plus-jakarta-sans.css",
    "./assets/fonts/plus-jakarta-sans-latin.woff2",
    "./assets/fonts/plus-jakarta-sans-latin-ext.woff2",
];

// Nice-to-have on first run, but a missing file must NOT abort the install.
const CORE_PICTOS = [
    "./assets/pictos/hola.png",
    "./assets/pictos/gracias.png",
    "./assets/pictos/por_favor.png",
    "./assets/pictos/si.png",
    "./assets/pictos/no.png",
    "./assets/pictos/quiero.png",
    "./assets/pictos/comer.png",
    "./assets/pictos/tomar.png",
    "./assets/pictos/bano.png",
    "./assets/pictos/contento.png",
    "./assets/pictos/triste.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // The shell must succeed; if any single asset fails, retry it best-effort
        // so one hiccup can't leave the app permanently un-installable.
        try {
            await cache.addAll(SHELL);
        } catch (err) {
            await Promise.allSettled(SHELL.map((url) => cache.add(url)));
        }
        // Core pictos are best-effort: never let a 404 fail the whole install.
        await Promise.allSettled(CORE_PICTOS.map((url) => cache.add(url)));
    })());
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

self.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "SKIP_WAITING") {
        self.skipWaiting();
        return;
    }
    // "Descargar todo para uso sin conexión": the page sends the full list of
    // picto/audio URLs (derived from library.json) and we cache them all,
    // reporting progress back so the UI can show a bar (P1-13).
    if (data.type === "PRECACHE_ALL" && Array.isArray(data.urls)) {
        event.waitUntil(precacheAll(data.urls, event.source));
    }
});

async function precacheAll(urls, client) {
    const cache = await caches.open(CACHE_NAME);
    let done = 0;
    const total = urls.length;
    // Cache in small batches to avoid hammering the network / hitting limits.
    const BATCH = 8;
    for (let i = 0; i < urls.length; i += BATCH) {
        const batch = urls.slice(i, i + BATCH);
        await Promise.allSettled(batch.map(async (url) => {
            try {
                const existing = await cache.match(url);
                if (!existing) {
                    const res = await fetch(url, { cache: "no-cache" });
                    if (res && res.ok) await cache.put(url, res.clone());
                }
            } finally {
                done += 1;
            }
        }));
        if (client) client.postMessage({ type: "PRECACHE_PROGRESS", done, total });
    }
    if (client) client.postMessage({ type: "PRECACHE_DONE", done, total });
}

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
                const cacheable = url.includes("/assets/");
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

    // App code/config is network-first EXCEPT the self-hosted font CSS, which is a
    // static asset that should stay cache-first for offline reliability.
    const isFontCss = /\/assets\/fonts\//.test(url.pathname);

    if (!isFontCss && (request.mode === "navigate" || isAppCode)) {
        event.respondWith(networkFirst(request));
    } else {
        event.respondWith(cacheFirst(request));
    }
});
