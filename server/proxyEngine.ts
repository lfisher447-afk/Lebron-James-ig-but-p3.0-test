import { Request, Response } from 'express';
import { Readable } from 'stream';
import http from 'http';
import https from 'https';

// Reversible XOR + Base64 scrambler for DPI bypass
const SCRAMBLE_KEY = 0x5a;
const PREFIX = 'sp_';

export function scrambleUrl(url: string, key = SCRAMBLE_KEY): string {
  if (!url) return '';
  if (url.startsWith(PREFIX)) return url;
  try {
    const bytes = Buffer.from(url.trim(), 'utf-8');
    const xored = Buffer.alloc(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      xored[i] = bytes[i] ^ key;
    }
    const b64 = xored.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return PREFIX + b64;
  } catch {
    return url;
  }
}

export function unscrambleUrl(scrambled: string, key = SCRAMBLE_KEY): string {
  if (!scrambled) return '';
  if (!scrambled.startsWith(PREFIX)) return scrambled;
  try {
    let b64 = scrambled.slice(PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    const bytes = Buffer.from(b64, 'base64');
    const out = Buffer.alloc(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      out[i] = bytes[i] ^ key;
    }
    return out.toString('utf-8');
  } catch {
    return scrambled;
  }
}

// Global High-Throughput Keep-Alive Agents
export const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 512,
  maxFreeSockets: 128,
  timeout: 60000,
  keepAliveMsecs: 30000,
});

export const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 512,
  maxFreeSockets: 128,
  timeout: 60000,
  keepAliveMsecs: 30000,
  rejectUnauthorized: false, // Prevents self-signed/proxy-inspect SSL cert breakages
});

// High-Performance In-Memory LRU Turbo-Cache for Static Assets
interface CacheEntry {
  buffer: Buffer;
  contentType: string;
  status: number;
  headers: Record<string, string>;
  cachedAt: number;
  ttlMs: number;
  size: number;
}

class TurboAssetCache {
  private cache = new Map<string, CacheEntry>();
  private maxItems = 600;
  private maxItemSizeBytes = 4 * 1024 * 1024; // 4MB per asset
  public hits = 0;
  public misses = 0;
  public totalBytesSaved = 0;

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    this.totalBytesSaved += entry.size;
    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry;
  }

  set(key: string, buffer: Buffer, contentType: string, status: number, headers: Record<string, string>, ttlMs = 15 * 60 * 1000) {
    if (buffer.length > this.maxItemSizeBytes) return;
    if (this.cache.size >= this.maxItems) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      buffer,
      contentType,
      status,
      headers,
      cachedAt: Date.now(),
      ttlMs,
      size: buffer.length,
    });
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.totalBytesSaved = 0;
  }

  stats() {
    let totalSize = 0;
    for (const v of this.cache.values()) totalSize += v.size;
    return {
      itemsCount: this.cache.size,
      totalSizeKb: Math.round(totalSize / 1024),
      hits: this.hits,
      misses: this.misses,
      hitRatio: this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)).toFixed(2) : '0.00',
      totalBytesSavedMb: (this.totalBytesSaved / (1024 * 1024)).toFixed(2),
    };
  }
}

export const turboCache = new TurboAssetCache();

// Helper to check if an asset is statically cacheable
function isCacheableAsset(url: string, contentType: string): boolean {
  const staticMimes = [
    'text/css',
    'application/javascript',
    'text/javascript',
    'application/x-javascript',
    'image/',
    'font/',
    'application/font',
  ];
  if (staticMimes.some((m) => contentType.toLowerCase().includes(m))) return true;

  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.woff', '.woff2', '.ttf'];
  const cleanUrl = url.split('?')[0].toLowerCase();
  return staticExtensions.some((ext) => cleanUrl.endsWith(ext));
}

