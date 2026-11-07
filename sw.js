const CACHE_NAME = 'absenin-shell-v15';
const SHELL = ['./', './index.html', './styles.css', './app.js', './dashboard-siswa.html', './dashboard-pengurus.html', './verifikasi.html', './tambah-anggota.html', './tambah-anggota.js', './profil.js', './peta.js', './qr.js', './firebase.js', './manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request).then(c => c || caches.match('./index.html'))));
});
self.addEventListener('push', event => {
  let data = { title: 'AbsenIn', body: 'Ada pembaruan absensi.', url: './dashboard-siswa.html' };
  try { data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: './icon-192.png', badge: './icon-192.png', data: { url: data.url }, tag: data.tag || 'absenin-update' }));
});
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => { const url = event.notification.data?.url || './dashboard-siswa.html'; for (const client of clients) if ('focus' in client) { client.navigate(url); return client.focus(); } return self.clients.openWindow(url); })); });
