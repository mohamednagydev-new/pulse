/**
 * Prices, shown in the currency the partner actually charges.
 *
 * Deliberately no conversion. A gym in Giza bills in EGP; rendering "≈ $12" to a
 * visitor from Riyadh shows them a number they will never be asked for, at a rate we
 * cannot keep current, for a transaction PULSE is not part of. The honest thing is
 * the real price in the real currency — and since the directory is already scoped to
 * the viewer's country, this is almost always their own money anyway.
 *
 * Formatting is `Intl.NumberFormat`, so Arabic gets Arabic-Indic digits and the
 * currency symbol on the correct side for free.
 */

/** Currencies whose minor units nobody quotes in practice. */
const NO_DECIMALS = new Set(['EGP', 'SAR', 'AED', 'QAR', 'MAD', 'DZD', 'JPY']);

export function formatMoney(amount: number | null | undefined, currency = 'EGP', lang = 'en'): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '';
  const locale = lang.startsWith('ar') ? 'ar-EG' : 'en-GB';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      // Whole numbers for the currencies people quote whole, but keep the decimals
      // for the Gulf three-decimal currencies where 0.500 is a real price.
      minimumFractionDigits: NO_DECIMALS.has(currency) ? 0 : undefined,
      maximumFractionDigits: NO_DECIMALS.has(currency) ? 0 : undefined,
    }).format(amount);
  } catch {
    // Unknown currency code from the admin form — show the number and the code
    // rather than throwing inside a render.
    return `${amount} ${currency}`;
  }
}

/**
 * What to print for a price field.
 *
 * Order matters: an explicit display string always wins, because it is the only way
 * to express "first month free" or "from 600/month". Then a real number. Then
 * nothing at all — an empty price is better than a fake one.
 */
export function priceLabel(
  opts: { amount?: number | null; display?: string | null; currency?: string | null },
  lang = 'en',
  freeLabel = 'Free',
): string {
  if (opts.display) return opts.display;
  if (opts.amount === 0) return freeLabel;
  if (opts.amount === null || opts.amount === undefined) return '';
  return formatMoney(opts.amount, opts.currency ?? 'EGP', lang);
}
