import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const prompt = req.body?.prompt || (req.query?.prompt as string);
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt parameter" });
  }

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "You are the Spotui Web AI Music & Artist Oracle. Answer the user's questions about music artists, track trivia, tours, album releases, and general industry updates accurately by using the Google Search tool. Keep answers structured, highly concise, and deeply interesting. Present information in markdown format.",
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;

    res.json({
      answer: text,
      groundingMetadata,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "AI Oracle request failed" });
  }
}
