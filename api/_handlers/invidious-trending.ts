import type { VercelRequest, VercelResponse } from "@vercel/node";

const invidiousNodes = [
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://invidious.private.coffee",
  "https://vid.priv.au",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const category = (req.query.category as string) || "trending music videos";

  for (const node of invidiousNodes) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const url = `${node}/api/v1/search?q=${encodeURIComponent(category)}&type=video`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const videos = data.slice(0, 20).map((v: any) => ({
            id: v.videoId,
            videoId: v.videoId,
            title: v.title || "Trending Video",
            artist: v.author || "YouTube Channel",
            author: v.author || "YouTube Channel",
            album: "YouTube",
            duration: v.lengthSeconds || 210,
            durationText: `${Math.floor((v.lengthSeconds || 210) / 60)}:${String((v.lengthSeconds || 210) % 60).padStart(2, "0")}`,
            thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
            views: v.viewCountText || "",
            source: "youtube",
            streamUrl: `/api/audio/stream?id=${v.videoId}`,
          }));
          return res.json({ category, videos });
        }
      }
    } catch {}
  }

  return res.json({ category, videos: [] });
}
