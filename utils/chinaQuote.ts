import { serviceFeeFor } from './serviceFee';
import { KES_PER_USD } from '../constants';

/**
 * Quoting a China import, by sea or by air.
 *
 * Sea is charged on VOLUME (cubic metres), air on WEIGHT (kilos) — the same
 * carton gives two very different numbers, which is the whole point of putting
 * them side by side. A 0.1 CBM box is 7,000 by sea; if it weighs 20kg it is
 * 44,550 by air.
 *
 *   goods          what the supplier charges
 *   + 5%           transaction fee — what it costs to pay them
 *   = buying price
 *   + freight      CBM × sea rate, or kg × air rate
 *   + service fee  the published rate card, on the buying price
 *   = the quote
 *
 * Rates are defaults, not laws: freight moves, and the form lets him change
 * either one per quote.
 */

/** KES per cubic metre, sea freight from China. */
export const SEA_RATE_KES_PER_CBM = 70000;
/** USD per kilo, air freight from China. */
export const AIR_RATE_USD_PER_KG = 16.5;
/** What it costs to pay a Chinese supplier — already promised on the site. */
export const TRANSACTION_PCT = 0.05;

export interface QuoteLines {
  goodsKES: number;
  transactionKES: number;
  buyingKES: number;
  freightKES: number;
  serviceFeeKES: number;
  totalKES: number;
}

/** Rounded up to the hundred, so a quote never reads KES 44,553. */
const round100 = (n: number) => Math.ceil(n / 100) * 100;

export const goodsToKES = (amount: number, currency: 'USD' | 'KES'): number => {
  const v = Math.max(0, Number(amount) || 0);
  return currency === 'USD' ? v * KES_PER_USD : v;
};

export const seaFreightKES = (cbm: number, ratePerCbm = SEA_RATE_KES_PER_CBM): number =>
  Math.max(0, Number(cbm) || 0) * (Number(ratePerCbm) || 0);

export const airFreightKES = (kg: number, rateUsdPerKg = AIR_RATE_USD_PER_KG): number =>
  Math.max(0, Number(kg) || 0) * (Number(rateUsdPerKg) || 0) * KES_PER_USD;

/**
 * One quote. `freightKES` comes from whichever of the two above applies, so
 * the money maths is identical for sea and air and cannot drift between them.
 */
export const quoteChina = (opts: {
  goodsKES: number;
  freightKES: number;
  business?: boolean;
  /** Off when the supplier price already includes what it costs to pay them. */
  addTransaction?: boolean;
}): QuoteLines => {
  const goodsKES = Math.max(0, Number(opts.goodsKES) || 0);
  const transactionKES = opts.addTransaction === false ? 0 : goodsKES * TRANSACTION_PCT;
  // The fee is a percentage of the buying price, so the transaction cost is
  // folded in BEFORE the fee is worked out — it is part of what the goods cost.
  const buyingKES = round100(goodsKES + transactionKES);
  const freightKES = round100(Math.max(0, Number(opts.freightKES) || 0));
  const serviceFeeKES = goodsKES > 0 ? serviceFeeFor(buyingKES, opts.business) : 0;
  return {
    goodsKES,
    transactionKES,
    buyingKES,
    freightKES,
    serviceFeeKES,
    totalKES: buyingKES + freightKES + serviceFeeKES,
  };
};
