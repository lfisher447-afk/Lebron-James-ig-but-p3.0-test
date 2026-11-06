import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const nodes = [
    { id: "vercel-edge", name: "Vercel Edge Global Mesh", status: "online", latency: 8 + Math.floor(Math.random() * 5), engine: "wsm-edge" },
    { id: "webroot-primary", name: "Signal Webroot Gateway", status: "online", latency: 12 + Math.floor(Math.random() * 6), engine: "webroot" },
    { id: "insidious-fast", name: "Insidious Fast-Node Alpha", status: "online", latency: 20 + Math.floor(Math.random() * 8), engine: "insidious" },
    { id: "mrbean-tunnel", name: "MrBean Stealth Tunnel Beta", status: "online", latency: 28 + Math.floor(Math.random() * 6), engine: "mrbean" },
  ];
  res.json({ nodes, timestamp: Date.now() });
}
