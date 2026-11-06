import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.json({ pingMs: 0, status: "online" });

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const pingRes = await fetch(targetUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "Spotui-Ping-Probe/3.0" },
    }).catch(() => null);
    clearTimeout(timeoutId);

    const pingMs = Math.max(1, Date.now() - start);
    return res.json({
      pingMs,
      status: pingRes && pingRes.status < 500 ? "online" : "degraded",
    });
  } catch {
    return res.json({ pingMs: -1, status: "offline" });
  }
}
