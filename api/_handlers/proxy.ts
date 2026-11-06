import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Readable } from "stream";

function unscrambleUrl(scrambled: string, key = 0x5a): string {
  if (!scrambled || !scrambled.startsWith("sp_")) return scrambled;
  try {
    let b64 = scrambled.slice(3).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const buf = Buffer.from(b64, "base64");
    const out = Buffer.alloc(buf.length);
    for (let i = 0; i < buf.length; i++) {
      out[i] = buf[i] ^ key;
    }
    return out.toString("utf-8");
  } catch {
    return scrambled;
  }
}

/**
 * Extracts and reconstructs the target URL, preserving nested query parameters and unscrambling if needed.
 */
function extractTargetUrl(req: VercelRequest): string | null {
  let target = "";
  if (req.body && typeof req.body === "object" && req.body.url) {
    target = String(req.body.url);
  } else {
    const rawUrl = req.url || "";
    try {
      const dummyUrl = new URL(rawUrl, "http://localhost");
      target = dummyUrl.searchParams.get("url") || dummyUrl.searchParams.get("q") || "";
      if (!target) {
        if (typeof req.query.url === "string") target = req.query.url;
        else if (typeof req.query.q === "string") target = req.query.q;
      }
    } catch {
      if (typeof req.query.url === "string") target = req.query.url;
      else if (typeof req.query.q === "string") target = req.query.q;
    }
  }

  if (!target) return null;
  if (target.startsWith("sp_")) {
    target = unscrambleUrl(target);
  }
  return target;
}

