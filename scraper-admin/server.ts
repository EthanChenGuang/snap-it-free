import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3004;

  app.use(express.json());

  // Gemini client initialization
  const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Translation Endpoint using Gemini
  app.post("/api/translate", async (req, res) => {
    try {
      const { listingId, source, text, targetLanguage = "English" } = req.body;

      if (!text) {
        return res.status(400).json({ error: "No text provided for translation" });
      }

      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Translate the following web scraper listing payload content into ${targetLanguage}. Keep property terms, numbers, and formatting clear and accurate.\n\nSource: ${source || "Web Scraper"}\nListing ID: ${listingId || "N/A"}\nContent: "${text}"`,
        config: {
          systemInstruction: "You are a specialized translator for international real estate and marketplace scraped listings.",
          temperature: 0.3,
        },
      });

      const translatedText = response.text || text;
      return res.json({
        success: true,
        listingId,
        translatedText,
        translatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Translation API error:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to translate listing via Gemini API",
      });
    }
  });

  // Vite middleware for development vs production static serving
  if (process.env.NODE_ENV !== "production") {
    const hmrPort = Number(process.env.VITE_HMR_PORT) || PORT + 20000;
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { port: hmrPort },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
