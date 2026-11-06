/**
 * Advanced Service Worker Proxy & Audio Stream Engine (sw-proxy.js)
 * Enterprise-grade Service Worker featuring:
 * 1. Byte-Range Audio Streaming & Local Seeking Engine (HTTP 206 Partial Content)
 * 2. Multi-tier Offline Cache (Static Assets, WASM, App Shell)
 * 3. School Firewall / Filter Bypass & Header Sanitizer (CSP / X-Frame-Options removal)
 * 4. Anti-Fingerprint User-Agent & Client-Hints Spoofing
 * 5. Automatic Failover Endpoint Balancing
 * 6. Inter-Thread Audio Prefetch & Message Bus
 */

const CACHE_NAME = 'spotui-stealth-vault-v4';
const AUDIO_CACHE_NAME = 'spotui-audio-streams-v4';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/proxy-engine.wsm',
  '/stealth-crypto.wsm',
  '/tunnel-core.wsm',
];

// Failover proxy endpoint cluster
const PROXY_BACKENDS = [
  '/api/proxy',
  '/api/v2/cdn-fetch',
  '/proxy-sub/fallback',
];

let currentBackendIndex = 0;

function getActiveProxyBackend() {
  return PROXY_BACKENDS[currentBackendIndex % PROXY_BACKENDS.length];
}

function rotateProxyBackend() {
  currentBackendIndex = (currentBackendIndex + 1) % PROXY_BACKENDS.length;
}

// ----------------------------------------------------------------------------
// LIFECYCLE: INSTALL & ACTIVATE
// ----------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch(() => {
        // Soft fail if any optional asset is not yet available
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME && k !== AUDIO_CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ----------------------------------------------------------------------------
// HELPER: SANITIZE HEADERS & STRIP TRACKERS
// ----------------------------------------------------------------------------

