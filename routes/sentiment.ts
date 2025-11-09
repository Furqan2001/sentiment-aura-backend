import { Router, Request, Response } from "express";
import axios, { AxiosResponse } from "axios";
import { SentimentResult, GeminiResponse } from "../types/Response";
import dotenv from "dotenv";

dotenv.config();

const sentimentRouter = Router();

sentimentRouter.post(
  "/process_text",
  async (req: Request<{}, {}, { text: string }>, res: Response) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res
          .status(400)
          .json({ error: "Invalid text. Please try again" });
      }

      const result = await analyzeWithGemini(text);

      // Normalize response
      const sentiment = Math.max(-1, Math.min(1, result.sentiment || 0));
      const keywords = Array.isArray(result.keywords)
        ? result.keywords.slice(0, 5)
        : [];

      res.json({ sentiment, keywords });
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to analyze sentiment",
        details: error.message,
      });
    }
  }
);

async function analyzeWithGemini(text: string): Promise<SentimentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response: AxiosResponse<GeminiResponse> = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      contents: [
        {
          parts: [
            {
              text: `Analyze sentiment (-1 to 1) and extract 3-5 keywords from: "${text}". Return only JSON: {"sentiment": 0.5, "keywords": ["word1", "word2", ..]}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  return JSON.parse(response.data.candidates[0].content.parts[0].text);
}

export { sentimentRouter };
