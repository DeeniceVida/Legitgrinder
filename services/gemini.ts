// This service now calls the secure Cloudflare Function
// to avoid exposing the API key in the client bundle.

export async function askAssistant(userMessage: string) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      throw new Error(errorData.error || 'Failed to fetch response');
    }

    const data = await response.json() as { reply: string };
    return data.reply;
  } catch (error) {
    console.error("AI Assistant error:", error);
    return "I'm having a bit of trouble connecting to my brain right now. Please try again later or message us on WhatsApp!";
  }
}