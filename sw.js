// sw.js — Posture Check PWA Service Worker v6
// Handles: caching, background notification scheduling, notification click

const CACHE_NAME = 'posture-app-v7';
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
      .catch(() => {})
  );
  self.skipWaiting();
});

// ── ACTIVATE ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED' })))
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
// Also used as a SW wakeup point — fire overdue notification on any network request
self.addEventListener('fetch', (e) => {
  if (pendingSchedule && Date.now() >= pendingSchedule.fireAt) {
    const tip = pendingSchedule.tip;
    pendingSchedule = null;
    e.waitUntil(fireNotification(tip));
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

// ── NOTIFICATION ──────────────────────────────────────────────────────────────
const CAT_TITLES = {
  seated:  'Posture check',
  stretch: 'Stretch break',
  movement:'Time to move',
  eyes:    'Eyes & tension',
  mindful: 'Check in',
};

async function fireNotification(tip) {
  await self.registration.showNotification(CAT_TITLES[tip.category] || 'Posture check', {
    body:     tip.tip,
    icon:     './icons/icon-192.png',
    badge:    './icons/icon-192.png',
    tag:      'posture-reminder',
    renotify: true,
    data:     { tipId: tip.id },
    vibrate:  [200, 100, 200],
  });
  // Tell any open app windows to show the ack UI
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((c) => c.postMessage({ type: 'TRIGGER', tipId: tip.id }));
}

// ── BACKGROUND SCHEDULING ─────────────────────────────────────────────────────
// Uses event.waitUntil() so the browser keeps the SW alive for the full duration.
// scheduleGeneration prevents a cancelled schedule from firing after a new one is set.

let scheduleGeneration = 0;
let pendingSchedule    = null; // { fireAt, tip } — used for fetch-based recovery

self.addEventListener('message', (e) => {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE') {
    scheduleGeneration++;
    const gen = scheduleGeneration;
    const tip = e.data.tip;

    pendingSchedule = { fireAt: e.data.fireAt, tip };

    const delay = Math.max(0, e.data.fireAt - Date.now());

    // event.waitUntil keeps the SW alive until this promise resolves.
    // Without this, Android terminates the SW before the timeout fires.
    e.waitUntil(
      new Promise((resolve) => {
        setTimeout(async () => {
          // Only fire if this schedule hasn't been superseded or cancelled
          if (scheduleGeneration