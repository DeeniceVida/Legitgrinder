/**
 * Amounts written out in words, for the "The Sum Of" line on a receipt.
 *
 * Kenyan/British convention throughout: "and" after the hundreds, hyphens in
 * compound tens — 7,300 reads "seven thousand three hundred", 1,023 reads
 * "one thousand and twenty-three".
 */

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** Scales, smallest first. Anything past a trillion is not a real receipt. */
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

const underHundred = (n: number): string =>
  n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');

/** 0–999. */
const underThousand = (n: number): string => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundreds) return underHundred(rest);
  return `${ONES[hundreds]} hundred${rest ? ` and ${underHundred(rest)}` : ''}`;
};

/** A whole number in words, all lowercase. 0 gives "zero". */
export const numberToWords = (value: number): string => {
  if (!Number.isFinite(value)) return '';
  const n = Math.floor(Math.abs(value));
  if (n === 0) return 'zero';

  // Split into groups of three, smallest first.
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  if (groups.length > SCALES.length) return '';

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (!groups[i]) continue;
    const scale = SCALES[i];
    // "one thousand and twenty-three" — the "and" belongs before a trailing
    // group under a hundred, but only when something larger came before it.
    const lead = i === 0 && parts.length && groups[0] < 100 ? 'and ' : '';
    parts.push(`${lead}${underThousand(groups[i])}${scale ? ` ${scale}` : ''}`);
  }

  return `${value < 0 ? 'minus ' : ''}${parts.join(' ')}`;
};

const UNITS: Record<string, { major: string; majorOne: string; minor: string; minorOne: string }> = {
  KES: { major: 'shillings', majorOne: 'shilling', minor: 'cents', minorOne: 'cent' },
  USD: { major: 'US dollars', majorOne: 'US dollar', minor: 'cents', minorOne: 'cent' },
};

/**
 * The full receipt line — "Seven thousand three hundred shillings only".
 *
 * Sentence case, because that is how the receipts have always been written by
 * hand. Cents appear only when there are any.
 */
export const amountInWords = (amount: number, currency: string = 'KES'): string => {
  if (!Number.isFinite(amount)) return '';
  const unit = UNITS[currency] || UNITS.KES;

  const whole = Math.floor(Math.abs(amount));
  // Two decimal places, rounded — 7300.005 is not a real payment.
  let cents = Math.round((Math.abs(amount) - whole) * 100);
  // Guard the rounding edge: 0.999 would otherwise give "100 cents".
  const carry = cents === 100 ? 1 : 0;
  if (carry) cents = 0;

  const majorValue = whole + carry;
  const major = `${numberToWords(majorValue)} ${majorValue === 1 ? unit.majorOne : unit.major}`;
  const minor = cents ? ` and ${numberToWords(cents)} ${cents === 1 ? unit.minorOne : unit.minor}` : '';

  const sentence = `${amount < 0 ? 'minus ' : ''}${major}${minor} only`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
};

/**
 * Words for a receipt amount field, which is free text and may legitimately
 * hold "TBD" or a figure typed with thousands separators. Anything that isn't
 * a number gives an empty string rather than nonsense.
 */
export const amountFieldInWords = (raw: string, currency?: string): string => {
  const text = (raw || '').trim();
  if (!text || text.toUpperCase() === 'TBD') return '';
  const n = parseFloat(text.replace(/,/g, ''));
  return Number.isFinite(n) ? amountInWords(n, currency || 'KES') : '';
};
