// Service worker: makes the app installable, keeps the app shell for a
// fast start and shows a page when there is no connection. API calls and
// media go to the network only: conversations are never cached.
const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const SHELL_FILES = [OFFLINE_URL, "/manifest.json", "/favicon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Pages: always the latest version, the offline page without a connection.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Files of the offline page: the network first, the saved copy without it.
  if (SHELL_FILES.includes(url.pathname)) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Built files have a hash in the name, so a cached copy never goes stale.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(cache =>
        cache.match(request).then(
          cached =>
            cached ||
            fetch(request).then(response => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
        )
      )
    );
  }
});

// Notifications shown through the service worker (Android, installed app).
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data?.url || "/tickets";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
      const open = windows.find(client => client.url.startsWith(self.location.origin));
      if (open) {
        open.focus();
        return open.navigate(target);
      }
      return self.clients.openWindow(target);
    })
  );
});
