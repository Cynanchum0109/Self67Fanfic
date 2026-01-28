
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateStorySummary(content: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a sophisticated literary critic. Provide a concise, evocative summary (about 100 words) of the following novel chapter. Use a poetic and minimalist tone. \n\nContent: ${content.substring(0, 5000)}`,
      config: {
        temperature: 0.7,
        topP: 0.95,
      },
    });
    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The muse is resting. (Error generating summary)";
  }
}

export async function analyzeMood(content: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the mood of this text in 3 words (e.g., "Melancholic, Hopeful, Ethereal"). \n\nText: ${content.substring(0, 1000)}`,
      config: {
        temperature: 0.5,
      },
    });
    return response.text || "Quiet, Mysterious, Deep";
  } catch (error) {
    return "Serene, Focused, Calm";
  }
}
