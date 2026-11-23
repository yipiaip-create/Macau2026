/* 離線開頁：網絡優先，失敗就用上次儲存嘅版本。資料（Google Apps Script）唔經呢度，由 app 自己嘅 IndexedDB 處理。 */
const CACHE = 'tp-shell-v1';
const SHELL = ['./', 'index.html', 'apple-touch-icon.png?v=4', 'icon-512.png?v=4'];
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && !CDN.test(req.url)) return;            // Google 程式、地圖圖磚等唔處理
  if (same || req.mode === 'navigate') {
    // 網絡優先，離線用快取
    e.respondWith(fetch(req).then(r => {
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return r;
    }).catch(() => caches.match(req).then(m => m || caches.match(req, { ignoreSearch: true })).then(m => m || (req.mode === 'navigate' ? caches.match('index.html') : undefined))));
  } else {
    // CDN（字體、地圖庫）：快取優先
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return r;
    })));
  }
});
