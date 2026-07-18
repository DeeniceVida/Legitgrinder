// The Manager (Supervisor) — Cloudflare Pages Function.
// Dennis talks to one assistant; it answers from a snapshot of his business and,
// when he wants to DO something, returns an action so the dashboard opens the
// right worker (catalog / message / tracking / group buys) pre-filled. It never
// writes data itself — human-in-the-loop, like every other agent here.

interface Env { ANTHROPIC_API_KEY: string; }

const RESPOND_TOOL = {
  name: 'respond',
  description: 'Reply to the admin and, if he wants to take an action, say which tool to open.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      reply: { type: 'string', description: 'Your short, friendly reply to the admin (Kenyan English ok).' },
      action: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: {
            type: 'string',
            enum: ['none', 'open_catalog', 'draft_message', 'open_tracking', 'open_group_buys'],
            description: 'Which dashboard tool to open. "none" if the reply is just an answer.'
          },
          invoice_number: { type: 'string', description: 'For draft_message/open_tracking: the order number (digits only, no IG- prefix).' },
          intent: { type: 'string', enum: ['reminder', 'ready', 'shipped', 'thanks', 'custom'], description: 'For draft_message: which message.' }
        },
        required: ['type']
      }
    },
    required: ['reply', 'action']
  }
} as const;

const SYSTEM = `You are "the Manager" — Dennis's operations assistant for LegitGrinder Imports (a Kenyan import & sourcing business). Dennis talks to you and you help him run the day.

You are given a SNAPSHOT of current business data. Answer questions ONLY from that snapshot — never invent orders, numbers, or clients. If something isn't in the snapshot, say you don't see it. Keep replies short and practical; Kenyan English is fine.

When Dennis wants to DO something, set "action" so the dashboard opens the right tool for him to confirm (you never make changes yourself):
- Add / list a new product → open_catalog
- Message a client about an order → draft_message (set invoice_number = the order's digits, and intent: reminder | ready | shipped | thanks | custom)
- Update tracking / mark a shipment stage / container arrived → open_tracking (set invoice_number)
- Anything about group buys / bulk campaigns → open_group_buys
- Pure question or chit-chat → type: "none"

Match orders by client name or product from the snapshot to find the invoice_number. If you can't tell which order he means, ask him to clarify instead of guessing. Always call the respond tool.

IMPORTANT — Dennis usually talks to you through voice transcription, so his words often arrive mis-heard or garbled (wrong words, mangled product or client names, odd phrasing). Read for INTENT the way a sharp human assistant would: match approximate or misspelled names against the snapshot (sound-alike and close spellings count), ignore filler, and never take an obviously mis-transcribed word literally. If the overall intent is clear, act on it confidently; only ask a follow-up when a detail that actually matters (which client, which order, an amount) stays genuinely ambiguous.

If he asks what you can do, tell him plainly: (1) reports and answers from live data — orders, balances owed, what needs attention, group buys, shop stock; (2) actions — add a product (opens the product writer), draft a WhatsApp message to a client, update an order's tracking, manage group buys. Explain that for actions you open the tool pre-filled and he confirms — nothing ever happens behind his back, which is also how he always knows what was done.`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY missing' }, 500);

    const body = await request.json() as { messages?: { role: string; content: string }[]; snapshot?: string };
    const history = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (history.length === 0) return json({ error: 'No message.' }, 400);

    const system = `${SYSTEM}\n\n=== SNAPSHOT (live business data) ===\n${body.snapshot || '(none provided)'}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 900,
        thinking: { type: 'disabled' },
        system,
        tools: [RESPOND_TOOL],
        tool_choice: { type: 'tool', name: 'respond' },
        messages: history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      })
    });

    const data = await res.json() as any;
    if (!res.ok) { console.error('Anthropic error:', data); return json({ error: data.error?.message || 'Manager failed to respond.' }, 502); }

    const tool = Array.isArray(data.content) ? data.content.find((b: any) => b.type === 'tool_use' && b.name === 'respond') : null;
    if (!tool) return json({ error: 'No reply.' }, 502);

    const out = tool.input || {};
    return json({ reply: out.reply || '', action: out.action || { type: 'none' } });
  } catch (err: any) {
    console.error('supervisor crash:', err);
    return json({ error: err.message || 'Unexpected error.' }, 500);
  }
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}
