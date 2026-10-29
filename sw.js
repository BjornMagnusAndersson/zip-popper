// Service worker: keeps the whole game in a cache so it opens offline (cache first).

// DEV NOTE: this is the ONE list of files to keep offline. When you add, rename or delete
// a file under src/, update this list. Also bump CACHE_VERSION so players get the new files.
// (tests/pwa.test.mjs fails if a file is missing from this list.)
const PRECACHE = [
  './',
  './index.html',
  './sound-test.html',
  './faces-test.html',
  './popper.webmanifest',
  './css/pop.css',
  './css/comic.css',
  './css/app.css',
  './comic-test.html',
  './screens-test.html',
  './js/screens/dom.js',
  './js/screens/mascot.js',
  './js/screens/screen-logic.js',
  './js/screens/title.js',
  './js/screens/name.js',
  './js/screens/menu.js',
  './js/screens/customer-intro.js',
  './js/screens/result.js',
  './js/screens/shop.js',
  './js/screens/comics.js',
  './js/screens/settings.js',
  './js/screens/about.js',
  './js/screens/special.js',
  './js/screens/torchlight.js',
  './js/screens/phone-scroll.js',
  './css/phone-scroll.css',
  './js/screens/scrub.js',
  './js/screens/scrub-logic.js',
  './js/screens/end.js',
  './js/screens/studio.js',
  './js/screens/guide.js',
  './js/screens/guide-logic.js',
  './js/screens/reveal.js',
  './js/screens/album.js',
  './js/screens/album-logic.js',
  './js/screens/daily-done.js',
  './js/screens/diploma.js',
  './js/game/daily-logic.js',
  './js/data/daily.js',
  './css/daily.css',
  './strings/en.json',
  './js/core/save.js',
  './js/core/sound.js',
  './js/core/soundTable.js',
  './js/core/strings.js',
  './js/core/synthVoices.js',
  './js/core/music.js',
  './js/core/music-logic.js',
  './js/core/music-voices.js',
  './js/data/music-data.js',
  './music-test.html',
  './links.html',
  './js/core/pwa.js',
  './js/core/version.js',
  './js/data/bumps.js',
  './js/data/chapters.js',
  './js/data/customers.js',
  './js/data/economy-data.js',
  './js/data/facts.js',
  './js/data/tools.js',
  './js/data/twists.js',
  './js/data/customer-lines.js',
  './js/game/customer-lines.js',
  './js/data/bosses.js',
  './js/pop/twist-logic.js',
  './js/game/chapter-logic.js',
  './js/game/torchlight-logic.js',
  './js/game/phonescroll-logic.js',
  './js/game/app.js',
  './js/game/app-logic.js',
  './js/game/studio.js',
  './js/game/pin-jar.js',
  './js/game/service-asks.js',
  './js/game/scoring.js',
  './js/game/economy.js',
  './js/game/requests.js',
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
  './js/data/comics/strip-plan.js',
  './js/data/comics/strip-books.js',
  './js/data/comics/strip-mplant.js',
  './js/data/comics/strip-mlamp.js',
  './js/data/comics/strip-mstar.js',
  './js/data/comics/strip-mmastery.js',
  './js/data/comics/strip-mapron.js',
  './js/data/comics/strip-mtweezers.js',
  './js/data/comics/strip-mleak.js',
  './js/data/comics/strip-scare.js',
  './js/pop/art.js',
  './js/pop/backdrop.js',
  './js/pop/characters.js',
  './js/pop/engine.js',
  './js/pop/perf-logic.js',
  './js/pop/face.js',
  './js/pop/logic.js',
  './js/pop/pop-mode.js',
  './js/pop/pause-timers.js',
  './js/pop/round-logic.js',
  './js/pop/squeeze-logic.js',
  './js/pop/tool-logic.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/audio/giggle.wav',
  './assets/audio/sizzle.wav',
];

const CACHE_VERSION = 'v93';
const CACHE_NAME = `popper-${CACHE_VERSION}`;

// On install: download every listed file into the new cache, fresh from the server (cache: 'reload' skips the
// browser's HTTP cache, so a quick second update never stores an old copy under the new cache name).
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
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
