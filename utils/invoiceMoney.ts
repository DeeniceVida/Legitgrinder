import { Invoice } from '../types';

/**
 * What an invoice is worth, and what has actually been received against it.
 *
 * ONE definition, used by the Dashboard tiles, the Reports tab and the six
 * month chart, so they can never quietly disagree about the same month.
 *
 * The distinction this file exists to make:
 *
 *   INVOICED  — what was billed. The order is worth this.
 *   COLLECTED — what is in the bank. This is the number that answers
 *               "how much money came in this month?"
 *   OUTSTANDING — the gap. Money owed on work already invoiced.
 *
 * Until now every money figure counted only invoices marked FULLY paid, and
 * "Outstanding" counted only invoices with nothing paid at all. On a deposit
 * business that is close to useless: three orders taking 251,000 in deposits
 * showed as KES 350 of revenue and nothing outstanding, because the only
 * fully-settled invoice that month was a 350-shilling book.
 */

/**
 * Money actually received against this invoice.
 *
 * `isPaid` wins over `amountPaidKES`, because an invoice can be marked paid
 * without the running total ever being filled in — LG100019 is exactly that:
 * paid in full, amount_paid_kes still 0. Reading the field alone would report
 * that sale as zero.
 */
export const collectedKES = (inv: Invoice): number => {
  const total = inv.totalKES || 0;
  const paid = inv.amountPaidKES || 0;
  return inv.isPaid ? Math.max(total, paid) : paid;
};

/** What was billed, settled or not. */
export const invoicedKES = (inv: Invoice): number => inv.totalKES || 0;

/** Still owed. Never negative — an overpayment is not a debt owed back here. */
export const outstandingKES = (inv: Invoice): number =>
  Math.max(0, invoicedKES(inv) - collectedKES(inv));

/** Part paid, but not finished. The state most of this business sits in. */
export const isPartlyPaid = (inv: Invoice): boolean =>
  !inv.isPaid && collectedKES(inv) > 0;

export const sumCollected = (list: Invoice[]): number =>
  list.reduce((s, i) => s + collectedKES(i), 0);

export const sumInvoiced = (list: Invoice[]): number =>
  list.reduce((s, i) => s + invoicedKES(i), 0);

export const sumOutstanding = (list: Invoice[]): number =>
  list.reduce((s, i) => s + outstandingKES(i), 0);

/**
 * Which month an invoice belongs to.
 *
 * NOTE the limitation: there is no per-payment record, only a running total on
 * the invoice, so a deposit taken in September against an August invoice is
 * counted in AUGUST. Fixing that proper needs a payments table with its own
 * dates. Worth doing if part-payments start spanning months.
 */
export const invoiceMonthKey = (inv: Invoice): string | null => {
  const d = inv.createdAt || (inv as any).date;
  if (!d) return null;
  const dt = new Date(d);
  return Number.isFinite(dt.getTime()) ? `${dt.getFullYear()}-${dt.getMonth()}` : null;
};

/**
 * KNOWN GAP, deliberately not papered over: totals are summed as if every
 * invoice were in shillings. One historical invoice (INV-691015-5638, June
 * 2026) is in USD and is being counted as though 4,725 dollars were 4,725
 * shillings. There is no stored FX rate to convert with, and silently dropping
 * it would change a month that has already been reported on. Flagged to the
 * owner rather than guessed at.
 */
export const isForeignCurrency = (inv: Invoice): boolean =>
  !!inv.currency && inv.currency !== 'KES';
