import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const clientId = process.env.SPOTIFY_CLIENT_ID || "demo_spotify_client";
  const redirectUri = process.env.APP_URL
    ? `${process.env.APP_URL}/auth/callback`
    : `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope:
      "user-read-private user-read-email playlist-read-private playlist-read-collaborative user-library-read",
  });

  res.json({
    url: `https://accounts.spotify.com/authorize?${params.toString()}`,
    redirectUri,
    hasCredentials: !!process.env.SPOTIFY_CLIENT_ID,
  });
}