function sanitizeUrl(u?: string | null): string | null {
  if (!u) return null;
  let s = String(u).trim();
  if (!s.startsWith("http://") && !s.startsWith("https://")) {
    s = "https://" + s;
  }
  try {
    const parsed = new URL(s);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges, Content-Type, X-Proxy-By, Set-Cookie"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 2. Extract & Validate Target URL
  const rawTarget = extractTargetUrl(req);
  const target = sanitizeUrl(rawTarget);

  if (!target) {
    return res.status(400).json({ error: "Missing or invalid ?url= query parameter" });
  }

  const parsedUrl = new URL(target);

  try {
    // 3. Spoofed Headers
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept:
        (req.headers.accept as string) ||
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": (req.headers["accept-language"] as string) || "en-US,en;q=0.9",
      "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      Referer: parsedUrl.origin + "/",
      Origin: parsedUrl.origin,
    };

    if (req.headers.range) {
      upstreamHeaders["Range"] = req.headers.range as string;
    }
    if (req.headers.authorization) {
      upstreamHeaders["Authorization"] = req.headers.authorization as string;
    }
    if (req.headers.cookie) {
      upstreamHeaders["Cookie"] = req.headers.cookie as string;
    }

    const reqContentType = req.headers["content-type"] as string | undefined;
    if (reqContentType) {
      upstreamHeaders["Content-Type"] = reqContentType;
    }

    // 4. Request Body Formatting
    const method = (req.method || "GET").toUpperCase();
    const canHaveBody = !["GET", "HEAD"].includes(method) && req.body;
    let bodyData: any = undefined;

    if (canHaveBody) {
      if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
        bodyData = req.body;
      } else if (reqContentType?.includes("application/x-www-form-urlencoded")) {
        bodyData = new URLSearchParams(req.body).toString();
      } else {
        bodyData = JSON.stringify(req.body);
      }
    }

    // 5. Fetch Upstream
    const response = await fetch(target, {
      method,
      headers: upstreamHeaders,
      body: bodyData,
      redirect: "follow",
    });

    res.status(response.status);

    // 6. Forward Set-Cookie
    if (typeof (response.headers as any).getSetCookie === "function") {
      const cookies: string[] = (response.headers as any).getSetCookie();
      if (cookies && cookies.length > 0) {
        const rewritten = cookies.map((c) =>
          c.replace(/Domain=[^;]+;?/gi, "").replace(/SameSite=None/gi, "SameSite=Lax")
        );
        res.setHeader("Set-Cookie", rewritten);
      }
    }

    // 7. Filter Restrictive Headers
    const hopByHop = new Set([
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailers",
      "transfer-encoding",
      "upgrade",
    ]);

    const blockedSecurityHeaders = new Set([
      "x-frame-options",
      "content-security-policy",
      "content-security-policy-report-only",
      "cross-origin-embedder-policy",
      "cross-origin-opener-policy",
    ]);

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const acceptHeader = (req.headers.accept || "").toLowerCase();

    // Check if client expects data, search API results, or media stream
    const isDataOrApi =
      acceptHeader.includes("application/json") ||
      acceptHeader.includes("audio/") ||
      acceptHeader.includes("video/") ||
      req.query.json === "true" ||
      target.includes("/api/") ||
      target.includes("/v1/") ||
      target.endsWith(".mp3") ||
      target.endsWith(".m4a") ||
      target.endsWith(".webm");

    // Strictly identify actual HTML documents intended for browser rendering
    const isRenderableHtml =
      !isDataOrApi &&
      response.status === 200 &&
      contentType.includes("text/html");

    const hasEncoding = Boolean(response.headers.get("content-encoding"));

    for (const [k, v] of response.headers.entries()) {
      const lower = k.toLowerCase();
      if (hopByHop.has(lower) || blockedSecurityHeaders.has(lower)) {
        continue;
      }
      if ((isRenderableHtml || hasEncoding) && (lower === "content-length" || lower === "content-encoding")) {
        continue;
      }
      res.setHeader(k, v);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Proxy-By", "spotui-proxy");
    res.setHeader("X-Vercel-Proxy-Engine", "WSM-Stealth-Edge");
    res.setHeader("X-Spoofed-Fingerprint", "TLS-JA3-Chrome122-Win64");

    if (response.status === 204 || response.status === 304 || method === "HEAD") {
      return res.end();
    }

    // 8. ONLY inject scripts and base tags into real HTML documents
    if (isRenderableHtml) {
      let html = await response.text();
      const finalOrigin = response.url ? new URL(response.url).origin : parsedUrl.origin;

      html = html.replace(/if\s*\(top\s*!==\s*self\)[^}]+}/gi, "/* framebuster neutralized */");
      html = html.replace(/top\.location\s*=\s*self\.location/gi, "/* bypassed */");
      html = html.replace(/window\.top\.location/gi, "window.self.location");

      html = html.replace(/<base\b[^>]*>/gi, "");
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}<base href="${finalOrigin}/">`);
      } else {
        html = `<base href="${finalOrigin}/">` + html;
      }

      const clientSpoofScript = `
        <script>
          (function() {
            try {
              Object.defineProperty(window, 'top', { get: function() { return window.self; }, configurable: true });
              Object.defineProperty(window, 'parent', { get: function() { return window.self; }, configurable: true });
              Object.defineProperty(window, 'frameElement', { get: function() { return null; }, configurable: true });
              Object.defineProperty(navigator, 'webdriver', { get: function() { return false; }, configurable: true });
              if (!window.chrome) {
                window.chrome = { runtime: {}, loadTimes: function() { return {}; }, csi: function() { return {}; } };
              }
              if (window.RTCPeerConnection) {
                var OrigRTC = window.RTCPeerConnection;
                window.RTCPeerConnection = function() { return new OrigRTC({ iceServers: [] }); };
              }
              var origOpen = window.open;
              window.open = function(u) {
                if (u) {
                  try {
                    var res = new URL(u, "${finalOrigin}").toString();
                    window.location.href = '/api/proxy?url=' + encodeURIComponent(res);
                  } catch(e) { window.location.href = u; }
                }
                return null;
              };
              var origFetch = window.fetch;
              window.fetch = function(r, init) {
                try {
                  var uStr = typeof r === 'string' ? r : (r && r.url ? r.url : '');
                  if (uStr && !uStr.startsWith('data:') && !uStr.startsWith('blob:') && !uStr.includes('/api/proxy')) {
                    var resolved = new URL(uStr, "${finalOrigin}").toString();
                    var proxied = '/api/proxy?url=' + encodeURIComponent(resolved);
                    if (typeof r === 'string') r = proxied;
                    else if (r && r.url) r = new Request(proxied, init);
                  }
                } catch(e) {}
                return origFetch.call(this, r, init);
              };
              var origXHR = XMLHttpRequest.prototype.open;
              XMLHttpRequest.prototype.open = function(m, u) {
                try {
                  if (typeof u === 'string' && !u.startsWith('data:') && !u.startsWith('blob:') && !u.includes('/api/proxy')) {
                    u = '/api/proxy?url=' + encodeURIComponent(new URL(u, "${finalOrigin}").toString());
                  }
                } catch(e) {}
                return origXHR.apply(this, arguments);
              };
            } catch(e) {}
          })();
        </script>
      `;
      return res.send(clientSpoofScript + html);
    }

    // 9. Stream JSON, API Search Results, and Media Streams (No script corruption)
    if (response.body && typeof Readable.fromWeb === "function") {
      const stream = Readable.fromWeb(response.body as any);
      stream.on("error", () => res.end());
      return stream.pipe(res);
    } else if (response.body) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.send(buffer);
    } else {
      return res.end();
    }
  } catch (err: any) {
    return res.status(502).json({
      error: "Vercel Edge Proxy Routing Error",
      message: err.message,
      targetUrl: target,
    });
  }
}
