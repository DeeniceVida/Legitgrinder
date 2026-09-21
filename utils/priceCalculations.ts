
import { FEE_STRUCTURE, KES_PER_USD } from '../constants';
import { CalculationResult } from '../types';

/**
 * The /calculators "US tech" breakdown — one place, so the calculator and the
 * brand-new iPhones on /pricelist can never price the same phone differently.
 *
 *   Buying price  USD × 135
 *   Shipping      ($20 per kg + 3.5% of price) × 135
 *   Service fee   $30, or 4.5% of price above $750, × 135
 *   Apple pickup  $60 × 135 — only when it is bought from apple.com
 *   Discount      subtracted last, when there is one
 */
export const calculateUSImport = (opts: {
  priceUSD: number;
  weightKg?: number;
  fromApple?: boolean;
  discountKES?: number;
}): CalculationResult => {
  const price = opts.priceUSD;
  const kg = opts.weightKg ?? 1;
  const buyingPriceKES = price * KES_PER_USD;
  const shippingFeeKES = (FEE_STRUCTURE.SHIPPING_FLAT_USD * kg + price * FEE_STRUCTURE.SHIPPING_PERCENT) * KES_PER_USD;
  const serviceFeeKES = (price > FEE_STRUCTURE.THRESHOLD_USD
    ? price * FEE_STRUCTURE.SERVICE_FEE_PERCENT_LARGE
    : FEE_STRUCTURE.SERVICE_FEE_FIXED_USD) * KES_PER_USD;
  const applePickupFeeKES = opts.fromApple ? FEE_STRUCTURE.APPLE_PICKUP_FEE_USD * KES_PER_USD : 0;
  const discount = Math.max(0, opts.discountKES || 0);
  return {
    buyingPriceKES,
    shippingFeeKES,
    serviceFeeKES,
    applePickupFeeKES: applePickupFeeKES > 0 ? applePickupFeeKES : undefined,
    specialDiscountKES: discount > 0 ? discount : undefined,
    totalKES: buyingPriceKES + shippingFeeKES + serviceFeeKES + applePickupFeeKES - discount,
  };
};

/**
 * Calculates the total KES price using the official LegitGrinder parameters:
 * 1. Base Price (from Marketplace Source)
 * 2. Add Shipping ($20 Flat + 3.5% of Base)
 * 3. Add Service Fee ($30 if Base <= $750, else 4.5% of Base)
 * 4. Sum all in USD
 * 5. Convert to KES (x 135)
 */
export const calculateAutomatedPrice = (basePriceUSD: number): number => {
  if (!basePriceUSD || basePriceUSD <= 0) return 0;

  // Shipping Calculation ($20 + 3.5%)
  const shippingFee = FEE_STRUCTURE.SHIPPING_FLAT_USD + (basePriceUSD * FEE_STRUCTURE.SHIPPING_PERCENT);

  // Service Fee Calculation ($30 or 4.5%)
  let serviceFee = 0;
  if (basePriceUSD <= FEE_STRUCTURE.THRESHOLD_USD) {
    serviceFee = FEE_STRUCTURE.SERVICE_FEE_FIXED_USD;
  } else {
    serviceFee = basePriceUSD * FEE_STRUCTURE.SERVICE_FEE_PERCENT_LARGE;
  }

  // Total USD Sum
  const totalUSD = basePriceUSD + shippingFee + serviceFee;

  // Final Conversion to KES (135 rate)
  return Math.ceil(totalUSD * KES_PER_USD);
};