function createStealthResponse(response) {
  const newHeaders = new Headers(response.headers);

  // Set permissive CORS & framing headers
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Credentials', 'true');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', '*');
  newHeaders.set('Accept-Ranges', 'bytes');

  // Strip restrictive security headers that allow school filters or CDNs to block rendering
  newHeaders.delete('X-Frame-Options');
  newHeaders.delete('Content-Security-Policy');
  newHeaders.delete('Content-Security-Policy-Report-Only');
  newHeaders.delete('X-Content-Type-Options');

  // Add stealth metadata
  newHeaders.set('X-Spotui-Worker', 'Dedicated-Proxy-V4');
  newHeaders.set('X-Spotui-Timestamp', Date.now().toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// ----------------------------------------------------------------------------
// BYTE-RANGE AUDIO HANDLER (HTTP 206 Partial Content from Cache)
// ----------------------------------------------------------------------------

async function handleRangeAudioRequest(request, cachedResponse) {
  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader) {
    return cachedResponse;
  }

  const arrayBuffer = await cachedResponse.arrayBuffer();
  const totalLength = arrayBuffer.byteLength;

  const matches = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!matches) {
    return cachedResponse;
  }

  const start = parseInt(matches[1], 10);
  const end = matches[2] ? parseInt(matches[2], 10) : totalLength - 1;

  if (start >= totalLength || end >= totalLength) {
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${totalLength}`,
      },
    });
  }

  const sliced = arrayBuffer.slice(start, end + 1);
  const responseHeaders = new Headers(cachedResponse.headers);
  responseHeaders.set('Content-Range', `bytes ${start}-${end}/${totalLength}`);
  responseHeaders.set('Content-Length', sliced.byteLength.toString());
  responseHeaders.set('Accept-Ranges', 'bytes');
  responseHeaders.set('Content-Type', cachedResponse.headers.get('Content-Type') || 'audio/mpeg');

  return new Response(sliced, {
    status: 206,
    statusText: 'Partial Content',
    headers: responseHeaders,
  });
}

// ----------------------------------------------------------------------------
// FETCH INTERCEPTION
// ----------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Audio Streaming Interception with Range Support & Cache
  if (url.pathname === '/api/audio/stream') {
    event.respondWith(
      (async () => {
        const audioCache = await caches.open(AUDIO_CACHE_NAME);
        const cacheKey = new Request(url.pathname + url.search);

        // Check if full stream is in audio cache
        const cached = await audioCache.match(cacheKey);
        if (cached && cached.status === 200) {
          return handleRangeAudioRequest(request, cached.clone());
        }

        // Fetch from network with anti-DPI headers
        try {
          const fetchHeaders = new Headers(request.headers);
          fetchHeaders.set('X-Spotui-Stream', 'direct-dsp');
          const netRes = await fetch(request, {
            headers: fetchHeaders,
          });

          // If successful full response, cache into audio cache for offline playback
          if (netRes.ok && netRes.status === 200 && !request.headers.has('Range')) {
            audioCache.put(cacheKey, netRes.clone()).catch(() => {});
          }

          return netRes;
        } catch (err) {
          // If offline and we had cache, try to serve it
          if (cached) {
            return handleRangeAudioRequest(request, cached.clone());
          }
          return new Response(JSON.stringify({ error: 'Audio network stream offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })()
    );
    return;
  }

  // 2. Web Proxy Route Interception
  if (
    url.pathname.startsWith('/proxy-sub/') ||
    url.pathname.startsWith('/api/v2/cdn-fetch') ||
    url.searchParams.has('target') ||
    url.searchParams.has('url')
  ) {
    const rawTarget = url.searchParams.get('url') || url.searchParams.get('target') || url.pathname.replace('/proxy-sub/', '');
    if (!rawTarget) return;

    event.respondWith(
      (async () => {
        const backend = getActiveProxyBackend();
        const proxiedUrl = `${backend}?url=${encodeURIComponent(rawTarget)}`;

        const customRequestHeaders = new Headers(request.headers);
        customRequestHeaders.set('X-WSM-Intercept', 'true');
        customRequestHeaders.set('X-Spoofed-Worker', 'active');
        customRequestHeaders.set('Sec-CH-UA', '"Chromium";v="124", "Google Chrome";v="124"');
        customRequestHeaders.set('Sec-CH-UA-Platform', '"Windows"');

        try {
          const response = await fetch(proxiedUrl, {
            method: request.method,
            headers: customRequestHeaders,
            body: ['GET', 'HEAD'].includes(request.method) ? null : await request.clone().arrayBuffer(),
          });

          if (!response.ok && response.status >= 500) {
            rotateProxyBackend();
          }

          return createStealthResponse(response);
        } catch (err) {
          rotateProxyBackend();
          return new Response(
            JSON.stringify({
              error: 'Spotui Proxy Mesh Routing Exception',
              message: err.message,
              backendAttempted: backend,
              timestamp: Date.now(),
            }),
            {
              status: 502,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      })()
    );
    return;
  }

  // 3. Stale-While-Revalidate for Static Assets, WASM, and App Shell
  if (request.method === 'GET' && url.origin === self.location.origin) {
    const isAppAsset =
      url.pathname === '/' ||
      url.pathname === '/index.html' ||
      /\.(js|ts|tsx|css|png|jpg|jpeg|webp|svg|woff2|wasm|wsm|json)$/i.test(url.pathname);

    if (isAppAsset) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          const cachedResponse = await cache.match(request);
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        })
      );
      return;
    }
  }
});

// ----------------------------------------------------------------------------
// INTER-THREAD MESSAGING
// ----------------------------------------------------------------------------

self.addEventListener('message', (event) => {
  const { action, payload } = event.data || {};

  switch (action) {
    case 'PURGE_CACHE':
      event.waitUntil(
        Promise.all([caches.delete(CACHE_NAME), caches.delete(AUDIO_CACHE_NAME)]).then(() => {
          event.ports[0]?.postMessage({ action: 'CACHE_PURGED', success: true });
        })
      );
      break;

    case 'PREFETCH_AUDIO':
      if (payload && payload.url) {
        caches.open(AUDIO_CACHE_NAME).then((cache) => {
          fetch(payload.url)
            .then((res) => {
              if (res.ok) cache.put(payload.url, res);
            })
            .catch(() => {});
        });
      }
      break;

    case 'GET_SW_STATUS':
      caches.keys().then((keys) => {
        event.ports[0]?.postMessage({
          status: 'ACTIVE_DEDICATED',
          cacheNames: keys,
          activeBackend: getActiveProxyBackend(),
          cluster: PROXY_BACKENDS,
          version: '4.0.0',
        });
      });
      break;

    default:
      break;
  }
});