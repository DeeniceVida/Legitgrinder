import { GoogleGenAI } from "@google/genai";
import { KES_PER_USD, WHATSAPP_NUMBER, FEE_STRUCTURE } from "../constants";

// Always use named parameter and direct process.env.API_KEY
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_PROMPT = `
You are the LegitGrinder AI. Be extremely concise. Straight to the point. No fluff.

FACTS:
- China Air: 2-3 weeks
- China Sea: 45-50 days
- USA Air: 3-4 weeks
- USA Sea: 3 months
- Rate: 1 USD = ${KES_PER_USD} KES
- US Phone: (Price + $20 + 3.5% ship) * ${KES_PER_USD} + Service Fee
- Service Fee: $30 (min) or 4.5% if > $750
- Location: Nairobi CBD
- WhatsApp: ${WHATSAPP_NUMBER}

RULES:
1. Answer in 1-2 short sentences max or a simple list.
2. No conversational filler like "I hope this helps" or "Our rates are".
3. Use bold text for key numbers/dates.
4. If details are missing, ask for them briefly.
`;


export async function askAssistant(userMessage: string, history: { role: 'user' | 'assistant', content: string }[] = []) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history: history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Assistant error:", error);
    return "I'm having a bit of trouble connecting to my brain right now. Please try again or message us on WhatsApp!";
  }
}