import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const instances = [
    { id: "inv-1", name: "Invidious NerdVPN (Germany)", url: "https://invidious.nerdvpn.de", protocol: "invidious", region: "DE", secure: true },
    { id: "inv-2", name: "Invidious Nadeko (US East)", url: "https://inv.nadeko.net", protocol: "invidious", region: "US", secure: true },
    { id: "inv-3", name: "Invidious PrivateCoffee (Austria)", url: "https://invidious.private.coffee", protocol: "invidious", region: "AT", secure: true },
    { id: "piped-1", name: "Piped Kavin (US)", url: "https://pipedapi.kavin.rocks", protocol: "piped", region: "US", secure: true },
    { id: "piped-2", name: "Piped AdminForge (EU)", url: "https://pipedapi.adminforge.de", protocol: "piped", region: "EU", secure: true },
    { id: "cobalt-1", name: "Cobalt API Node Alpha", url: "https://api.cobalt.tools", protocol: "cobalt", region: "GLOBAL", secure: true },
    { id: "wisp-1", name: "WISP WebSocket Edge 01", url: "wss://wisp.mercurywork.shop", protocol: "wisp", region: "US-WEST", secure: true },
    { id: "wisp-2", name: "WISP WebSocket Edge 02", url: "wss://anura.pro", protocol: "wisp", region: "EU-CENTRAL", secure: true },
    { id: "vercel-edge", name: "Vercel Global Edge Gateway", url: "/api/health", protocol: "native", region: "VERCEL-EDGE", secure: true },
  ];

  res.json({ instances });
}
