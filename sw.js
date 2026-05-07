// sw.js — Posture Check PWA Service Worker v9
// Handles: caching, background notification scheduling, notification click

const CACHE_NAME = 'posture-app-v10';
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

// ── REMINDER MESSAGES ─────────────────────────────────────────────────────────
const MESSAGES = [
  "Sit back, unclench, keep working. That counts.",
  "Take ten seconds and make the next hour less stupid.",
  "Good moment for a reset. You do not need to become a wellness person.",
  "Sit like a person again.",
  "The desk did not ask you to fold yourself in half.",
  "This is a posture reminder. Tragically, it is probably right.",
  "Your chair has a backrest. Bold concept, using it.",
  "This meeting could have been an email, but this reminder is actually useful.",
  "Shoulders down. I know, groundbreaking technology.",
  "Your neck is not a kickstand.",
  "Great news, your spine still accepts corrections.",
  "You bought the chair. You can use the whole chair.",
  "Your monitor is not going to get closer because you believe in it.",
  "The work will still be there after one normal human breath.",
];

function randomMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

// ── NOTIFICATION ──────────────────────────────────────────────────────────────
const CAT_TITLES = {
  seated:   'Posture check',
  stretch:  'Stretch break',
  movement: 'Time to move',
  eyes:     'Eyes & tension',
  mindful:  'Check in',
};

async function fireNotification(tip) {
  await self.registration.showNotification(CAT_TITLES[tip.category] || 'Posture check', {
    body:     randomMessage(),
    icon:     './icons/icon-192.png',
    badge:    './icons/icon-192.png',
    tag:      'posture-reminder',
    renotify: true,
    data:     { tipId: tip.id },
    vibrate:  [200, 100, 200],
  });
  // Tell any open app windows to show the ack UI
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((c) => c.postMessage({ type: 'TRIGGE