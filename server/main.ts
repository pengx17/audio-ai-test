import path from "node:path";
import express, { RequestHandler } from "express";
import fs from "node:fs/promises";
import multer from "multer";
import { fileURLToPath } from "node:url";
import { whisper } from "./whisper";
import { gemini } from "./gemini";

const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const tmpDir = await fs.mkdtemp(path.join(__dirname, "tmp"));
      cb(null, tmpDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname) || ".wav";
      cb(null, `audio-${uniqueSuffix}${ext}`);
    },
  }),
});

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

abstract class ASRProvider {
  abstract transcribe(
    audioFile: string,
    options: {
      tmpDir: string;
    }
  ): Promise<string>;
}

class WhisperProvider extends ASRProvider {
  async transcribe(
    audioFile: string,
    { tmpDir }: { tmpDir: string }
  ): Promise<string> {
    // requires "pip install mlx-whisper" (for Mac M chips)
    const result = await whisper(audioFile, {
      model: "mlx-community/whisper-turbo",
      output_dir: tmpDir,
      output_format: "txt",
    });
    const contents = await result.txt.getContent();
    return contents;
  }
}

class GeminiProvider extends ASRProvider {
  async transcribe(audioFile: string): Promise<string> {
    const audioBuffer = await fs.readFile(audioFile);
    return gemini(audioBuffer);
  }
}

const whisperProvider = new WhisperProvider();
const geminiProvider = new GeminiProvider();

app.post(
  "/transcribe",
  upload.single("audio") as unknown as RequestHandler,
  async (req, res) => {
    const startTime = Date.now();
    let transcribeTime = 0;

    try {
      if (!req.file) {
        console.log("No file uploaded");
        return res.status(400).json({ error: "No audio file provided" });
      }

      const providerType = req.query.provider as "whisper" | "gemini";
      let provider: ASRProvider;
      if (providerType === "whisper") {
        provider = whisperProvider;
      } else if (providerType === "gemini") {
        provider = geminiProvider;
      } else {
        return res.status(400).json({ error: "Invalid provider" });
      }

      const tmpDir = path.dirname(req.file.path);

      try {
        console.log("Starting transcription...");
        const transcribeStart = Date.now();
        const contents = await provider.transcribe(req.file.path, {
          tmpDir,
        });
        transcribeTime = Date.now() - transcribeStart;
        console.log(`Transcription took ${transcribeTime}ms`);

        res.json({
          transcription: contents,
          metrics: {
            transcribeTime,
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
          transcribeTime,
          totalTime,
        },
      });
      res.status(500).json({
        error: "Failed to transcribe audio",
        metrics: {
          transcribeTime,
          totalTime,
        },
      });
    }
  }
);

app.post("/summary");

const PORT = process.env.PORT || 6544;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
