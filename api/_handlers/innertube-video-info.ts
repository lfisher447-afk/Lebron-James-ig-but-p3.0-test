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

  const videoId = (req.query.id as string) || "";
  if (!videoId) {
    return res.status(400).json({ error: "Missing video id (?id=...)" });
  }

  const cleanId = videoId.replace(/^(yt_|sp_bridge_)/, "").trim();

  // 1. Invidious Video Info
  for (const node of invidiousNodes) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${node}/api/v1/videos/${encodeURIComponent(cleanId)}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const related = (data.recommendedVideos || []).slice(0, 10).map((r: any) => ({
          id: r.videoId,
          title: r.title || "Related Track",
          author: r.author || "YouTube Channel",
          duration: `${Math.floor((r.lengthSeconds || 0) / 60)}:${String((r.lengthSeconds || 0) % 60).padStart(2, "0")}`,
          thumbnail: r.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`,
        }));

        const availableResolutions = Array.from(
          new Set(
            (data.formatStreams || [])
              .map((f: any) => f.qualityLabel || f.resolution)
              .filter(Boolean)
          )
        );

        return res.json({
          videoId: cleanId,
          title: data.title || "YouTube Video",
          author: data.author || "YouTube Channel",
          authorId: data.authorId || "",
          durationSeconds: data.lengthSeconds || 0,
          durationFormatted: `${Math.floor((data.lengthSeconds || 0) / 60)}:${String((data.lengthSeconds || 0) % 60).padStart(2, "0")}`,
          viewCountFormatted: data.viewCount ? Number(data.viewCount).toLocaleString() + " views" : "",
          description: data.description || "",
          thumbnail: data.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${cleanId}?autoplay=1&enablejsapi=1`,
          streamUrl: `/api/audio/stream?id=${cleanId}`,
          videoStreamUrl: `/api/video/stream?id=${cleanId}&res=720p`,
          availableResolutions: availableResolutions.length > 0 ? availableResolutions : ["1080p", "720p", "480p", "360p"],
          formats: data.adaptiveFormats || [],
          relatedVideos: related,
        });
      }
    } catch {}
  }

  // 2. oEmbed Fallback
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(cleanId)}&format=json`
    );
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      return res.json({
        videoId: cleanId,
        title: oembed.title || "YouTube Video",
        author: oembed.author_name || "YouTube Channel",
        authorUrl: oembed.author_url,
        durationSeconds: 210,
        durationFormatted: "3:30",
        viewCountFormatted: "",
        description: `Uploaded by ${oembed.author_name || "YouTube Channel"}`,
        thumbnail: oembed.thumbnail_url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${cleanId}?autoplay=1&enablejsapi=1`,
        streamUrl: `/api/audio/stream?id=${cleanId}`,
        videoStreamUrl: `/api/video/stream?id=${cleanId}&res=720p`,
        availableResolutions: ["1080p", "720p", "480p", "360p"],
        formats: [],
        relatedVideos: [],
      });
    }
  } catch {}

  return res.status(404).json({ error: "Could not fetch video metadata for ID: " + cleanId });
}
