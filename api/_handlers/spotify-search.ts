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

  const query = (req.query.q as string) || "";
  if (!query.trim()) {
    return res.json({ tracks: [], albums: [], playlists: [] });
  }

  try {
    // Search Invidious nodes for audio matches
    let matches: any[] = [];
    for (const node of invidiousNodes) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const url = `${node}/api/v1/search?q=${encodeURIComponent(`${query} audio`)}&type=video`;
        const r = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data) && data.length > 0) {
            matches = data;
            break;
          }
        }
      } catch {}
    }

    const tracks = matches.slice(0, 15).map((v: any) => ({
      id: `sp_bridge_${v.videoId}`,
      title: (v.title || query).replace(/\s*\(Official (Music Video|Audio|Video)\)/i, "").trim(),
      artist: (v.author || "Artist").replace(" - Topic", "").trim(),
      album: "Spotify Bridge",
      duration: v.lengthSeconds || 210,
      durationText: `${Math.floor((v.lengthSeconds || 210) / 60)}:${String((v.lengthSeconds || 210) % 60).padStart(2, "0")}`,
      artwork: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      source: "spotify",
      streamUrl: `/api/audio/stream?id=${v.videoId}`,
      videoId: v.videoId,
      addedAt: Date.now(),
    }));

    return res.json({
      tracks,
      albums: [
        {
          id: `alb_${encodeURIComponent(query)}`,
          name: `${query} (Essential Collection)`,
          artist: tracks[0]?.artist || query,
          coverArt: tracks[0]?.artwork || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80",
          trackCount: tracks.length,
        },
      ],
      playlists: [
        {
          id: `pl_${encodeURIComponent(query)}`,
          name: `Best of ${query}`,
          coverArt: tracks[0]?.artwork || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80",
          trackCount: tracks.length,
        },
      ],
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Search failed." });
  }
}
