// @ts-ignore
import worker from "./worker.js";

export default async function handler(req: any, res: any) {
  try {
    const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
    const host =
      (req.headers["x-forwarded-host"] as string) ||
      (req.headers.host as string) ||
      "localhost";
    let pathname = req.url || "/";
    if (pathname === "/search-suggestions") pathname = "/api/ytmusic/search-suggestions";
    const url = `${protocol}://${host}${pathname}`;

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

    let body: Uint8Array | undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body) {
        const str = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        body = new TextEncoder().encode(str);
      }
    }

    const webReq = new Request(url, {
      method: req.method,
      headers,
      body: body ? (body as any) : undefined,
      // @ts-ignore
      duplex: "half",
    });

    const response = await worker.fetch(
      webReq,
      {} as any,
      {
        waitUntil: () => {},
        passThroughOnException: () => {},
      } as any
    );

    res.status(response.status);
    response.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });

    const arrayBuffer = await response.arrayBuffer();
    const buf = (globalThis as any).Buffer
      ? (globalThis as any).Buffer.from(arrayBuffer)
      : new Uint8Array(arrayBuffer);
    res.send(buf);
  } catch (error: any) {
    console.error("[Vercel Function] Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
