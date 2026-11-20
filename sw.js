// SPDX-License-Identifier: Apache-2.0
// Cache only our own static assets. No trackers, CDN resources or background sync.
const CACHE_NAME = 'gfta6-static-v0.1.6';
const ASSETS = [
  './', './index.html', './src/style.css', './src/app.js', './src/render.js',
  './src/core.js', './src/cargo.js', './src/world.js', './src/vehicle.js', './src/vehicle-art.js',
  './src/scene25d.js', './src/escape.js', './src/flight-view.js',
  './vendor/vanillajs/projection25d.js',
  './vendor/vanillajs/motion2d.js',
  './assets/favicon.svg', './assets/gfta6-banner.svg'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('gfta6-static-') && key !== CACHE_NAME)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // The install cache includes the entry point, imported modules and artwork.
  event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
});
