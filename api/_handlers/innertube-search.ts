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

  const query = (req.query.q as string) || (req.query.query as string) || "";
  if (!query.trim()) {
    return res.json({ results: [] });
  }

  // 1. Try Invidious Instances
  for (const node of invidiousNodes) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const url = `${node}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const results = data.slice(0, 24).map((v: any) => ({
            id: v.videoId,
            videoId: v.videoId,
            title: v.title || "YouTube Video",
            artist: v.author || "YouTube Channel",
            author: v.author || "YouTube Channel",
            album: "YouTube Music",
            duration: v.lengthSeconds || 210,
            durationSeconds: v.lengthSeconds || 210,
            durationText: `${Math.floor((v.lengthSeconds || 0) / 60)}:${String((v.lengthSeconds || 0) % 60).padStart(2, "0")}`,
            thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
            views: v.viewCountText || `${(v.viewCount || 0).toLocaleString()} views`,
            source: "youtube",
            streamUrl: `/api/audio/stream?id=${v.videoId}`,
          }));
          return res.json({ results });
        }
      }
    } catch {}
  }

  // 2. Real YouTube HTML search scraper (extracts ytInitialData)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const searchRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );
    clearTimeout(timer);

    const html = await searchRes.text();
    const match =
      html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
      html.match(/ytInitialData\s*=\s*({.*?});/s);

    if (match) {
      const parsed = JSON.parse(match[1]);
      const sections =
        parsed.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const results: any[] = [];

      for (const s of sections) {
        const items = s.itemSectionRenderer?.contents || [];
        for (const item of items) {
          if (item.videoRenderer && item.videoRenderer.videoId) {
            const v = item.videoRenderer;
            results.push({
              id: v.videoId,
              videoId: v.videoId,
              title: v.title?.runs?.map((r: any) => r.text).join("") || v.title?.simpleText || "YouTube Video",
              artist: v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || "YouTube Channel",
              author: v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || "YouTube Channel",
              album: "YouTube Music",
              duration: 210,
              durationSeconds: 210,
              durationText: v.lengthText?.simpleText || "3:30",
              thumbnail:
                v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              views: v.viewCountText?.simpleText || "",
              source: "youtube",
              streamUrl: `/api/audio/stream?id=${v.videoId}`,
            });
          }
        }
      }

      if (results.length > 0) {
        return res.json({ results: results.slice(0, 24) });
      }
    }
  } catch {}

  return res.json({ results: [] });
}
