import type { VercelRequest, VercelResponse } from "@vercel/node";
import healthHandler from "./_handlers/health.js";
import nodesStatusHandler from "./_handlers/nodes-status.js";
import innertubeSearchHandler from "./_handlers/innertube-search.js";
import innertubeVideoInfoHandler from "./_handlers/innertube-video-info.js";
import audioStreamHandler from "./_handlers/audio-stream.js";
import videoStreamHandler from "./_handlers/video-stream.js";
import spotifyFeaturedHandler from "./_handlers/spotify-featured.js";
import spotifySearchHandler from "./_handlers/spotify-search.js";
import spotifyResolveHandler from "./_handlers/spotify-resolve.js";
import authSpotifyUrlHandler from "./_handlers/auth-spotify-url.js";
import authSpotifyTokenHandler from "./_handlers/auth-spotify-token.js";
import authCallbackHandler from "./_handlers/auth-callback.js";
import invidiousTrendingHandler from "./_handlers/invidious-trending.js";
import invidiousCommentsHandler from "./_handlers/invidious-comments.js";
import invidiousInstancesHandler from "./_handlers/invidious-instances.js";
import aiOracleHandler from "./_handlers/ai-oracle.js";
import proxyHandler from "./_handlers/proxy.js";
import proxyPingHandler from "./_handlers/proxy-ping.js";
import wsTunnelHandler from "./_handlers/ws-tunnel.js";
import ytmusicHandler from "./_handlers/ytmusic.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Global CORS & preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Determine requested route path
  let pathname = "";
  if (req.query?.__route && typeof req.query.__route === "string") {
    pathname = req.query.__route;
  } else if (req.headers["x-matched-path"] && typeof req.headers["x-matched-path"] === "string") {
    pathname = req.headers["x-matched-path"];
  } else if (req.url) {
    try {
      const parsed = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      pathname = parsed.pathname;
    } catch {
      pathname = req.url.split("?")[0] || "";
    }
  }

  // Normalize path
  if (!pathname.startsWith("/")) pathname = "/" + pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  // Route Dispatcher
  if (pathname === "/api/health" || pathname === "/health") {
    return healthHandler(req, res);
  }

  if (pathname === "/api/nodes/status" || pathname === "/api/nodes-status" || pathname === "/nodes/status") {
    return nodesStatusHandler(req, res);
  }

  if (
    pathname === "/api/innertube/search" ||
    pathname === "/api/innertube-search" ||
    pathname === "/api/youtube/search"
  ) {
    return innertubeSearchHandler(req, res);
  }

  if (
    pathname === "/api/innertube/video-info" ||
    pathname === "/api/innertube-video-info"
  ) {
    return innertubeVideoInfoHandler(req, res);
  }

  if (pathname === "/api/audio/stream" || pathname === "/api/audio-stream") {
    return audioStreamHandler(req, res);
  }

  if (pathname === "/api/video/stream" || pathname === "/api/video-stream") {
    return videoStreamHandler(req, res);
  }

  if (pathname === "/api/spotify/featured" || pathname === "/api/spotify-featured") {
    return spotifyFeaturedHandler(req, res);
  }

  if (pathname === "/api/spotify/search" || pathname === "/api/spotify-search") {
    return spotifySearchHandler(req, res);
  }

  if (pathname === "/api/spotify/resolve-playlist" || pathname === "/api/spotify-resolve") {
    return spotifyResolveHandler(req, res);
  }

  if (pathname === "/api/auth/spotify/url" || pathname === "/api/auth-spotify-url") {
    return authSpotifyUrlHandler(req, res);
  }

  if (pathname === "/api/auth/spotify/token" || pathname === "/api/auth-spotify-token") {
    return authSpotifyTokenHandler(req, res);
  }

  if (
    pathname === "/auth/callback" ||
    pathname === "/api/auth/callback" ||
    pathname === "/api/auth-callback"
  ) {
    return authCallbackHandler(req, res);
  }

  if (pathname === "/api/invidious/trending" || pathname === "/api/invidious-trending") {
    return invidiousTrendingHandler(req, res);
  }

  if (pathname === "/api/invidious/comments" || pathname === "/api/invidious-comments") {
    return invidiousCommentsHandler(req, res);
  }

  if (pathname === "/api/invidious/instances" || pathname === "/api/invidious-instances") {
    return invidiousInstancesHandler(req, res);
  }

  if (pathname === "/api/ai/oracle" || pathname === "/api/ai-oracle") {
    return aiOracleHandler(req, res);
  }

  if (
    pathname === "/api/proxy" ||
    pathname === "/api/backup1/proxy" ||
    pathname === "/api/mrbean/proxy"
  ) {
    return proxyHandler(req, res);
  }

  if (pathname === "/api/proxy/ping" || pathname === "/api/proxy-ping") {
    return proxyPingHandler(req, res);
  }

  if (pathname === "/api/ws-tunnel") {
    return wsTunnelHandler(req, res);
  }

  if (pathname.startsWith("/api/ytmusic") || pathname === "/search-suggestions") {
    return ytmusicHandler(req, res);
  }

  return res.status(404).json({
    error: "Not Found",
    path: pathname,
    message: "Endpoint not found on Spotui Serverless Gateway",
    availableEndpoints: [
      "/api/health",
      "/api/nodes/status",
      "/api/innertube/search",
      "/api/innertube/video-info",
      "/api/audio/stream",
      "/api/video/stream",
      "/api/spotify/featured",
      "/api/spotify/search",
      "/api/spotify/resolve-playlist",
      "/api/auth/spotify/url",
      "/api/auth/spotify/token",
      "/auth/callback",
      "/api/invidious/trending",
      "/api/invidious/comments",
      "/api/invidious/instances",
      "/api/ai/oracle",
      "/api/proxy",
      "/api/proxy/ping",
      "/api/ws-tunnel",
    ],
  });
}
