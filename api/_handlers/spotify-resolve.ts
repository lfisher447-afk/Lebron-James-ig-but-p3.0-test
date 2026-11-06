import type { VercelRequest, VercelResponse } from "@vercel/node";

async function resolveSpotify(url: string) {
  const match = url.match(
    /(?:open\.spotify\.com\/(track|playlist|album)\/|spotify:(track|playlist|album):)([a-zA-Z0-9]+)/
  );
  if (!match) {
    throw new Error("Invalid Spotify link. Please paste a valid track, album, or playlist URL.");
  }
  const type = match[1] || match[2];
  const id = match[3];

  let oembed: any = null;
  try {
    const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
    if (oembedRes.ok) {
      oembed = await oembedRes.json();
    }
  } catch {}

  const embedRes = await fetch(`https://open.spotify.com/embed/${type}/${id}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });

  if (!embedRes.ok) {
    throw new Error(`Spotify embed response error: ${embedRes.statusText}`);
  }

  const html = await embedRes.text();
  const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!nextMatch) {
    throw new Error("Could not parse Spotify metadata payload.");
  }

  const nextData = JSON.parse(nextMatch[1]);
  const entity = nextData.props?.pageProps?.state?.data?.entity;

  let tracks: any[] = [];
  const coverArt =
    oembed?.thumbnail_url ||
    entity?.coverArt?.sources?.[0]?.url ||
    entity?.album?.coverArt?.sources?.[0]?.url ||
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80";

  if (type === "track") {
    const durationMs = entity?.duration || 200000;
    tracks = [
      {
        id: `sp_${id}`,
        title: entity?.name || oembed?.title || "Spotify Track",
        artist: entity?.artists?.map((a: any) => a.name).join(", ") || "Spotify Artist",
        album: entity?.album?.name || "Single",
        duration: Math.round(durationMs / 1000),
        durationText: `${Math.floor(durationMs / 60000)}:${String(Math.floor((durationMs % 60000) / 1000)).padStart(2, "0")}`,
        artwork: coverArt,
        audioPreview: entity?.audioPreview?.url,
        source: "spotify",
        addedAt: Date.now(),
      },
    ];
  } else if (entity?.trackList) {
    tracks = entity.trackList.map((t: any, idx: number) => {
      const d = t.duration || 200000;
      const trackId = t.uri ? t.uri.split(":").pop() : `idx_${idx}`;
      return {
        id: `sp_${trackId}`,
        title: t.title || "Track",
        artist: t.subtitle || entity.name || "Spotify Artist",
        album: entity.name || "Spotify Collection",
        duration: Math.round(d / 1000),
        durationText: `${Math.floor(d / 60000)}:${String(Math.floor((d % 60000) / 1000)).padStart(2, "0")}`,
        artwork: coverArt,
        audioPreview: t.audioPreview?.url,
        source: "spotify",
        addedAt: Date.now(),
      };
    });
  }

  return {
    type,
    id,
    name: entity?.name || oembed?.title || "Spotify Music",
    coverArt,
    embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
    tracks,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = (req.query.url as string) || (req.query.id as string);
  if (!url) {
    return res.status(400).json({ error: "Missing Spotify URL parameter (?url=...)" });
  }

  try {
    const formattedUrl = url.startsWith("http")
      ? url
      : `https://open.spotify.com/playlist/${url}`;
    const resolved = await resolveSpotify(formattedUrl);
    return res.json(resolved);
  } catch (e: any) {
    return res.status(404).json({ error: e.message || "Failed to resolve Spotify resource." });
  }
}
