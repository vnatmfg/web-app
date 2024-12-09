// On install - the application shell cached
const cacheName = 'mfg-calendar-v1';
const appAssets = [
  '/',
  'index.html',
  'css/images/',
  'css/home.css',
  'css/bootstrap.min.css',

  'js/jquery.min.js',
  'js/bootstrap.min.js',
  'js/jquery-3.2.1.slim.min.js',
  'js/mfgApp.js',
];

self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  e.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    console.log('[Service Worker] Caching all: app shell and content');
    await cache.addAll(appAssets);
    // enable for debug
    // console.log(appAssets);
  })());
});

// Activate happens after install, either when the app is used for the
// first time, or when a new version of the SW was installed.
// We use the activate event to delete old caches and avoid running out of space.
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(name => {
      if (name !== cacheName) {
        return caches.delete(name);
      }
    }));
    await clients.claim();
  })());
});


// This variable will save the event for later use.
let deferredPrompt;
self.addEventListener('beforeinstallprompt', (e) => {
  // Prevents the default mini-infobar or install dialog from appearing on mobile
  e.preventDefault();
  // Save the event because you'll need to trigger it later.
  deferredPrompt = e;
  // Show your customized install prompt for your PWA
  // Your own UI doesn't have to be a single element, you
  // can have buttons in different locations, or wait to prompt
  // as part of a critical journey.
  showInAppInstallPromotion();
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}; // Parse the incoming data
  const title = data.title || 'Default Title';
  const options = {
    body: data.body || 'Default body text.',
    icon: data.icon || 'css/images/windows11/LargeTile.scale-100.png'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
  // Send a message to the main script
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'RAISE_MESSAGE',
        title: title,
        body: options.body,
        icon: options.icon
      });
    });
  });
});