import { GoogleGenerativeAI } from "@google/generative-ai";

export async function gemini(audioBuffer: Buffer) {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  }

  // Initialize GoogleGenerativeAI with your API_KEY.
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

  // Initialize a Gemini model appropriate for your use case.
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  // Generate content using a prompt and the metadata of the uploaded file.
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "audio/wav",
        data: audioBuffer.toString("base64"),
      },
    },
    { text: "Generate a transcript of the speech." },
  ]);

  return result.response.text();
}
