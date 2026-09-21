/**
 * Brand-new phones bought sealed from apple.com — shown above the refurbished
 * pricelist, in their own colour, because they are a different product.
 *
 * Prices are Apple's own US retail prices, read off apple.com. Each one is run
 * through calculateUSImport — the same maths as /calculators with an apple.com
 * link, so the Apple pickup fee is included — and with NO discount: the
 * calculator's KES 1,000 client discount is not offered on these.
 *
 * To change a price: edit priceUSD here and push. Nothing is stored in the
 * database for these, so there is no sync to wait for.
 */

export interface NewPhone {
  name: string;
  /** Where the price was read from — shown to nobody, kept for whoever updates it. */
  sourceUrl: string;
  /** Shown as a badge when the phone can be ordered but has not shipped yet. */
  preorderNote?: string;
  capacities: { capacity: string; priceUSD: number }[];
}

/** When the prices below were last read off apple.com. */
export const NEW_PHONES_CHECKED = '2026-09-21';

export const NEW_PHONES: NewPhone[] = [
  {
    name: 'iPhone 18 Pro',
    sourceUrl: 'https://www.apple.com/shop/buy-iphone/iphone-18-pro',
    capacities: [
      { capacity: '256GB', priceUSD: 1199 },
      { capacity: '512GB', priceUSD: 1399 },
      { capacity: '1TB', priceUSD: 1799 },
      { capacity: '2TB', priceUSD: 2399 },
    ],
  },
  {
    name: 'iPhone 18 Pro Max',
    sourceUrl: 'https://www.apple.com/shop/buy-iphone/iphone-18-pro',
    capacities: [
      { capacity: '256GB', priceUSD: 1299 },
      { capacity: '512GB', priceUSD: 1499 },
      { capacity: '1TB', priceUSD: 1899 },
      { capacity: '2TB', priceUSD: 2499 },
    ],
  },
  {
    name: 'iPhone Duo',
    sourceUrl: 'https://www.apple.com/shop/buy-iphone/iphone-duo',
    // Apple: pre-orders open 16 Oct, available from 23 Oct 2026.
    preorderNote: 'Pre-order · Apple ships from 23 Oct',
    capacities: [
      { capacity: '256GB', priceUSD: 1999 },
      { capacity: '512GB', priceUSD: 2199 },
      { capacity: '1TB', priceUSD: 2599 },
      { capacity: '2TB', priceUSD: 3199 },
    ],
  },
];
