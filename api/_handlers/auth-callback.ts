import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const code = (req.query.code as string) || "";
  const error = (req.query.error as string) || "";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Spotui Spotify Authentication</title>
    <style>
      body {
        background-color: #050b14;
        color: #e2e8f0;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
      }
      .card {
        background: #0f172a;
        padding: 2.5rem;
        border-radius: 1.5rem;
        border: 1px solid #1e293b;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        max-width: 400px;
      }
      .spinner {
        width: 3rem;
        height: 3rem;
        border: 3px solid rgba(56, 189, 248, 0.2);
        border-top-color: #38bdf8;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 1.5rem auto;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      h2 { margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 700; color: #f8fafc; }
      p { margin: 0; color: #94a3b8; font-size: 0.875rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h2>Connecting to Spotui...</h2>
      <p>Synchronizing authentication token securely.</p>
    </div>
    <script>
      (function() {
        const payload = {
          type: 'SPOTIFY_AUTH_SUCCESS',
          code: ${JSON.stringify(code)},
          error: ${JSON.stringify(error)}
        };

        if (window.opener) {
          try {
            window.opener.postMessage(payload, '*');
          } catch (e) {
            console.error('Failed to postMessage to opener:', e);
          }
          setTimeout(() => {
            window.close();
          }, 600);
        } else {
          // If not in a popup, redirect back to root with auth code
          window.location.href = '/#code=' + encodeURIComponent(${JSON.stringify(code)});
        }
      })();
    </script>
  </body>
</html>`;

  res.send(html);
}
