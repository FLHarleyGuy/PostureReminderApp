// sw.js — Posture Check PWA Service Worker
// Handles: caching, background notification scheduling, notification click

const CACHE_NAME = 'posture-app-v3';
const ASSETS = [
  './',
  './index.html',
  './about.html',
  './how-to-use.html',
  './tips.json',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── INSTALL ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .catch(() => {}) // don't block install on icon missing
  );
  self.skipWaiting();
});

// ── ACTIVATE ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

// ── BACKGROUND NOTIFICATION SCHEDULING ───────────────────────────────────────
// When the main app is backgrounded, it messages the SW with a scheduled time.
// The SW holds the timeout so Android doesn't throttle the main-thread timer.

let scheduledTimeout = null;

const CAT_TITLES = {
  seated:   'Posture check',
  stretch:  'Stretch break',
  movement: 'Time to move',
  eyes:     'Eyes & tension',
};

self.addEventListener('message', (e) => {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE') {
    // Cancel any existing scheduled notification
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      scheduledTimeout = null;
    }

    const delay = Math.max(0, e.data.fireAt - Date.now());
    const tip   = e.data.tip;

    scheduledTimeout = setTimeout(async () => {
      scheduledTimeout = null;

      // Fire the notification
      await self.registration.showNotification(CAT_TITLES[tip.category] || 'Posture check', {
        body:      tip.tip,
        icon:      './icons/icon-192.png',
        badge:     './icons/icon-192.png',
        tag:       'posture-reminder',
        renotify:  true,
        data:      { tipId: tip.id },
        vibrate:   [200, 100, 200],
      });

      // If the app is open in the background, tell it to show the ack UI
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      clientList.forEach((client) =>
        client.postMessage({ type: 'TRIGGER', tipId: tip.id })
      );
    }, delay);
  }

  if (e.data.type === 'CANCEL') {
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      scheduledTimeout = null;
    }
  }
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          const client = clientList[0];
          client.postMessage({ type: 'TRIGGER', tipId: e.notification.data?.tipId });
          return client.focus();
        }
        return self.clients.openWindow('./');
      })
  );
});
