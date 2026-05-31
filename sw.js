/* DVDCAD — Service Worker
   Chiến lược: cache-first cho mọi tài nguyên cùng origin.
   - App shell (HTML/icon/manifest) được nạp sẵn khi cài đặt -> mở offline tức thì.
   - Bộ giải mã DWG (libredwg-web.js ~8.8MB + .wasm ~6.3MB) được lưu cache
     ngay lần đầu mở một file .dwg khi có mạng -> các lần sau dùng offline được.
   Đổi số phiên bản CACHE bên dưới mỗi khi cập nhật file để buộc làm mới.
   HTML dùng network-first: có mạng luôn lấy bản mới nhất, mất mạng mới dùng cache. */
const CACHE = 'dvdcad-v21';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon-180.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // bỏ qua tài nguyên khác origin

  const isHTML = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isHTML) {
    // NETWORK-FIRST cho HTML: luôn lấy bản mới nhất, bỏ qua cả HTTP cache
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req.url, { cache: 'no-store' });
        if (res && res.ok) cache.put('./index.html', res.clone());
        return res;
      } catch (err) {
        const hit = (await cache.match(req)) || (await cache.match('./index.html')) || (await cache.match('./'));
        if (hit) return hit;
        throw err;
      }
    })());
    return;
  }

  // CÁC TÀI NGUYÊN KHÁC (wasm/js/icon...): cache-first cho nhanh + offline
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone()); // lưu lại cho lần sau (gồm cả file DWG decoder)
      return res;
    } catch (err) {
      throw err;
    }
  })());
});
