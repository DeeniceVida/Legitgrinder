import { GoogleGenAI } from "@google/genai";

// Always use named parameter and direct process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `
You are the LegitGrinder AI Assistant. LegitGrinder is a premium logistics brand in Kenya that imports goods from China and the USA.
Your goal is to answer questions about shipping times, fees, and the process.

Key Info:
- China Air: 2-3 weeks.
- China Sea: 45-50 days.
- USA Air: 3-4 weeks.
- USA Sea: 3 months.
- Fees: Buying price (includes 5% transaction fee), Shipping fee (weight/volume based), and Service fee (Min $30 or 6% for >100k KES).
- Specific US Phone Formula: $1 = 135 KES. Cost includes +$20 flat + 3.5% shipping + service fee ($30 or 4.5% if value > $750).
- Location: Nairobi CBD (collection point).
- Founder/Owner: Known for helpfulness on TikTok/Instagram.
- Contact: WhatsApp +254791873538.

Be professional, concise, and helpful. Use Kenyan English where appropriate but keep it professional.
`;

export async function askAssistant(userMessage: string) {
  try {
    // Fix: Using gemini-3-flash-preview as it is the recommended model for basic text tasks like customer Q&A
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });
    // Use .text property directly
    return response.text;
  } catch (error) {
    console.error("AI Assistant error:", error);
    return "I'm having a bit of trouble connecting to my brain right now. Please try again or message us on WhatsApp!";
  }
}