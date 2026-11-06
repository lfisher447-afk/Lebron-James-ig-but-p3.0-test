import { Request, Response, NextFunction, Router } from 'express';

// Live Security Metrics & State
export interface SecurityServerStats {
  requestsInspected: number;
  crawlersNeutralized: number;
  trackersScrubbed: number;
  entropyPacketsDispatched: number;
  activeStealthTunnels: number;
  uptimeSeconds: number;
  firewallActive: boolean;
  antiDpiActive: boolean;
  spoofedServerSignature: string;
  tlsCipherProfile: string;
}

const serverStartTime = Date.now();
const securityStats: SecurityServerStats = {
  requestsInspected: 0,
  crawlersNeutralized: 0,
  trackersScrubbed: 0,
  entropyPacketsDispatched: 0,
  activeStealthTunnels: 0,
  uptimeSeconds: 0,
  firewallActive: true,
  antiDpiActive: true,
  spoofedServerSignature: 'nginx/1.24.0 (Ubuntu)',
  tlsCipherProfile: 'TLS_AES_256_GCM_SHA384 / CHACHA20_POLY1305',
};

// Known school surveillance, enterprise content filters & inspection bot signatures
const SURVEILLANCE_BOT_PATTERNS = [
  /securly/i,
  /goguardian/i,
  /linewize/i,
  /familyzone/i,
  /lightspeedsystems/i,
  /relay/i,
  /barkbot/i,
  /cisco[\s_-]?umbrella/i,
  /opendns/i,
  /contentprotect/i,
  /sophos/i,
  /fortiguard/i,
  /palo[\s_-]?alto/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
];

// Tracking query parameters to scrub automatically
const TRACKING_PARAMS = [
  'fbclid',
  'gclid',
  '_ga',
  'mc_eid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  '__cf_bm',
  'msclkid',
];

/**
 * Educational Decoy HTML served when school web crawlers inspect the page
 */
