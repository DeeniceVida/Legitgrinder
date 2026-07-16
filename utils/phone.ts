/**
 * Normalize a Kenyan phone number to international WhatsApp digits: 2547XXXXXXXX
 * (no "+", no spaces — ready to drop into a wa.me/<number> link).
 *
 * Accepts the many ways a number gets typed into an order:
 *   0712 345 678      -> 254712345678   (leading 0 dropped)
 *   712345678         -> 254712345678   (bare 9-digit subscriber, no prefix)
 *   +254 712 345 678  -> 254712345678
 *   254712345678      -> 254712345678
 *   2540712345678     -> 254712345678   (someone kept both 254 and the 0)
 *
 * Also works for Airtel/Telkom 01x numbers. If a number is genuinely missing a
 * digit (a data-entry slip), it can't be recovered here — fix it on the order.
 */
export function normalizeKenyanPhone(raw?: string): string {
  if (!raw) return '';
  let d = raw.replace(/\D/g, ''); // digits only
  if (!d) return '';

  if (d.startsWith('254')) {
    d = d.slice(3);          // strip country code, look at what's left
    d = d.replace(/^0+/, ''); // ...and any stray leading 0 (2540712...)
  } else if (d.startsWith('0')) {
    d = d.replace(/^0+/, ''); // 0712... -> 712...
  }

  // d is now the subscriber number (normally 9 digits: 7XXXXXXXX or 1XXXXXXXX)
  return '254' + d;
}

/** Pretty display form: +254 712 345 678 */
export function formatKenyanPhone(raw?: string): string {
  const d = normalizeKenyanPhone(raw);
  if (d.length !== 12) return raw || '';
  return `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
}
