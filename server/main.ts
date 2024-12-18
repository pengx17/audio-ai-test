import path from "node:path";
import express from "express";
import fs from "node:fs/promises";
import { whisper } from "./whisper";

const app = express();

// Configure express to handle raw binary data
app.use(express.raw({ type: "audio/*", limit: "50mb" }));

// Add CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

app.post("/transcribe", async (req, res) => {
  const startTime = Date.now();
  let writeTime = 0;
  let transcribeTime = 0;

  try {
    if (!req.body || !req.body.length) {
      console.log("Received empty request body");
      return res.status(400).json({ error: "No audio data provided" });
    }

    // Check content type
    const contentType = req.headers["content-type"];
    console.log(`Received request with content-type: ${contentType}`);
    if (!contentType || !contentType.startsWith("audio/")) {
      console.log(`Rejected invalid content-type: ${contentType}`);
      return res.status(415).json({
        error: "Unsupported Media Type. Please provide audio content.",
      });
    }

    // Get file extension from content type
    const extension = contentType.split("/")[1];

    const tmpDir = path.join(process.cwd(), "tmp-" + Date.now());
    await fs.mkdir(tmpDir, { recursive: true });
    // Create a temporary file to store the audio data with proper extension
    const tempFile = path.join(tmpDir, `audio.${extension}`);
    console.log(`Creating temporary file: ${tempFile}`);

    const writeStart = Date.now();
    await fs.writeFile(tempFile, req.body);
    writeTime = Date.now() - writeStart;
    console.log(`File write took ${writeTime}ms`);

    try {
      console.log("Starting transcription...");
      const transcribeStart = Date.now();
      // requires "pip install mlx-whisper" (for Mac M chips)
      const result = await whisper(tempFile, {
        model: "mlx-community/whisper-turbo",
        output_dir: tmpDir,
        output_format: "txt",
      });

      const contents = await result.txt.getContent();
      transcribeTime = Date.now() - transcribeStart;
      console.log(`Transcription took ${transcribeTime}ms`);

      const totalTime = Date.now() - startTime;
      console.log(`Total processing time: ${totalTime}ms`);

      res.json({
        transcription: contents,
        metrics: {
          writeTime,
          transcribeTime,
          totalTime,
        },
      });
    } finally {
      // Clean up the temporary files and directory
      console.log(`Cleaning up temporary directory: ${tmpDir}`);
      await fs.rm(tmpDir, { recursive: true, force: true }).catch((err) => {
        console.error("Failed to delete temporary directory:", err);
      });
    }
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("Transcription failed:", error, {
      metrics: {
        writeTime,
        transcribeTime,
        totalTime,
      },
    });
    res.status(500).json({
      error: "Failed to transcribe audio",
      metrics: {
        writeTime,
        transcribeTime,
        totalTime,
      },
    });
  }
});

const PORT = process.env.PORT || 6544;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
