require("dotenv").config();

const express = require("express");
const AddisAI = require("addisai").default || require("addisai");

if (!process.env.ADDIS_API_KEY) {
  throw new Error("ADDIS_API_KEY must be configured");
}

const app = express();
const addis = new AddisAI({ apiKey: process.env.ADDIS_API_KEY });

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/api/tts", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const clip = await addis.voice.generate({
      text,
      language: "am",
      voiceId: "am-hamen",
      outputFormat: "mp3_44100",
    });
    res.json({ audioUrl: clip.audioUrl });
  } catch (error) {
    console.error("Addis AI request failed:", error);
    res.status(502).json({ error: "Speech generation failed" });
  }
});

app.use((error, _req, res, _next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }

  console.error("Request handling failed:", error);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
