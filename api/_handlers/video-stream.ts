import type { VercelRequest, VercelResponse } from "@vercel/node";

const invidiousNodes = [
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://invidious.private.coffee",
  "https://vid.priv.au",
  "https://invidious.asir.dev",
];

const pipedNodes = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
];

async function searchYouTube(query: string): Promise<string | null> {
  try {
    const searchRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
  const targetRes = (req.query.res as string) || "720p";

  if (!rawId) {
    return res.status(400).json({ error: "Missing video id parameter (?id=...)" });
  }

  let videoId = rawId.replace(/^(yt_|sp_bridge_)/, "").trim();

  // Resolve TMDB Movie/Series ID if needed
  if (videoId.startsWith("tmdb_")) {
    const tmdbId = videoId.replace("tmdb_", "");
    try {
      const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=15d2166f754b7132e022f6e520a32049`);
      if (tmdbRes.ok) {
        const tmdbData = await tmdbRes.json();
        const movieTitle = tmdbData.title || tmdbData.original_title || "";
        if (movieTitle) {
          const ytId = await searchYouTube(`${movieTitle} official trailer`);
          if (ytId) {
            videoId = ytId;
          }
        }
      }
    } catch {}
  }

  // If it's a Spotify ID (usually 22 chars), resolve it first to YouTube videoId
  if (/^[a-zA-Z0-9]{22}$/.test(videoId)) {
    try {
      const spotifyQuery = await resolveSpotify(videoId);
      if (spotifyQuery) {
        const translatedId = await searchYouTube(spotifyQuery + " video");
        if (translatedId) {
          videoId = translatedId;
        }
      }
    } catch (err) {
      console.error("[Vercel Spotify Bridge Error]:", err);
    }
  }

  // 1. Invidious Nodes for Video Streams
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
        const formats = data.formatStreams || [];
        const exact = formats.find(
          (f: any) => f.qualityLabel === targetRes || f.resolution === targetRes
        );
        const chosen =
          exact ||
          formats[0] ||
          (data.adaptiveFormats || []).find((f: any) => f.type?.startsWith("video/"));

        if (chosen && chosen.url) {
          const directUrl = chosen.url.startsWith("http") ? chosen.url : `${node}${chosen.url}`;
          const range = req.headers.range;
          const streamRes = await fetch(directUrl, {
            headers: range ? { Range: range as string } : {},
          }).catch(() => null);

          if (streamRes && streamRes.ok) {
            res.status(streamRes.status);
            res.setHeader("Content-Type", chosen.type || "video/mp4");
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

  // 2. Piped Nodes for Video Streams
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
        if (data.videoStreams && data.videoStreams.length > 0) {
          const matched =
            data.videoStreams.find((v: any) => v.quality === targetRes) ||
            data.videoStreams[0];
          if (matched.url) {
            const range = req.headers.range;
            const streamRes = await fetch(matched.url, {
              headers: range ? { Range: range as string } : {},
            }).catch(() => null);

            if (streamRes && streamRes.ok) {
              res.status(streamRes.status);
              res.setHeader("Content-Type", matched.mimeType || "video/mp4");
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

  // 3. Fallback test video (W3Schools is completely open and free of 403 restrictions)
  const fallbackUrls = [
    "https://www.w3schools.com/html/mov_bbb.mp4",
    "https://www.w3schools.com/html/movie.mp4",
    "https://placeholdervideo.dev/1280x720"
  ];
  for (const fallbackUrl of fallbackUrls) {
    try {
      const range = req.headers.range;
      const streamRes = await fetch(fallbackUrl, {
        headers: range ? { Range: range as string } : {},
      });
      if (streamRes.ok && streamRes.body) {
        res.status(streamRes.status);
        res.setHeader("Content-Type", "video/mp4");
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
  }

  res.status(500).end("Streaming video failed completely");
}
