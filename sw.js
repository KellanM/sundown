// Sundown's offline cache (written by tools/deploy-sundown.mjs). Every file is fetched on install and served
// cache-first. A new deploy changes VERSION: the new worker fills its own cache, then WAITS until the page posts
// SKIP_WAITING (on the title, never mid-ride), takes over, and the old cache is dropped.
const VERSION = '225083e86d30';
const FILES = [
  "./",
  "audio/music.js",
  "audio/sfx.js",
  "env/akiba.js",
  "env/akiba_ads.js",
  "env/aqua.js",
  "env/bay.js",
  "env/bikes.js",
  "env/buildings.js",
  "env/cars.js",
  "env/coast.js",
  "env/gion.js",
  "env/haneda.js",
  "env/harbour.js",
  "env/hud.js",
  "env/kurobe.js",
  "env/minato.js",
  "env/neon.js",
  "env/paddies.js",
  "env/pass.js",
  "env/refinery.js",
  "env/roadmat-presets.json",
  "env/roadmat.js",
  "env/sakurajima.js",
  "env/shimanami.js",
  "env/shuto.js",
  "env/sky.js",
  "env/snow.js",
  "env/tunnels.js",
  "icons/favicon-64.png",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512-maskable.png",
  "icons/icon-512.png",
  "index.html",
  "levels/default.json",
  "manifest.webmanifest",
  "mech/arrival.js",
  "mech/breakfx.js",
  "mech/crew.js",
  "mech/demo.js",
  "mech/director.js",
  "mech/finale.js",
  "mech/formations.js",
  "mech/gang.js",
  "mech/heat.js",
  "mech/heli.js",
  "mech/police.js",
  "mech/skill.js",
  "mech/speedfx.js",
  "mech/stunts.js",
  "mech/style.js",
  "setpiece/avalanche.js",
  "setpiece/boss.js",
  "setpiece/cavein.js",
  "setpiece/festival.js",
  "setpiece/fireball.js",
  "setpiece/flood.js",
  "setpiece/jetwash.js",
  "setpiece/jump.js",
  "setpiece/kaiju.js",
  "setpiece/lavabreach.js",
  "setpiece/megalodon.js",
  "setpiece/naruto.js",
  "setpiece/phantom.js",
  "setpiece/rail.js",
  "setpiece/rockslide.js",
  "setpiece/screenfall.js",
  "setpiece/wave.js",
  "setpiece/wheel.js",
  "sundown.html",
  "ui/cosmetics.js",
  "ui/cutin.js",
  "ui/journal.js"
];
const CACHE = `sundown-${VERSION}`, FONTS = 'sundown-fonts';

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the HTTP cache (GitHub Pages lets it hold files for 10 minutes), so a new version is never filled with old files
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => { if (!self.registration.active) return self.skipWaiting(); }));   // the very first install has nothing to wait for
});

self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sundown-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // the title font (Google Fonts): kept once seen, so the logo still has its lettering offline
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone()).catch(() => {});
      return res;
    }))));
    return;
  }
  if (url.origin !== location.origin) return;
  // this worker's own cache only, so a page on the old version never gets a newer file mid-ride
  e.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true })).then((hit) => hit || fetch(req)));
});
