import { Product, ProductVariation } from '../types';

/**
 * What a shop product costs.
 *
 * Variant prices are ABSOLUTE: the figure typed against "90 x 30cm Black" is
 * what the customer pays, full stop. It used to be an add-on stacked on the
 * product's base price, which meant a 4,500 pegboard rang up at 6,500.
 *
 * `variantsAbsolute` marks a product as converted. Anything still false is
 * read the old way, so the shop prices correctly whether or not the migration
 * has been run yet — there is no window where the site is wrong.
 */

/** The product's own price, before any variant is chosen. */
export const basePriceOf = (p: Product): number => p.discountPriceKES || p.priceKES || 0;

/**
 * Option groups that are ACCESSORIES rather than a choice about the item
 * itself. A pegboard container is a thing you add to a board, so it adds to
 * the price and you can leave it out; a size is what the board IS, so it
 * replaces the price and has to be chosen.
 */
export const ACCESSORY_TYPES = ['bundle'];

export const isAccessory = (v: ProductVariation): boolean =>
  ACCESSORY_TYPES.includes(String(v.type || '').toLowerCase());

/** Variants that carry a price of their own, accessories excluded. */
const priced = (p: Product): ProductVariation[] =>
  (p.variations || []).filter(v => (v.priceKES || 0) > 0 && !isAccessory(v));

/**
 * The price for a given selection.
 *
 * Only one dimension normally carries a price — size decides the cost, colour
 * doesn't. Where more than one priced variant is somehow selected we take the
 * highest rather than the sum, because under absolute pricing adding two
 * prices together is meaningless (and summing would overcharge).
 */
export const priceForSelection = (p: Product, selected: ProductVariation[]): number => {
  const base = basePriceOf(p);

  if (!p.variantsAbsolute) {
    // Legacy: variant figures are add-ons on top of the base.
    return base + selected.reduce((sum, v) => sum + (v.priceKES || 0), 0);
  }

  const main = selected.filter(v => (v.priceKES || 0) > 0 && !isAccessory(v));
  // Accessories are extra things in the box, so they genuinely add up.
  const extras = selected.filter(v => (v.priceKES || 0) > 0 && isAccessory(v))
    .reduce((sum, v) => sum + (v.priceKES || 0), 0);

  const item = main.length ? Math.max(...main.map(v => v.priceKES || 0)) : base;
  return item + extras;
};

/**
 * The "from" price shown while browsing — the cheapest way to own this thing.
 * A product with no priced variants just shows its own price.
 */
export const fromPriceOf = (p: Product): number => {
  const base = basePriceOf(p);
  const list = priced(p);
  if (!list.length) return base;
  const cheapest = Math.min(...list.map(v => v.priceKES));
  return p.variantsAbsolute ? cheapest : base + cheapest;
};

/** True when the product can't be priced until a variant is chosen. */
export const needsVariantForPrice = (p: Product, selected: ProductVariation[]): boolean =>
  priced(p).length > 0 && !selected.some(v => (v.priceKES || 0) > 0 && !isAccessory(v));

/**
 * What a customer is told about stock. Never a count — the exact number is the
 * owner's business, not the buyer's or a competitor's.
 */
export const publicStockLabel = (quantity: number): string =>
  quantity > 0 ? 'In Stock' : 'Out of Stock';

/**
 * How many pieces this product can actually sell.
 *
 * Where stock is kept per variant, the product-level figure is often left at
 * zero — the real count lives on the options. Reading only the product field
 * marked such an item out of stock and hid its buy buttons entirely, with
 * thirty pieces sitting on the shelf.
 */
export const effectiveStock = (p: Product): number => {
  const tracked = (p.variations || []).filter(v => typeof v.stockCount === 'number');
  if (tracked.length) {
    return Math.max(p.stockCount || 0, tracked.reduce((sum, v) => sum + (v.stockCount || 0), 0));
  }
  return p.stockCount || 0;
};
