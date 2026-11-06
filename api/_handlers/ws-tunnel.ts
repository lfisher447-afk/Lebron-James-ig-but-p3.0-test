import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Public music search helper (provides real search results on Vercel without API keys)
 */
async function performLiveMusicSearch(query: string) {
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15`;
    const res = await fetch(itunesUrl, { headers: { "User-Agent": "Spotui-Tunnel/1.0" } });
    if (!res.ok) throw new Error("Search provider unreachable");

    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;

    return data.results.map((track: any) => ({
      id: String(track.trackId),
      title: track.trackName,
      artist: track.artistName,
      album: track.collectionName || "Single",
      duration: Math.round((track.trackTimeMillis || 210000) / 1000),
      durationText: `${Math.floor((track.trackTimeMillis || 0) / 60000)}:${String(Math.floor(((track.trackTimeMillis || 0) % 60000) / 1000)).padStart(2, "0")}`,
      thumbnail: track.artworkUrl100 ? track.artworkUrl100.replace("100x100bb", "600x600bb") : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
      streamUrl: track.previewUrl || "", // Direct 30s preview stream
      views: "Popular Track",
      source: "itunes-live",
    }));
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Handle WebSocket upgrade attempts cleanly
  const isWebSocketUpgrade =
    req.headers.upgrade?.toLowerCase() === "websocket" ||
    (req.headers.connection || "").toLowerCase().includes("upgrade");

  if (isWebSocketUpgrade) {
    return res.status(426).json({
      error: "WebSocket upgrades are not supported on Vercel Serverless.",
      hint: "Use HTTP POST packet dispatch or SSE transport (/api/ws-tunnel?transport=sse).",
      transport: "http-sse-longpoll",
    });
  }

  // Handle Server-Sent Events (SSE) stream if requested
  const isEventStream =
    req.query.transport === "sse" ||
    (req.headers.accept || "").includes("text/event-stream");

  if (isEventStream) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`data: ${JSON.stringify({ type: "tunnel_ready", timestamp: Date.now() })}\n\n`);
    return res.end();
  }

  // Parse parameters from POST body or GET query
  const body = req.body || {};
  const query = req.query || {};

  const type = body.type || query.type;
  const id = body.id || query.id || "pkt_" + Date.now();
  const searchQuery = body.query || query.query || body.payload?.query || query.q || "";

  // 1. YouTube / Music Search
  if (type === "yt_search" || type === "search") {
    const queryStr = String(searchQuery || "Trending Music").trim();
    const liveResults = await performLiveMusicSearch(queryStr);

    if (liveResults && liveResults.length > 0) {
      return res.json({ id, payload: liveResults, wsmTunnel: true, source: "live" });
    }

    // Fallback Mock Items if upstream rate limits
    const mockItems = [
      {
        id: "synth_01",
        title: `${queryStr} (Stealth Fast Stream)`,
        artist: "Innertube Edge Node",
        duration: 215,
        durationText: "3:35",
        thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
        views: "2.4M views",
      },
      {
        id: "synth_02",
        title: "Resonance - Stealth Tunnel",
        artist: "HOME",
        duration: 212,
        durationText: "3:32",
        thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80",
        views: "890K views",
      },
    ];
    return res.json({ id, payload: mockItems, wsmTunnel: true, source: "mock" });
  }

  // 2. Spotify Sync via Tunnel
  if (type === "spotify_sync_playlists") {
    const mockPlaylists = [
      {
        id: "sp_vercel_hits",
        name: "Spotify: Global Top 50 (Vercel Edge)",
        source: "spotify",
        tracks: [
          { id: "sp_01", title: "Starboy", artist: "The Weeknd ft. Daft Punk", album: "Starboy", duration: 230, thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80", source: "spotify" },
          { id: "sp_02", title: "Midnight City", artist: "M83", album: "Hurry Up", duration: 243, thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80", source: "spotify" },
        ],
      },
    ];
    return res.json({ id, payload: mockPlaylists, wsmTunnel: true });
  }

  // 3. YouTube Sync via Tunnel
  if (type === "yt_sync_playlists") {
    const mockYtPlaylists = [
      {
        id: "yt_vercel_top",
        name: "YouTube Music: Trending Global (Vercel)",
        source: "youtube",
        tracks: [
          { id: "kJQP7kiw5Fk", title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee", album: "VIDA", duration: 228, thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80" },
          { id: "OPf0YbXqDm0", title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", album: "Uptown Special", duration: 270, thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80" },
        ],
      },
    ];
    return res.json({ id, payload: mockYtPlaylists, wsmTunnel: true });
  }

  // 4. Shazam Recognition via Tunnel
  if (type === "shazam_recognize") {
    const match = {
      title: body.trackTitle || query.trackTitle || "Resonance",
      artist: body.trackArtist || query.trackArtist || "HOME",
      album: "Odyssey",
      genre: "Synthwave / Electronic",
      confidence: 0.99,
      artwork: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80",
      key: "F# Minor",
      bpm: 105,
    };
    return res.json({ id, payload: { match }, wsmTunnel: true });
  }

  // Default Status Check
  return res.json({
    status: "ws-tunnel-ready",
    transport: "http-sse-longpoll",
    supportedTypes: ["yt_search", "spotify_sync_playlists", "yt_sync_playlists", "shazam_recognize"],
  });
}
