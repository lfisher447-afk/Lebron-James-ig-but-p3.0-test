import { VercelRequest, VercelResponse } from "@vercel/node";
// @ts-ignore
import worker from "../worker.js";

async function fallbackYouTubeSearch(query: string) {
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(4500),
      }
    );
    const html = await res.text();
    const match =
      html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
      html.match(/ytInitialData\s*=\s*({.*?});/s);

    if (match) {
      const data = JSON.parse(match[1]);
      const sections =
        data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const results: any[] = [];

      for (const s of sections) {
        const items = s.itemSectionRenderer?.contents || [];
        for (const item of items) {
          if (item.videoRenderer) {
            const v = item.videoRenderer;
            results.push({
              id: v.videoId,
              videoId: v.videoId,
              title: v.title?.runs?.map((r: any) => r.text).join("") || v.title?.simpleText || "YouTube Music Track",
              author: v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || "YouTube Artist",
              artist: v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || "YouTube Artist",
              duration: v.lengthText?.simpleText || "3:30",
              durationSeconds: 210,
              img: v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              thumbnail: v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              subtext: v.ownerText?.runs?.[0]?.text || "YouTube Artist",
              type: "song",
              streamUrl: `/api/audio/stream?id=${v.videoId}`,
            });
          }
        }
      }
      if (results.length > 0) return results.slice(0, 24);
    }
  } catch (e: any) {
    console.warn("[YTMusic Scraper Fallback Error]:", e?.message);
  }
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") return res.status(200).end();

  const reqUrl = req.url || "/";
  const searchMatch = reqUrl.match(/[?&]q=([^&]+)/) || reqUrl.match(/[?&]query=([^&]+)/);
  const query = searchMatch ? decodeURIComponent(searchMatch[1]).trim() : "";

  try {
    const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
    const host = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string) || "localhost";
    const url = `${protocol}://${host}${reqUrl}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, String(v)));
        } else {
          headers.set(key, String(value));
        }
      }
    }

    const webReq = new Request(url, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
      // @ts-ignore
      duplex: "half",
    });

    const response = await worker.fetch(webReq, {} as any, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    } as any);

    if (response.status >= 400 && query) {
      const fallbackResults = await fallbackYouTubeSearch(query);
      return res.status(200).json(fallbackResults);
    }

    res.status(response.status);
    response.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });

    const arrayBuffer = await response.arrayBuffer();
    const text = Buffer.from(arrayBuffer).toString("utf-8");

    // Check if body contained any Innertube unrecognized view errors
    if (
      text.includes("OfficialCardView") ||
      text.includes("HorizontalShelfView") ||
      text.includes("CtaCarouselItemView") ||
      text.includes("CarouselItemView") ||
      text.includes("ParsingError") ||
      text.includes("InnertubeError") ||
      text.includes("not found!")
    ) {
      console.warn("[YTMusic Handler] Intercepted Innertube view ParsingError, serving fallback...");
      const fallbackResults = await fallbackYouTubeSearch(query || "Trending Music");
      return res.status(200).json(fallbackResults);
    }

    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.warn("[YTMusic Handler Worker Exception]:", error?.message, "Serving fallback...");
    if (query) {
      const fallbackResults = await fallbackYouTubeSearch(query);
      return res.status(200).json(fallbackResults);
    }
    res.status(200).json([]);
  }
}
