require("dotenv").config();

const express = require("express");
const path = require("path");
const AddisAI = require("addisai").default || require("addisai");

const app = express();
const addis = new AddisAI();

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    const clip = await addis.voice.generate({
      text,
      language: "am",
      voiceId: "am-hamen",
      outputFormat: "mp3_44100",
    });
    res.json({ audioUrl: clip.audioUrl });
  } catch (error) {
    console.error("addis AI error:", error);
    res.status(500).json({
      error: error.message || "failed to generate speech",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
