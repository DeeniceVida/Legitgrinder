// Client helper for the catalog agent. Talks to the Cloudflare Function at
// /api/catalog-agent — the ANTHROPIC_API_KEY lives server-side, never here.

export interface CatalogAgentInput {
  note: string;
  priceKES?: number;
  imageUrls?: string[];
  productLink?: string;
  categories?: string[];
}

export interface CatalogAgentResult {
  name: string;
  description: string;
  category: string;
  availability: 'Available Locally' | 'Import on Order';
  shippingDuration: string;
  seoKeywords: string[];
}

export async function generateProductListing(
  input: CatalogAgentInput
): Promise<{ success: boolean; product?: CatalogAgentResult; error?: string }> {
  try {
    const res = await fetch('/api/catalog-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'The catalog agent could not be reached.' };
    }

    return { success: true, product: data.product as CatalogAgentResult };
  } catch (err: any) {
    return {
      success: false,
      error:
        err.message ||
        'Could not reach the catalog agent. Note: it only works on the live site, not local preview.'
    };
  }
}
