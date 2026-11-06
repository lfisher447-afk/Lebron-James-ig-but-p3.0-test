import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    status: "ok",
    runtime: "vercel-serverless-edge",
    wsmEngine: "online",
    time: new Date().toISOString(),
    nodes: [
      { id: "vercel-primary", name: "Vercel Edge Global Gateway", status: "online", latency: 8, engine: "wsm-edge" },
      { id: "backup-1", name: "Insidious Fast-Node Alpha", status: "online", latency: 19, engine: "insidious" },
      { id: "backup-2", name: "MrBean Tunnel Node Beta", status: "online", latency: 26, engine: "mrbean" },
      { id: "backup-3", name: "Stealth Worker Relay Gamma", status: "online", latency: 15, engine: "worker" },
    ],
  });
}
