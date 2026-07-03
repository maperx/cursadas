// Minimal service worker: exists only to make the app installable (PWA).
// It deliberately does NOT cache anything, so the app is always served fresh
// from the network and there are no stale-content problems after deploys.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A registered fetch handler is required by browsers to consider the app
// installable. This one is a pass-through: requests go straight to the network.
self.addEventListener("fetch", () => {
  // no-op: default network handling
});
