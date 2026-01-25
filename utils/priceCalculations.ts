
import { FEE_STRUCTURE, KES_PER_USD } from '../constants';

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
