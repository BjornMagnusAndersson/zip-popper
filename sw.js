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
  './css/comic.css',
  './comic-test.html',
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
  './js/data/tools.js',
  './js/game/scoring.js',
  './js/game/comic.js',
  './js/game/comic-logic.js',
  './js/game/comic-art.js',
  './js/data/comics/placeholder-strip.js',
  './js/data/comics/test-strip.js',
  './js/data/comics/strip-0.js',
  './js/data/comics/strip-1.js',
  './js/data/comics/strip-2.js',
  './js/data/comics/strip-3.js',
  './js/data/comics/strip-4.js',
  './js/data/comics/strip-5.js',
  './js/pop/art.js',
  './js/pop/backdrop.js',
  './js/pop/engine.js',
  './js/pop/face.js',
  './js/pop/logic.js',
  './js/pop/pop-mode.js',
  './js/pop/tool-logic.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
];

const CACHE_VERSION = 'v13';
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
