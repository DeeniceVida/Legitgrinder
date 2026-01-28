interface Env {
    GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { request, env } = context;
        const body = await request.json() as { message: string };
        const userMessage = body.message;

        if (!userMessage) {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!env.GEMINI_API_KEY) {
            return new Response(JSON.stringify({ error: 'Server misconfiguration: API Key missing' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

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

        // Direct fetch to Gemini API to avoid installing large SDK in the edge function if possible,
        // or we can use the SDK if we add it to the functions dependencies.
        // For simplicity and bundle size, a direct REST call is often better in Cloudflare Workers/Pages.

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: SYSTEM_PROMPT + "\n\nUser: " + userMessage }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7
                }
            }),
        });

        const data = await response.json() as any;

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch from Gemini');
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble thinking right now.";

        return new Response(JSON.stringify({ reply: text }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
