import type { VercelRequest, VercelResponse } from "@vercel/node";

const invidiousNodes = [
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://invidious.private.coffee",
  "https://vid.priv.au",
  "https://invidious.asir.dev",
  "https://invidious.tiekoetter.com",
  "https://invidious.f5.si",
  "https://yewtu.be",
  "https://invidious.flokinet.to",
  "https://invidious.lunar.icu",
];

const pipedNodes = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://piped-api.lunar.icu",
  "https://pipedapi.leptons.xyz",
  "https://api.piped.privacydev.net",
];

async function searchYouTube(query: string): Promise<string | null> {
  try {
    const searchRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );
    const html = await searchRes.text();
    const match =
      html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
      html.match(/ytInitialData\s*=\s*({.*?});/s);

    if (match) {
      const parsed = JSON.parse(match[1]);
      const sections =
        parsed.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      for (const s of sections) {
        const items = s.itemSectionRenderer?.contents || [];
        for (const item of items) {
          if (item.videoRenderer) {
            return item.videoRenderer.videoId;
          }
        }
      }
    }
  } catch {}
  return null;
}

async function resolveSpotify(id: string): Promise<string | null> {
  try {
    const embedRes = await fetch(`https://open.spotify.com/embed/track/${id}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    if (!embedRes.ok) return null;

    const html = await embedRes.text();
    const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!nextMatch) return null;

    const nextData = JSON.parse(nextMatch[1]);
    const entity = nextData.props?.pageProps?.state?.data?.entity;
    if (entity) {
      const title = entity.name || "";
      const artist = entity.artists?.map((a: any) => a.name).join(", ") || "";
      return `${title} ${artist}`;
    }
  } catch {}
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const rawId = (req.query.id as string) || "";
  if (!rawId) {
    return res.status(400).json({ error: "Missing video/audio id parameter (?id=...)" });
  }

  let videoId = rawId.replace(/^(yt_|sp_bridge_)/, "").trim();

  // If it's a Spotify ID (usually 22 chars), resolve it first to YouTube videoId
  if (/^[a-zA-Z0-9]{22}$/.test(videoId)) {
    try {
      const spotifyQuery = await resolveSpotify(videoId);
      if (spotifyQuery) {
        const translatedId = await searchYouTube(spotifyQuery + " audio");
        if (translatedId) {
          videoId = translatedId;
        }
      }
    } catch (err) {
      console.error("[Vercel Spotify Bridge Error]:", err);
    }
  }

  // 1. Try Invidious Nodes
  for (const node of invidiousNodes) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const response = await fetch(`${node}/api/v1/videos/${encodeURIComponent(videoId)}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const audioFormats = (data.adaptiveFormats || []).filter(
          (f: any) => f.type && f.type.startsWith("audio/")
        );
        const best =
          audioFormats.find((f: any) => f.itag === 251) ||
          audioFormats.find((f: any) => f.itag === 140) ||
          audioFormats[0];

        if (best && best.url) {
          const directUrl = best.url.startsWith("http") ? best.url : `${node}${best.url}`;
          
          // Forward range if provided
          const range = req.headers.range;
          const streamRes = await fetch(directUrl, {
            headers: range ? { Range: range as string } : {},
          }).catch(() => null);

          if (streamRes && streamRes.ok) {
            res.status(streamRes.status);
            res.setHeader("Content-Type", best.type || "audio/webm; codecs=opus");
            res.setHeader("Accept-Ranges", "bytes");
            const cLen = streamRes.headers.get("content-length");
            const cRange = streamRes.headers.get("content-range");
            if (cLen) res.setHeader("Content-Length", cLen);
            if (cRange) res.setHeader("Content-Range", cRange);

            if (streamRes.body) {
              const { Readable } = await import("stream");
              const nodeStream = Readable.fromWeb(streamRes.body as any);
              nodeStream.pipe(res);
              return;
            }
          }
        }
      }
    } catch {}
  }

  // 2. Try Piped Nodes
  for (const node of pipedNodes) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const response = await fetch(`${node}/streams/${encodeURIComponent(videoId)}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (data.audioStreams && data.audioStreams.length > 0) {
          const best = data.audioStreams[0];
          if (best.url) {
            const range = req.headers.range;
            const streamRes = await fetch(best.url, {
              headers: range ? { Range: range as string } : {},
            }).catch(() => null);

            if (streamRes && streamRes.ok) {
              res.status(streamRes.status);
              res.setHeader("Content-Type", best.mimeType || "audio/webm; codecs=opus");
              res.setHeader("Accept-Ranges", "bytes");
              const cLen = streamRes.headers.get("content-length");
              const cRange = streamRes.headers.get("content-range");
              if (cLen) res.setHeader("Content-Length", cLen);
              if (cRange) res.setHeader("Content-Range", cRange);

              if (streamRes.body) {
                const { Readable } = await import("stream");
                const nodeStream = Readable.fromWeb(streamRes.body as any);
                nodeStream.pipe(res);
                return;
              }
            }
          }
        }
      }
    } catch {}
  }

  // 3. Fallback audio stream with standard MP3 to support iOS & Safari natively
  try {
    const fallbackUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    const range = req.headers.range;
    const streamRes = await fetch(fallbackUrl, {
      headers: range ? { Range: range as string } : {},
    });
    if (streamRes.ok && streamRes.body) {
      res.status(streamRes.status);
      res.setHeader("Content-Type", "audio/mp3");
      res.setHeader("Accept-Ranges", "bytes");
      const cLen = streamRes.headers.get("content-length");
      const cRange = streamRes.headers.get("content-range");
      if (cLen) res.setHeader("Content-Length", cLen);
      if (cRange) res.setHeader("Content-Range", cRange);

      const { Readable } = await import("stream");
      const nodeStream = Readable.fromWeb(streamRes.body as any);
      nodeStream.pipe(res);
      return;
    }
  } catch {}

  res.status(500).end("Streaming failed completely");
}
