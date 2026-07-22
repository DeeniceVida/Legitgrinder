// Message Agent — Cloudflare Pages Function
// Drafts a ready-to-send WhatsApp message for a client about their order.
// The admin picks the intent, the agent writes it, the admin reviews and sends
// by hand (no auto-send — WhatsApp bans automation). Server-side so the Claude
// key stays secret.

interface Env {
  ANTHROPIC_API_KEY: string;
}

interface MessageRequest {
  intent?: 'reminder' | 'ready' | 'shipped' | 'thanks' | 'review' | 'custom';
  clientName?: string;
  productName?: string;
  invoiceNumber?: string;
  totalKES?: number;
  balanceKES?: number;
  isPaid?: boolean;
  status?: string;        // current order status
  payLink?: string;       // /pay/:invoiceNumber (only when a balance is due)
  trackingLink?: string;  // /tracking?id=:invoiceNumber
  reviewLink?: string;    // Google review link (intent = 'review')
  custom?: string;        // free-text instruction when intent = 'custom'
}

const INTENT_BRIEF: Record<string, string> = {
  reminder: 'A friendly payment reminder. The client still owes a balance — nudge them warmly to clear it and include the pay link. Do not be pushy.',
  ready: 'Great news: the order has arrived and is ready. Tell them it is ready for CBD pickup or delivery, and how to proceed. If a balance is still due, mention it and include the pay link so they clear it before collecting.',
  shipped: 'An update that the order has shipped / is on its way, with the tracking link so they can follow it. Reassure them about the delivery window.',
  thanks: 'A warm thank-you confirming their order/payment was received, with a short note on what happens next.',
  review: 'The order has been delivered. Warmly thank the client and ask them to leave an honest review of their experience with LegitGrinder. Kindly ask them to snap a few PHOTOS and a short VIDEO of the product and include those in their review, and to share their genuine, honest thoughts — it really helps other Kenyan buyers trust us. Include the review link on its own line. Be appreciative and light, never demanding, and do NOT offer any incentive or ask for a specific star rating.',
  custom: 'Follow the specific instruction the admin gives below.'
};

const SYSTEM_PROMPT = `You write WhatsApp messages that Dennis (owner of LegitGrinder Imports, a Kenyan import & sourcing business) sends to his clients. He will read your draft and send it himself.

Voice: warm, personal, professional, and concise — like a trusted agent texting a client, not a marketing blast. Kenyan English where natural. Keep it short enough for WhatsApp (a few short lines). At most one or two tasteful emoji. Address the client by first name. Never invent amounts, dates, or facts you were not given. If a pay link or tracking link is provided and relevant, include it on its own line. Sign off simply as "— Dennis, LegitGrinder". Output ONLY the message text, nothing else.`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'Server misconfiguration: ANTHROPIC_API_KEY missing' }, 500);
    }

    const b = (await request.json()) as MessageRequest;
    const intent = b.intent || 'custom';

    const firstName = (b.clientName || 'there').trim().split(/\s+/)[0];
    const lines: string[] = [];
    lines.push(`Intent: ${INTENT_BRIEF[intent] || INTENT_BRIEF.custom}`);
    lines.push(`Client first name: ${firstName}`);
    if (b.productName) lines.push(`Order: ${b.productName}`);
    if (b.invoiceNumber) lines.push(`Invoice: ${b.invoiceNumber}`);
    if (b.status) lines.push(`Current status: ${b.status}`);
    if (typeof b.totalKES === 'number') lines.push(`Order total: KES ${b.totalKES.toLocaleString()}`);
    if (typeof b.balanceKES === 'number' && b.balanceKES > 0) {
      lines.push(`Balance still due: KES ${b.balanceKES.toLocaleString()}`);
      if (b.payLink) lines.push(`Pay link (include this): ${b.payLink}`);
    } else if (b.isPaid) {
      lines.push('Payment status: fully paid — do NOT ask for money.');
    }
    if (b.trackingLink && (intent === 'shipped' || intent === 'ready')) {
      lines.push(`Tracking link (include this): ${b.trackingLink}`);
    }
    if (intent === 'review' && b.reviewLink) {
      lines.push(`Review link (include this on its own line): ${b.reviewLink}`);
    }
    if (intent === 'custom' && b.custom) lines.push(`Admin instruction: ${b.custom}`);

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 600,
        thinking: { type: 'disabled' },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Draft the WhatsApp message.\n\n${lines.join('\n')}` }]
      })
    });

    const data = (await anthropicRes.json()) as any;
    if (!anthropicRes.ok) {
      console.error('Anthropic error:', data);
      return json({ error: data.error?.message || 'The message agent failed to respond.' }, 502);
    }

    const text = Array.isArray(data.content)
      ? data.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('').trim()
      : '';

    if (!text) return json({ error: 'The message agent returned nothing. Please try again.' }, 502);

    return json({ message: text });
  } catch (err: any) {
    console.error('message-agent crash:', err);
    return json({ error: err.message || 'Unexpected error.' }, 500);
  }
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
