const CACHE_NAME = 'zoobastiks-v179';

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Лёгкая оболочка: тяжёлые feature-скрипты подтянутся по SWR при первом запросе
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './assets/favicon.svg',
        './assets/images/money.png',
        './assets/css/tailwind.min.css',
        './assets/js/api-config.min.js',
        './assets/js/portal-transition.min.js',
        './assets/js/keyboard.min.js',
        './assets/js/level.min.js',
        './assets/js/stats.min.js',
        './assets/js/achievements.min.js',
        './assets/js/main.min.js',
        './assets/js/ui/translations.min.js',
        './assets/js/ui/backgrounds.min.js',
        './scripts/lessons-data.js',
        './scripts/shop-data.js'
      ]).catch(function () {});
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    }).then(function () {
      // Force all open tabs to reload with fresh files.
      // client.navigate() works even if the page has no SW message listener
      // (unlike postMessage which required a handler added only in recent builds).
      return self.clients.matchAll({ type: 'window' }).then(function (clients) {
        clients.forEach(function (client) {
          client.navigate(client.url).catch(function () {
            // Fallback for older browsers that don't support client.navigate()
            client.postMessage({ type: 'SW_UPDATED' });
          });
        });
      });
    })
  );
});

function isSameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch (e) { return false; }
}

function isStaticAsset(url) {
  var u = url.toLowerCase();
  return /\.(js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|mp4|webm|ogg)$/.test(u) || u.indexOf('/scripts/') !== -1 || u.indexOf('/assets/') !== -1;
}

function isHtmlRequest(url) {
  var u = url.toLowerCase();
  return u.endsWith('/') || u.endsWith('.html') || u.indexOf('?') !== -1 && !isStaticAsset(u);
}

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = event.request.url;
  if (url.indexOf('http') !== 0) return;
  var sameOrigin = isSameOrigin(url);
  // Всегда свежий version.json - проверка автообновления на клиенте
  if (sameOrigin && url.indexOf('version.json') !== -1) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(function () {
        return new Response('{"build":0}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }
  var staticAsset = isStaticAsset(url);

  // HTML pages: network-first - always try to get the latest version
  if (sameOrigin && isHtmlRequest(url)) {
    event.respondWith(
      fetch(event.request).then(function (res) {
        if (res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
        }
        return res;
      }).catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // JS/CSS/images: stale-while-revalidate - serve cache instantly, update in background
  if (sameOrigin && staticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(event.request).then(function (cached) {
          var fetchPromise = fetch(event.request).then(function (res) {
            if (res.status === 200) cache.put(event.request, res.clone());
            return res;
          }).catch(function () { return cached; });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Everything else: network with cache fallback
  event.respondWith(
    fetch(event.request).then(function (res) {
      var clone = res.clone();
      if (res.status === 200 && sameOrigin) {
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
      }
      return res;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
