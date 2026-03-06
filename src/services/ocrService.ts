import { GoogleGenAI } from "@google/genai";
import { resizeImage } from "../utils/imageUtils";

// Initialize Gemini API with the environment-provided key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Extracts lyrics from an image using Gemini's multimodal capabilities.
 * Resizes the image first to ensure the payload is within RPC limits.
 */
export async function extractTextFromImage(base64Image: string): Promise<string> {
  try {
    // 1. Resize image to prevent "Rpc failed due to xhr error" (often caused by payload size)
    const resizedBase64 = await resizeImage(base64Image, 1024);
    
    // 2. Extract the raw base64 data (remove data:image/jpeg;base64, prefix)
    const imageData = resizedBase64.split(',')[1] || resizedBase64;

    // 3. Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageData,
              },
            },
            {
              text: "Extract ONLY the lyrics from this image. Return just the text of the song, preserving line breaks. Do not include chords, numbers, or any commentary.",
            },
          ],
        },
      ],
    });

    if (!response || !response.text) {
      console.warn("Gemini returned an empty response for OCR");
      return "";
    }

    return response.text.trim();
  } catch (error: any) {
    // Detailed logging for debugging
    console.error("Gemini OCR Error Details:", {
      message: error.message,
      stack: error.stack,
      error: error
    });
    
    // Throw a user-friendly error
    throw new Error("Не вдалося розпізнати текст з зображення. Спробуйте інше фото або менший файл.");
  }
}
