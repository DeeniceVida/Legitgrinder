
import { FEE_STRUCTURE, KES_PER_USD } from '../constants';

/**
 * Calculates the total KES price using the official LegitGrinder formula:
 * 1. Base Price (from Back Market)
 * 2. Add Fixed Fee ($8)
 * 3. Calculate Shipping ($20 + 3.5% of Base)
 * 4. Calculate Service Fee ($30 if <= $750, else 4.5% of Base)
 * 5. Sum all in USD
 * 6. Convert to KES (x 135)
 */
export const calculateAutomatedPrice = (basePriceUSD: number): number => {
  if (!basePriceUSD || basePriceUSD <= 0) return 0;

  // Step 2: Add Fixed Fee
  const basePlusFixed = basePriceUSD + FEE_STRUCTURE.FIXED_USD;

  // Step 3: Calculate Shipping
  const shippingFee = FEE_STRUCTURE.SHIPPING_FLAT_USD + (basePriceUSD * FEE_STRUCTURE.SHIPPING_PERCENT);

  // Step 4: Calculate Service Fee
  let serviceFee = 0;
  if (basePriceUSD <= FEE_STRUCTURE.THRESHOLD_USD) {
    serviceFee = FEE_STRUCTURE.SERVICE_FEE_FIXED_USD;
  } else {
    serviceFee = basePriceUSD * FEE_STRUCTURE.SERVICE_FEE_PERCENT_LARGE;
  }

  // Step 5: Total USD
  const totalUSD = basePriceUSD + FEE_STRUCTURE.FIXED_USD + shippingFee + serviceFee;

  // Step 6: Convert to KES
  return Math.ceil(totalUSD * KES_PER_USD);
};
