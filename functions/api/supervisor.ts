// The Manager (Supervisor) — Cloudflare Pages Function.
// Dennis talks to one assistant; it answers from a snapshot of his business and,
// when he wants something DONE, it prepares the complete work (order payload,
// finished product listing, tracking change, group-buy campaign) and returns it.
// The dashboard shows the prepared work with ONE confirm button; on confirm the
// dashboard executes it and reports back. Hands-free, with a single approval.

interface Env { ANTHROPIC_API_KEY: string; }

const RESPOND_TOOL = {
  name: 'respond',
  description: 'Reply to the admin. If he asked for things to be done, attach one fully-prepared action per item.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      reply: { type: 'string', description: 'Your short, friendly reply to the admin (Kenyan English ok).' },
      actions: {
        type: 'array',
        description: 'One entry per thing to do. If he asked for two orders to be updated, return TWO entries. Empty array for a pure answer.',
        items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: {
            type: 'string',
            enum: [
              'none',
              'create_order', 'create_product', 'update_tracking', 'create_group_buy',
              'open_catalog', 'draft_message', 'open_tracking', 'open_group_buys'
            ],
            description: 'Prefer the create_/update_ executable actions. "none" for a pure answer.'
          },
          invoice_number: { type: 'string', description: 'For draft_message/open_tracking/update_tracking: copy the order ref EXACTLY as it appears in quotes in the snapshot — character for character, including any INV- prefix. Do not reformat it.' },
          intent: { type: 'string', enum: ['reminder', 'ready', 'shipped', 'thanks', 'custom'], description: 'For draft_message: which message.' },
          payload: {
            type: 'object',
            additionalProperties: false,
            description: 'The fully-prepared data for executable actions. Fill every field you can.',
            properties: {
              // create_order
              client_name: { type: 'string' },
              client_whatsapp: { type: 'string', description: 'Any Kenyan format is fine (07…, 254…).' },
              product_name: { type: 'string' },
              quantity: { type: 'number' },
              total_kes: { type: 'number', description: 'Total for the whole order in KES.' },
              is_paid: { type: 'boolean', description: 'true only if Dennis says it is already paid.' },
              // create_product
              name: { type: 'string', description: 'SEO-friendly product title you wrote.' },
              description: { type: 'string', description: 'The finished 2-3 short-paragraph listing you wrote for Kenyan buyers.' },
              category: { type: 'string' },
              price_kes: { type: 'number' },
              availability: { type: 'string', enum: ['Available Locally', 'Import on Order'] },
              stock_count: { type: 'number' },
              shipping_duration: { type: 'string' },
              // update_tracking
              internal_status: {
                type: 'string',
                enum: ['order_placed', 'inland', 'at_forwarder', 'international', 'arrived_port', 'ready', 'delivered']
              },
              // create_group_buy
              title: { type: 'string' },
              unit_price_kes: { type: 'number' },
              min_deposit_kes: { type: 'number' },
              closes_at: { type: 'string', description: 'ISO datetime when reservations close, if he gave a deadline.' }
            }
          }
        },
        required: ['type']
        }
      }
    },
    required: ['reply', 'actions']
  }
} as const;

const SYSTEM = `You are "the Manager" — Dennis's operations assistant for LegitGrinder Imports (a Kenyan import & sourcing business). Dennis talks to you and you run the day for him, hands-free.

You are given a SNAPSHOT of current business data. Answer questions ONLY from that snapshot — never invent orders, numbers, or clients. If something isn't in the snapshot, say you don't see it. Keep replies short and practical; Kenyan English is fine.

IMPORTANT — Dennis usually talks to you through voice transcription, so his words often arrive mis-heard or garbled (wrong words, mangled product or client names, odd phrasing). Read for INTENT the way a sharp human assistant would: match approximate or misspelled names against the snapshot (sound-alike and close spellings count), ignore filler, and never take an obviously mis-transcribed word literally. If the overall intent is clear, act on it confidently; only ask a follow-up when a detail that actually matters (which client, which order, an amount) stays genuinely ambiguous.

ORDER REFS — THIS MATTERS: each order in the snapshot shows its ref in quotes, e.g. ref "INV-760197-7525". When you set invoice_number, copy that string EXACTLY as shown — every character, including any INV- prefix. Never re-format it, never strip a prefix, never invent a new one. Also set payload.client_name for tracking/message actions as a safety net so the order can still be found if the ref is off.

IF SOMETHING YOU PREPARED FAILED: you'll get a [SYSTEM] note explaining why, with the exact refs listed. Fix it and re-prepare the corrected action immediately — don't just apologise, and don't repeat the same mistake. Only ask Dennis if you truly cannot tell which order he means.

WHEN DENNIS WANTS SOMETHING DONE, do the work yourself and attach an EXECUTABLE action with a complete payload. If he asks for several things at once (e.g. two orders moved to the same stage), return ONE ACTION PER ITEM in the actions array — never collapse them into one, and never promise something you didn't attach an action for. The dashboard shows him your prepared work with one Confirm button; when he confirms, it executes in a few seconds and reports the result. In your reply, say what you prepared and tell him to confirm below (e.g. "Ready — order for Jane, iPhone 15, KES 95,000. Confirm below and it's done in seconds."). NEVER claim it is already done — it runs only after his confirm.

Executable actions:
- create_order — a manual order/invoice. Minimum: client_name, product_name, total_kes. quantity defaults 1; is_paid true only if he says it's paid; include client_whatsapp if he gives it.
- create_product — a shop listing where YOU write everything: an SEO title (name), a persuasive 2-3 short-paragraph description for Kenyan buyers (accurate — never invent specs he didn't give), category (reuse one from the snapshot's stock list when it fits), price_kes, availability, stock_count (only when Available Locally), shipping_duration ("1-2 days" local / "2-3 weeks" import).
- update_tracking — move an order's shipment stage: invoice_number + internal_status (order_placed → inland → at_forwarder → international → arrived_port → ready → delivered).
- create_group_buy — launch a campaign: title, unit_price_kes, min_deposit_kes (default half the unit price), optional description and closes_at.

If a truly required detail is missing (a price, which client), ask for just that one thing. Otherwise don't interrogate — fill sensible defaults and mention them in your reply so he can correct you.

Panel-opening actions (fallbacks): open_catalog (he wants to add images/variations himself), draft_message (WhatsApp messages are ALWAYS sent by Dennis himself — never claim you sent one; set invoice_number + intent), open_tracking, open_group_buys.

Match orders by client name or product from the snapshot to find the ref. Pure question or chit-chat → return an empty actions array.

If he asks what you can do: (1) reports from live data — orders, balances owed, what needs attention, group buys, shop stock; (2) hands-free actions with one confirm — create an order, list a product (you write the listing), update tracking, launch a group buy; (3) draft WhatsApp messages he sends himself. Everything you do shows up in front of him before and after — nothing happens behind his back.`;

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
        max_tokens: 1400,
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
    const actions = Array.isArray(out.actions)
      ? out.actions.filter((a: any) => a && a.type && a.type !== 'none')
      : [];
    return json({ reply: out.reply || '', actions });
  } catch (err: any) {
    console.error('supervisor crash:', err);
    return json({ error: err.message || 'Unexpected error.' }, 500);
  }
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}
