// Catalog Agent — Cloudflare Pages Function
// Takes what the admin pastes (a short note, price, image links) and asks
// Claude Sonnet 5 to write an SEO title + description, pick a category, and
// suggest availability/shipping. Runs server-side so ANTHROPIC_API_KEY never
// reaches the browser. The admin reviews the result before anything is saved.

interface Env {
  ANTHROPIC_API_KEY: string;
}

interface CatalogRequest {
  note?: string;          // the admin's brief description
  priceKES?: number;      // selling price the admin set
  imageUrls?: string[];   // image links (passed through, not invented)
  productLink?: string;   // optional source/reference link
  categories?: string[];  // existing categories to choose from
}

// The structured shape we force Claude to return.
const SAVE_PRODUCT_TOOL = {
  name: 'save_product',
  description: 'Return the finished, shop-ready product listing details.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: {
        type: 'string',
        description: 'A clear, SEO-friendly product title (max ~70 chars). No ALL CAPS, no emoji.'
      },
      description: {
        type: 'string',
        description:
          'A persuasive, SEO-optimised product description of 2-4 short paragraphs. Highlight benefits, key specs, and that it is imported to Nairobi CBD. Plain text, no markdown headings.'
      },
      category: {
        type: 'string',
        description:
          'The single best-fit category. Prefer one from the provided existing categories; only propose a new clean one if none fit.'
      },
      availability: {
        type: 'string',
        enum: ['Available Locally', 'Import on Order'],
        description: 'Whether the item is in stock locally or sourced on order.'
      },
      shipping_duration: {
        type: 'string',
        description: 'A short delivery estimate, e.g. "2-3 weeks" for imports or "1-2 days" if local.'
      },
      seo_keywords: {
        type: 'array',
        items: { type: 'string' },
        description: '4-8 short search keywords a Kenyan buyer might type.'
      }
    },
    required: ['name', 'description', 'category', 'availability', 'shipping_duration', 'seo_keywords']
  }
} as const;

const SYSTEM_PROMPT = `You are the catalog copywriter for LegitGrinder Imports, a premium Kenyan import & sourcing business (phones, tech, tools, home goods) that ships from the USA and China to Nairobi CBD.

Write listings that are accurate, benefit-led, and optimised for search — the tone is premium but plain-spoken, aimed at Kenyan buyers. Use Kenyan English where natural. Never invent specs, prices, or claims you were not given; if the note is thin, keep the description honest and general rather than fabricating details. Prices are set by the admin — do not mention or change them. Always call the save_product tool with your result.`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'Server misconfiguration: ANTHROPIC_API_KEY missing' }, 500);
    }

    const body = (await request.json()) as CatalogRequest;
    const note = (body.note || '').trim();

    if (!note) {
      return json({ error: 'A short product note is required.' }, 400);
    }

    const categories = Array.isArray(body.categories) ? body.categories.filter(Boolean) : [];
    const imageCount = Array.isArray(body.imageUrls) ? body.imageUrls.length : 0;

    const userMessage =
      `Create a shop listing from these details:\n\n` +
      `Brief note from admin: ${note}\n` +
      (body.priceKES ? `Selling price (already set, do not change): KES ${body.priceKES.toLocaleString()}\n` : '') +
      (body.productLink ? `Reference link: ${body.productLink}\n` : '') +
      `Number of product images provided: ${imageCount}\n` +
      (categories.length
        ? `\nExisting categories to choose from (pick the best fit): ${categories.join(', ')}`
        : '');

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        system: SYSTEM_PROMPT,
        tools: [SAVE_PRODUCT_TOOL],
        tool_choice: { type: 'tool', name: 'save_product' },
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = (await anthropicRes.json()) as any;

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', data);
      return json({ error: data.error?.message || 'The catalog agent failed to respond.' }, 502);
    }

    const toolUse = Array.isArray(data.content)
      ? data.content.find((b: any) => b.type === 'tool_use' && b.name === 'save_product')
      : null;

    if (!toolUse) {
      return json({ error: 'The catalog agent did not return a listing. Please try again.' }, 502);
    }

    const out = toolUse.input || {};

    // Map the agent's snake_case output to the shop's Product field names.
    return json({
      product: {
        name: out.name || '',
        description: out.description || '',
        category: out.category || '',
        availability: out.availability === 'Available Locally' ? 'Available Locally' : 'Import on Order',
        shippingDuration: out.shipping_duration || '',
        seoKeywords: Array.isArray(out.seo_keywords) ? out.seo_keywords : []
      }
    });
  } catch (err: any) {
    console.error('catalog-agent crash:', err);
    return json({ error: err.message || 'Unexpected error.' }, 500);
  }
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