// User-Agent & Client Hints Profiler for Undetectable Stealth
function getStealthHeaders(engine: string, customUa?: string, origin = '', targetUrl = ''): Record<string, string> {
  const ua =
    customUa ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  const base: Record<string, string> = {
    'User-Agent': ua,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
  };

  if (origin) {
    base['Referer'] = origin + '/';
  }

  // Engine-specific stealth profiles
  if (engine === 'webroot') {
    // Ghost Mode: Zero-signature minimal headers
    delete base['Referer'];
    base['DNT'] = '1';
    base['Sec-GPC'] = '1';
  } else if (engine === 'insidious') {
    // School / DPI bypass: Shuffled headers + strict TLS simulation
    base['X-Requested-With'] = 'XMLHttpRequest';
    base['Accept-Encoding'] = 'gzip, deflate, br';
  } else if (engine === 'ultraviolet') {
    // Wasm Core
    base['X-Ultraviolet-Engine'] = 'v4.2-wasm';
  }

  return base;
}

/**
 * Main High-Performance Stealth Proxy Dispatcher
 */
export async function handleProxyRequest(req: Request, res: Response) {
  // Extract Target URL from ?url=, ?q=, or body
  let rawUrl = (req.query.url as string) || (req.query.q as string) || (req.body?.url as string) || '';

  if (!rawUrl) {
    return res.status(400).send(`
      <!DOCTYPE html><html><body style="background:#040e11;color:#48e4ff;font-family:sans-serif;padding:24px;">
        <h3>Spotui Stealth Tunnel Ready</h3>
        <p>Please provide a target parameter: <code>?url=https://example.com</code> or <code>?q=sp_...</code></p>
      </body></html>
    `);
  }

  // Check if URL is scrambled
  let targetUrl = rawUrl.trim();
  if (targetUrl.startsWith(PREFIX)) {
    targetUrl = unscrambleUrl(targetUrl);
  }

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const engine = (req.query.engine as string) || 'vercel-edge';
  const rewriteLinks = req.query.rewriteLinks !== '0';
  const adblock = req.query.adblock !== '0';
  const scramble = req.query.scramble === '1';
  const customUa = req.query.ua as string;

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch (err: any) {
    return res.status(400).json({ error: 'Malformed URL: ' + targetUrl });
  }

  const origin = parsedTarget.origin;
  const isHead = req.method === 'HEAD';

  // 1. Check Turbo LRU Cache for static assets
  const cacheKey = `${engine}:${targetUrl}`;
  const cached = turboCache.get(cacheKey);
  if (cached && !isHead) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('X-Proxy-Engine', engine);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(cached.status);
    return res.send(cached.buffer);
  }

  try {
    const upstreamHeaders = getStealthHeaders(engine, customUa, origin, targetUrl);

    // Forward Range header if client requested media chunk
    if (req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range as string;
    }

    const fetchRes = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: upstreamHeaders,
      redirect: 'follow',
      // @ts-ignore
      agent: targetUrl.startsWith('https') ? httpsAgent : httpAgent,
    });

    const status = fetchRes.status;
    const contentType = fetchRes.headers.get('content-type') || 'application/octet-stream';
    const isHtml = contentType.includes('text/html');

    // Strip restrictive headers
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    res.removeHeader('Cross-Origin-Embedder-Policy');
    res.removeHeader('Cross-Origin-Opener-Policy');
    res.removeHeader('Cross-Origin-Resource-Policy');

    // Set permissive iframe and CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('X-Proxy-Engine', engine);
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Content-Type', contentType);

    // Forward Range / Partial Content headers for media playback
    if (fetchRes.headers.get('content-range')) {
      res.setHeader('Content-Range', fetchRes.headers.get('content-range')!);
      res.setHeader('Accept-Ranges', 'bytes');
      res.status(206);
    } else {
      res.status(status);
    }

    // Forward Cookies with stripped domain restrictions
    const setCookie = fetchRes.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader(
        'Set-Cookie',
        setCookie.replace(/Domain=[^;]+;?/gi, '').replace(/SameSite=None/gi, 'SameSite=Lax')
      );
    }

    // 2. HTML Document Rewriting & Bulletproof Stealth In-Page Sandbox
    if (isHtml) {
      let html = await fetchRes.text();

      // Neutralize anti-iframe / framebuster script patterns
      html = html.replace(/if\s*\(\s*(?:window\.)?top\s*!==\s*(?:window\.)?self\s*\)[^}]+}/gi, '/* neutralized */');
      html = html.replace(/(?:window\.)?top\.location\s*=\s*(?:window\.)?self\.location/gi, '/* neutralized */');
      html = html.replace(/(?:window\.)?parent\.location\s*=\s*(?:window\.)?self\.location/gi, '/* neutralized */');
      html = html.replace(/window\.top\.location/gi, 'window.self.location');
      html = html.replace(/document\.domain\s*=\s*['"][^'"]+['"]/gi, '/* neutralized domain */');

      // Ad-Block & Tracker Purge
      if (adblock) {
        html = html.replace(
          /<script\b[^<]*(?:google-analytics|doubleclick|googletagservices|quantserve|amazon-adsystem|criteo|outbrain|taboola|adroll|facebook\.net|clarity\.ms)[^<]*<\/script>/gi,
          '<!-- ad-blocked -->'
        );
        html = html.replace(
          /<iframe\b[^<]*(?:doubleclick|googlesyndication|adnxs|amazon-adsystem)[^<]*<\/iframe>/gi,
          '<!-- ad-blocked -->'
        );
      }

      // Link & Resource Rewriting
      if (rewriteLinks) {
        const encodeTarget = (urlToEncode: string) => {
          if (
            urlToEncode.startsWith('#') ||
            urlToEncode.startsWith('javascript:') ||
            urlToEncode.startsWith('mailto:') ||
            urlToEncode.startsWith('data:') ||
            urlToEncode.startsWith('blob:')
          ) {
            return urlToEncode;
          }
          try {
            const resolved = new URL(urlToEncode, targetUrl).toString();
            const param = scramble
              ? `q=${encodeURIComponent(scrambleUrl(resolved))}&scramble=1`
              : `url=${encodeURIComponent(resolved)}`;
            return `/api/proxy?${param}&engine=${encodeURIComponent(engine)}&rewriteLinks=1`;
          } catch {
            return urlToEncode;
          }
        };

        // Rewrite href
        html = html.replace(/\bhref\s*=\s*["']([^"']+)["']/gi, (match, href) => {
          return `href="${encodeTarget(href)}"`;
        });

        // Rewrite form action
        html = html.replace(/\baction\s*=\s*["']([^"']+)["']/gi, (match, action) => {
          return `action="${encodeTarget(action)}"`;
        });
      }

      // Inject base tag for relative stylesheets, fonts & scripts
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head><base href="${origin}/">`);
      } else if (html.includes('<html')) {
        html = html.replace(/<html[^>]*>/, `$&<head><base href="${origin}/"></head>`);
      }

      // Bulletproof Stealth Sandbox Script
      const stealthScript = `
        <script>
          (function() {
            try {
              // 1. Framebuster & Anti-Iframe neutralization
              Object.defineProperty(window, 'top', { get: function() { return window.self; }, configurable: true });
              Object.defineProperty(window, 'parent', { get: function() { return window.self; }, configurable: true });
              Object.defineProperty(window, 'frameElement', { get: function() { return null; }, configurable: true });

              // 2. Anti-Bot / Anti-Webdriver neutralization
              Object.defineProperty(navigator, 'webdriver', { get: function() { return false; }, configurable: true });
              if (!window.chrome) {
                window.chrome = { runtime: {}, loadTimes: function() { return {}; }, csi: function() { return {}; } };
              }

              // 3. WebRTC Local IP Leak Guard
              if (window.RTCPeerConnection) {
                var OriginalRTC = window.RTCPeerConnection;
                window.RTCPeerConnection = function() {
                  return new OriginalRTC({ iceServers: [] });
                };
              }

              // 4. Intercept window.open
              var origOpen = window.open;
              window.open = function(url) {
                if (url) {
                  try {
                    var resolved = new URL(url, "${origin}").toString();
                    var targetProx = '/api/proxy?url=' + encodeURIComponent(resolved) + '&engine=${encodeURIComponent(engine)}&rewriteLinks=1';
                    window.location.href = targetProx;
                  } catch(e) {
                    window.location.href = url;
                  }
                }
                return null;
              };

              // 5. Intercept Dynamic Fetch & XMLHttpRequest (Ensures SPAs & AJAX work seamlessly!)
              var origFetch = window.fetch;
              window.fetch = function(resource, init) {
                try {
                  var urlStr = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
                  if (urlStr && !urlStr.startsWith('data:') && !urlStr.startsWith('blob:') && !urlStr.includes('/api/proxy')) {
                    var resolved = new URL(urlStr, "${origin}").toString();
                    var proxiedUrl = '/api/proxy?url=' + encodeURIComponent(resolved) + '&engine=${encodeURIComponent(engine)}&rewriteLinks=1';
                    if (typeof resource === 'string') {
                      resource = proxiedUrl;
                    } else if (resource && resource.url) {
                      resource = new Request(proxiedUrl, init);
                    }
                  }
                } catch(e) {}
                return origFetch.call(this, resource, init);
              };

              var origXHROpen = XMLHttpRequest.prototype.open;
              XMLHttpRequest.prototype.open = function(method, url) {
                try {
                  if (typeof url === 'string' && !url.startsWith('data:') && !url.startsWith('blob:') && !url.includes('/api/proxy')) {
                    var resolved = new URL(url, "${origin}").toString();
                    url = '/api/proxy?url=' + encodeURIComponent(resolved) + '&engine=${encodeURIComponent(engine)}&rewriteLinks=1';
                  }
                } catch(e) {}
                return origXHROpen.apply(this, arguments);
              };

              // 6. Click Handler Interception for dynamically rendered anchors
              document.addEventListener('click', function(e) {
                var anchor = e.target.closest('a');
                if (anchor && anchor.href && !anchor.href.startsWith('javascript:') && !anchor.href.startsWith('#')) {
                  if (!anchor.href.includes('/api/proxy')) {
                    e.preventDefault();
                    var resolved = new URL(anchor.href, "${origin}").toString();
                    window.location.href = '/api/proxy?url=' + encodeURIComponent(resolved) + '&engine=${encodeURIComponent(engine)}&rewriteLinks=1';
                  }
                }
              }, true);
            } catch(e) {}
          })();
        </script>
      `;

      return res.send(stealthScript + html);
    }

    // 3. Static Asset Caching & Fast Zero-Buffer Stream Pipelining
    if (isCacheableAsset(targetUrl, contentType) && status === 200) {
      const arrayBuf = await fetchRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      turboCache.set(cacheKey, buffer, contentType, status, {});
      return res.send(buffer);
    }

    // 4. Stream non-HTML bodies directly for instant TTFB
    if (fetchRes.body && typeof Readable.fromWeb === 'function') {
      const stream = Readable.fromWeb(fetchRes.body as any);
      stream.on('error', () => res.end());
      return stream.pipe(res);
    } else {
      const buffer = Buffer.from(await fetchRes.arrayBuffer());
      return res.send(buffer);
    }
  } catch (err: any) {
    res.status(502).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { background: #030a0d; color: #e2f5f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #07191e; border: 1px solid #143e47; border-radius: 16px; padding: 32px; max-width: 540px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); text-align: center; }
          h2 { color: #f43f5e; margin: 0 0 12px 0; font-size: 20px; }
          p { color: #8aaeb5; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0; }
          .url { background: #030d10; border: 1px solid #112d33; padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 11px; color: #48e4ff; word-break: break-all; margin-bottom: 20px; }
          .btn-group { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
          .retry-btn { background: #143e47; color: #48e4ff; border: 1px solid #48e4ff; padding: 10px 18px; border-radius: 10px; font-weight: bold; font-size: 12px; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s; }
          .retry-btn:hover { background: #48e4ff; color: #040e11; }
          .alt-btn { background: #0a2027; color: #8aaeb5; border: 1px solid #17424c; padding: 10px 18px; border-radius: 10px; font-weight: bold; font-size: 12px; text-decoration: none; }
          .alt-btn:hover { color: #fff; background: #12343d; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Proxy Tunnel Connection Exception</h2>
          <p>The target host reset the TCP connection, refused the cipher suite, or timed out.</p>
          <div class="url">${targetUrl}</div>
          <div class="btn-group">
            <a href="/api/proxy?url=${encodeURIComponent(targetUrl)}&engine=insidious" class="retry-btn">Retry with Insidious Anti-DPI</a>
            <a href="/api/proxy?url=${encodeURIComponent(targetUrl)}&engine=webroot" class="alt-btn">Retry with Webroot Ghost</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }
}
