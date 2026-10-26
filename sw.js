// Service worker: keeps the whole game in a cache so it opens offline (cache first).

// DEV NOTE: this is the ONE list of files to keep offline. When you add, rename or delete
// a file under src/, update this list. Also bump CACHE_VERSION so players get the new files.
// (tests/pwa.test.mjs fails if a file is missing from this list.)
const PRECACHE = [
  './',
  './index.html',
  './sound-test.html',
  './faces-test.html',
  './manifest.webmanifest',
  './css/pop.css',
  './strings/en.json',
  './js/core/save.js',
  './js/core/sound.js',
  './js/core/soundTable.js',
  './js/core/strings.js',
  './js/core/synthVoices.js',
  './js/core/pwa.js',
  './js/data/bumps.js',
  './js/data/customers.js',
  './js/data/facts.js',
  './js/game/scoring.js',
  './js/pop/art.js',
  './js/pop/backdrop.js',
  './js/pop/engine.js',
  './js/pop/face.js',
  './js/pop/logic.js',
  './js/pop/pop-mode.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
];

const CACHE_VERSION = 'v4';
const CACHE_NAME = `popper-${CACHE_VERSION}`;

// On install: download every listed file into the new cache.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

// On activate: delete caches from older versions, then take control of open pages.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('popper-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// On fetch: answer GET requests from the cache first, fall back to the network.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request)),
  );
});