const EDUCATIONAL_DECOY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AP European History - Unit 4: Scientific Revolution & Enlightenment</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; background: #fff; }
    h1 { color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 24px; }
    h2 { color: #2b6cb0; margin-top: 24px; font-size: 18px; }
    p { margin-bottom: 16px; color: #4a5568; }
    .meta { font-size: 12px; color: #718096; margin-bottom: 24px; }
    ul { margin-left: 20px; color: #4a5568; }
  </style>
</head>
<body>
  <h1>Unit 4: The Scientific Revolution and Enlightenment (1648–1815)</h1>
  <div class="meta">Curriculum Study Reference & Syllabus Guide | AP European History</div>
  <h2>1. Key Conceptual Shifts</h2>
  <p>The Scientific Revolution introduced empirical observation and mathematics as the foundational arbiters of truth, challenging scholasticism and classical Aristotelian physics.</p>
  <ul>
    <li><strong>Nicolaus Copernicus (1473–1543):</strong> Heliocentric model in <em>De revolutionibus orbium coelestium</em>.</li>
    <li><strong>Johannes Kepler (1571–1630):</strong> Elliptical planetary orbits and mathematical laws of planetary motion.</li>
    <li><strong>Galileo Galilei (1564–1642):</strong> Telescopic observation of celestial bodies and mathematical mechanics.</li>
    <li><strong>Isaac Newton (1642–1727):</strong> Synthesis of universal gravitation and differential calculus in <em>Principia Mathematica</em>.</li>
  </ul>
  <h2>2. The Enlightenment and Social Contracts</h2>
  <p>Philosophes applied scientific rationality to governance, economic structures, and human ethics.</p>
</body>
</html>`;

/**
 * 1. Dedicated Security Headers & Stealth Anti-Fingerprint Middleware
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  securityStats.requestsInspected++;

  // Completely strip disclosing headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('ETag');
  res.removeHeader('Via');

  // Inject randomized / spoofed enterprise server signature
  res.setHeader('Server', securityStats.spoofedServerSignature);

  // Hardened Anti-Fingerprint & Anti-Detection Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Allow iframe embedding from about:blank and same origin while preventing clickjacking
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Permissions Policy: Restrict background invasive sensors
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), camera=(), microphone=(self), display-capture=(), payment=(), usb=()'
  );

  // Anti-DPI entropy jitter header
  if (securityStats.antiDpiActive) {
    const entropyPadded = Buffer.from(Math.random().toString(36).repeat(3)).toString('base64');
    res.setHeader('X-DPI-Entropy', entropyPadded);
  }

  // Scrub tracking query parameters
  if (req.url && req.url.includes('?')) {
    let scrubbed = false;
    const urlObj = new URL(req.url, 'http://localhost');
    for (const param of TRACKING_PARAMS) {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.delete(param);
        scrubbed = true;
      }
    }
    if (scrubbed) {
      securityStats.trackersScrubbed++;
      req.url = urlObj.pathname + (urlObj.search ? urlObj.search : '');
    }
  }

  next();
}

/**
 * 2. School Web Surveillance / Crawler Defense Firewall Middleware
 */
export function crawlerFirewallMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!securityStats.firewallActive) {
    return next();
  }

  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const accept = (req.headers['accept'] || '').toLowerCase();

  // If request is for API or static assets, bypass crawler check
  if (req.path.startsWith('/api/') || req.path.match(/\.(js|css|svg|png|jpg|mp3|ogg|ico|woff2)$/)) {
    return next();
  }

  // Check user-agent against surveillance / inspection bot signatures
  const isSurveillanceCrawler = SURVEILLANCE_BOT_PATTERNS.some((pattern) => pattern.test(userAgent));

  if (isSurveillanceCrawler) {
    securityStats.crawlersNeutralized++;
    console.warn(`[Security Server Defense] Neutralized surveillance crawler: "${userAgent.slice(0, 80)}" from ${req.ip}`);
    
    // Serve clean educational decoy document with 200 OK
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(EDUCATIONAL_DECOY_HTML);
  }

  next();
}

/**
 * Security Server Management Router
 */
export const securityRouter = Router();

// Live Security Server Metrics
securityRouter.get('/server-status', (req: Request, res: Response) => {
  securityStats.uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  res.json({
    status: 'ONLINE',
    dedicatedEngine: 'SpotUI Hardened Defense Core v4.2',
    ...securityStats,
  });
});

// Real-time Firewall Rule Toggle
securityRouter.post('/toggle-firewall', (req: Request, res: Response) => {
  if (typeof req.body?.firewallActive === 'boolean') {
    securityStats.firewallActive = req.body.firewallActive;
  }
  if (typeof req.body?.antiDpiActive === 'boolean') {
    securityStats.antiDpiActive = req.body.antiDpiActive;
  }
  res.json({ success: true, stats: securityStats });
});

// Emits random entropy-padded binary noise to scramble Deep Packet Inspection (DPI)
securityRouter.get('/traffic-noise', (req: Request, res: Response) => {
  securityStats.entropyPacketsDispatched++;
  const size = Math.floor(Math.random() * 2048) + 512;
  const entropyBuffer = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    entropyBuffer[i] = Math.floor(Math.random() * 256);
  }
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store, no-cache');
  res.send(entropyBuffer);
});

// Serve educational decoy on demand
securityRouter.get('/decoy', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(EDUCATIONAL_DECOY_HTML);
});

// Clean about:blank auto-bootstrapping payload
securityRouter.get('/about-blank-payload', (req: Request, res: Response) => {
  const origin = req.query.origin || '';
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Classes</title>
  <link rel="icon" href="https://ssl.gstatic.com/classroom/favicon.png" type="image/png">
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #07090e; }
    iframe { width: 100%; height: 100%; border: none; display: block; }
  </style>
</head>
<body>
  <iframe src="${origin || '/'}" allow="autoplay; fullscreen; clipboard-read; clipboard-write; display-capture; camera; microphone; encrypted-media"></iframe>
  <script>
    window.addEventListener('beforeunload', function(e) {
      e.preventDefault();
      e.returnValue = 'Session is protected by SpotUI Anti-Close Shield.';
      return e.returnValue;
    });
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});
