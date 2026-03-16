const CACHE_NAME = 'khata-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/signup.html',
  '/signin.html',
  '/dashboard.html',
  '/transaction.html',
  '/add-entry.html',
  '/profile.html',
  '/style.css',
  '/index-file.css',
  '/dashboard.css',
  '/signin.css',
  '/signup.css',
  '/transaction.css',
  '/add-entry.css',
  '/profile.css',
  '/app.js',
  '/dashboard.js',
  '/transaction.js',
  '/add-entry.js',
  '/profile.js',
  '/icon.png',
  '/coin.png',
  '/animation.mp4'
];
// 1. Install Event: Download everything to the phone
self.addEventListener('install', (e) => {
  self.skipWaiting(); 
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});
// Fetch Event: WORK ON SLOW NETWORK
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});