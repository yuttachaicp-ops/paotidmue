// เป้าติดมือ — service worker
const CACHE = 'paotidmue-v1.3.0';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));  // ไม่ skipWaiting ทันที รอให้หน้าเว็บสั่ง
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// network-first for the page (so updates arrive), cache-first for everything else
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { caches.open(CACHE).then(c => c.put('./index.html', r.clone())); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

// แสดงการแจ้งเตือนที่หน้าเว็บสั่งมา (ใช้ได้เมื่อแอปเปิดอยู่หรือเพิ่งถูกปลุก)
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'skipWaiting') { self.skipWaiting(); return; }
  if (d.type === 'notify') {
    self.registration.showNotification(d.title || 'เป้าติดมือ', {
      body: d.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: d.tag || 'reminder',
      renotify: true,
      data: { url: './index.html' }
    });
  }
});

// รองรับ Web Push ถ้าภายหลังต่อเซิร์ฟเวอร์
self.addEventListener('push', e => {
  let p = { title: 'เป้าติดมือ', body: 'ถึงเวลาที่ตั้งไว้แล้ว' };
  try { if (e.data) p = { ...p, ...e.data.json() }; } catch (_) {}
  e.waitUntil(self.registration.showNotification(p.title, {
    body: p.body, icon: './icon-192.png', badge: './icon-192.png', data: { url: './index.html' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) if ('focus' in w) return w.focus();
    return clients.openWindow('./index.html');
  }));
});
