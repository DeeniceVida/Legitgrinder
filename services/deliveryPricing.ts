import { supabase } from '../lib/supabase';
import { DeliveryPricing, DEFAULT_PRICING, setPricing } from '../utils/delivery';

/**
 * The delivery fee rules — one row, read by everything that quotes a delivery
 * and written only from Admin → Riders & Deliveries.
 *
 * The same row prices the booking server-side (see request_delivery in
 * add_delivery_pricing_settings.sql), which is what stops the page promising
 * one fee while the job records another.
 */

/** Read the live rules. Falls back to the built-in figures rather than failing. */
export const fetchDeliveryPricing = async (): Promise<DeliveryPricing> => {
  try {
    const { data, error } = await supabase
      .from('delivery_pricing')
      .select('rate_per_km, minimum_fee, bulky_surcharge')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data) return DEFAULT_PRICING;
    return {
      ratePerKm: Number(data.rate_per_km),
      minimumFee: Number(data.minimum_fee),
      bulkySurcharge: Number(data.bulky_surcharge),
    };
  } catch {
    return DEFAULT_PRICING;
  }
};

/**
 * Read them and hand them to the quote maths in one go — what every page that
 * shows a fee calls on mount.
 */
export const loadDeliveryPricing = async (): Promise<DeliveryPricing> => {
  const p = await fetchDeliveryPricing();
  setPricing(p);
  return p;
};

/**
 * Admin only. Verified with a read-back: an update that matches no row returns
 * no error, and "no error" must never be reported as saved.
 */
export const updateDeliveryPricing = async (
  p: DeliveryPricing,
): Promise<{ success: boolean; error?: string }> => {
  const whole = (n: number) => Math.round(Number(n));
  const rate = whole(p.ratePerKm), min = whole(p.minimumFee), bulky = whole(p.bulkySurcharge);
  if (!(rate > 0 && rate <= 1000)) return { success: false, error: 'The rate per km must be between 1 and 1,000.' };
  if (!(min >= 0 && min <= 20000)) return { success: false, error: 'The minimum fee must be between 0 and 20,000.' };
  if (!(bulky >= 0 && bulky <= 20000)) return { success: false, error: 'The bulky surcharge must be between 0 and 20,000.' };

  const { data, error } = await supabase
    .from('delivery_pricing')
    .update({ rate_per_km: rate, minimum_fee: min, bulky_surcharge: bulky, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select('rate_per_km, minimum_fee, bulky_surcharge');

  if (error) return { success: false, error: error.message };
  if (!data?.length) return { success: false, error: 'Nothing was saved — sign in as admin and try again.' };

  setPricing({ ratePerKm: rate, minimumFee: min, bulkySurcharge: bulky });
  return { success: true };
};
