/**
 * The sourcing fee — the only part of an import total the owner keeps.
 *
 * This is the rate card already published on How It Works and quoted by the
 * chatbot, with one change made 2026-11-21: the percentage now starts above
 * KES 50,000 rather than 100,000. Between those two figures sat a flat 3,000,
 * so a 92,000 phone earned the same fee as an 18,000 one — 22 orders this year.
 *
 *   up to 50,000 .......  3,000   ·  3,500 for business goods and work machines
 *   above 50,000 .......     5%   ·     7% for business goods
 *
 * Percentages are on the BUYING PRICE — what the goods themselves cost, before
 * shipping and before this fee. Quoting a percentage of the total would charge
 * the customer a fee on his own freight.
 *
 * One definition, used by the invoice form and anything else that quotes, so
 * what he charges can never drift from what the site promises again.
 */

export const FEE_THRESHOLD_KES = 50000;
export const FEE_FLAT_KES = 3000;
export const FEE_FLAT_BUSINESS_KES = 3500;
export const FEE_PCT = 0.05;
export const FEE_PCT_BUSINESS = 0.07;

/**
 * Business goods and work machines carry the higher rate: they are heavier to
 * source, slower to clear and more often need parts or follow-up. Only a
 * suggestion — the form lets him say otherwise on any order.
 */
const BUSINESS_HINT = /machine|printer|engrav|laser|cutter|plotter|cnc|embroider|industrial|ice ?cream|key cutting|sewing|compressor|generator|weld|3d|oven|fridge|freezer|mixer|press|lathe|grinder/i;

export const looksLikeBusinessGoods = (text?: string): boolean =>
  BUSINESS_HINT.test(String(text || ''));

/**
 * Rounded up to the nearest 100 — nobody invoices a fee of 5,073.
 *
 * The percentage can never pay less than the flat fee, or a 50,500 order
 * would earn 2,600 against 3,000 for a 50,000 one: the fee would fall as the
 * job got bigger. So the flat fee is a floor, and 5% only takes over once it
 * is actually worth more (at 60,000 personal; the business rate at 50,000).
 */
export const serviceFeeFor = (buyingPriceKES: number, business = false): number => {
  const goods = Math.max(0, Number(buyingPriceKES) || 0);
  if (goods <= 0) return 0;
  const flat = business ? FEE_FLAT_BUSINESS_KES : FEE_FLAT_KES;
  if (goods <= FEE_THRESHOLD_KES) return flat;
  const pct = business ? FEE_PCT_BUSINESS : FEE_PCT;
  return Math.max(flat, Math.ceil((goods * pct) / 100) * 100);
};

/** How the fee was arrived at, for the line under the suggestion. */
export const serviceFeeBasis = (buyingPriceKES: number, business = false): string => {
  const goods = Math.max(0, Number(buyingPriceKES) || 0);
  if (goods <= 0) return 'Add the goods first and the fee works itself out.';
  if (goods <= FEE_THRESHOLD_KES) {
    return `Flat fee on goods up to KES ${FEE_THRESHOLD_KES.toLocaleString()}${business ? ' · business rate' : ''}`;
  }
  return `${business ? FEE_PCT_BUSINESS * 100 : FEE_PCT * 100}% of KES ${Math.round(goods).toLocaleString()} of goods${business ? ' · business rate' : ''}`;
};

/** The customer-facing wording, so the site and the invoice cannot disagree. */
const pctLabel = (p: number) => `${Math.round(p * 1000) / 10}%`;

export const FEE_CARD_TEXT =
  `From KES ${FEE_FLAT_KES.toLocaleString()} — or KES ${FEE_FLAT_BUSINESS_KES.toLocaleString()} for business goods and work machines. `
  + `Above KES ${FEE_THRESHOLD_KES.toLocaleString()} it becomes ${pctLabel(FEE_PCT)} of the buying price, or ${pctLabel(FEE_PCT_BUSINESS)} for business goods.`;
