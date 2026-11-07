// Vercel migration for browsers that still run the old Workbox service worker.
// This file is copied to /sw.js only in the Vercel static build.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const windows = await self.clients.matchAll({ type: "window" });
      await self.registration.unregister();
      await Promise.allSettled(
        windows.map((client) => client.navigate(client.url)),
      );
    })(),
  );
});
