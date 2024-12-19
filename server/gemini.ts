import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-2.0-flash-exp";
const DEFAULT_MODE = "transcript";

export async function gemini(
  audioBuffer: Buffer,
  options?: {
    model?: "gemini-2.0-flash-exp" | "gemini-1.5-flash";
    mode?: "transcript" | "summary";
  }
) {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  }

  // Initialize GoogleGenerativeAI with your API_KEY.
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

  // Initialize a Gemini model appropriate for your use case.
  const model = genAI.getGenerativeModel({
    model: options?.model || DEFAULT_MODEL,
  });

  const prompts = {
    transcript:
      "Generate a transcript of the speech. Do not output any other text.",
    summary: "Please summarize the audio.",
  };

  // Generate content using a prompt and the metadata of the uploaded file.
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "audio/wav",
        data: audioBuffer.toString("base64"),
      },
    },
    {
      text: prompts[options?.mode || DEFAULT_MODE],
    },
  ]);

  return result.response.text();
}
