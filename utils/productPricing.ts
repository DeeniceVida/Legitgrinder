import { Product, ProductVariation, Availability } from '../types';

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

/**
 * Does this option group keep its own stock counts? True if ANY option in it
 * carries a number.
 */
export const groupTracksStock = (p: Product, type: string): boolean =>
  (p.variations || []).some(v => (v.type || 'Other') === type && typeof v.stockCount === 'number');

/**
 * Can this one option still be sold?
 *
 * An option with no count of its own is read in the context of its siblings,
 * not globally:
 *
 * - **No option in the group is counted** — the group isn't tracked at all
 *   (a sofa's colours), so it rides on the product's overall stock. Reading
 *   "no number" as zero here would empty the shop.
 * - **Its siblings ARE counted** — then a missing number is a gap in the data,
 *   not an unlimited supply, and it must not be offered. The pegboard was
 *   exactly this: every size had a count except "60 x 30cm White", which was
 *   sold out in real life and still selectable on the site.
 *
 * Callers must pass the product. Without it the old, looser reading applies.
 */
export const variantInStock = (v: ProductVariation, p?: Product): boolean => {
  if (typeof v.stockCount === 'number') return v.stockCount > 0;
  if (p && groupTracksStock(p, v.type || 'Other')) return false;
  return true;
};

/**
 * The option groups a customer MUST choose from to buy. Accessories are
 * optional extras, and capacity is handled elsewhere.
 */
export const requiredOptionTypes = (p: Product): string[] =>
  Array.from(new Set((p.variations || []).map(v => v.type || 'Other')))
    .filter(type => type.toLowerCase() !== 'capacity')
    .filter(type => !isAccessory({ type } as ProductVariation));

/**
 * Required groups where every single option has sold out.
 *
 * This is the case that used to strand people: the product-level count was
 * still positive, so the buy button appeared, but every size was disabled —
 * pressing Buy Now asked them to "select a size" they could not select.
 */
export const soldOutOptionGroups = (p: Product): string[] =>
  requiredOptionTypes(p).filter(type => {
    const group = (p.variations || []).filter(v => (v.type || 'Other') === type);
    return group.length > 0 && group.every(v => !variantInStock(v, p));
  });

/** Can this product be bought at all right now? */
export const isPurchasable = (p: Product): boolean => {
  // Import-on-order items are sourced per order, so they hold no stock.
  if (p.availability !== Availability.LOCAL) return true;
  return effectiveStock(p) > 0 && soldOutOptionGroups(p).length === 0;
};

/**
 * How many pieces of one exact selection can be sold — the product's stock,
 * tightened by whichever chosen option has the fewest left. Infinity for
 * import items, which are ordered in rather than taken off a shelf.
 */
/**
 * Split a product list into the three shelves the shop shows, in the order a
 * buyer cares about: what is in Nairobi now, what can be imported, and what
 * has sold out.
 *
 * Kept here beside the other stock rules so the grid, the tab counts and the
 * product page can never disagree about which shelf something is on.
 */
export const shelveProducts = (list: Product[]): {
  ready: Product[]; toOrder: Product[]; gone: Product[];
} => {
  const ready: Product[] = [];
  const toOrder: Product[] = [];
  const gone: Product[] = [];
  list.forEach(p => {
    if (p.availability !== Availability.LOCAL) toOrder.push(p);
    else if (isPurchasable(p)) ready.push(p);
    else gone.push(p);
  });
  return { ready, toOrder, gone };
};

export const sellableQuantity = (p: Product, selected: ProductVariation[]): number => {
  if (p.availability !== Availability.LOCAL) return Infinity;
  let max = effectiveStock(p);
  selected.forEach(v => {
    if (typeof v.stockCount === 'number') max = Math.min(max, v.stockCount);
    // Uncounted, but its siblings are counted — nothing to sell.
    else if (!variantInStock(v, p)) max = 0;
  });
  return Math.max(0, max);
};
