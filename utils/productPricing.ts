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

/** Variants that carry a price of their own. */
const priced = (p: Product): ProductVariation[] =>
  (p.variations || []).filter(v => (v.priceKES || 0) > 0);

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
  const withPrice = selected.filter(v => (v.priceKES || 0) > 0);

  if (!p.variantsAbsolute) {
    // Legacy: variant figures are add-ons on top of the base.
    return base + selected.reduce((sum, v) => sum + (v.priceKES || 0), 0);
  }

  if (!withPrice.length) return base;
  return Math.max(...withPrice.map(v => v.priceKES || 0));
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
  priced(p).length > 0 && !selected.some(v => (v.priceKES || 0) > 0);

/**
 * What a customer is told about stock. Never a count — the exact number is the
 * owner's business, not the buyer's or a competitor's.
 */
export const publicStockLabel = (quantity: number): string =>
  quantity > 0 ? 'In Stock' : 'Out of Stock';
