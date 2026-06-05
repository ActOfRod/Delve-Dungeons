/**
 * Minimal service worker for PWA install eligibility.
 * Online-only: we do NOT intercept network requests (no respondWith).
 * Intercepting navigations caused "Failed to fetch" when fetch rejected.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener present for install criteria; browser handles all fetches normally.
self.addEventListener("fetch", () => {});
