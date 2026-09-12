/**
 * Parse a price typed by an administrator without guessing through invalid
 * text. Blank means "price not listed"; every non-blank value must be a real
 * positive GBP amount. Both 49.99 and 49,99 are accepted, as are explicit
 * grouped forms such as 1,234.56 and 1.234,56. A lone dot followed by three
 * digits is rejected rather than guessed: in this UI `12.500` is much more
 * likely to mean GBP 12.50 than GBP 12,500.
 */
export function parseProductPrice(raw: string):
  | { ok: true; pence: number | null }
  | { ok: false; message: string } {
  const entered = raw.trim();
  if (!entered) return { ok: true, pence: null };

  const value = entered.replace(/^£\s*/, "").replace(/\s/g, "");
  if (!value || !/^[0-9.,]+$/.test(value)) {
    return { ok: false, message: "Enter a price such as 49.99, or leave it blank" };
  }

  let normalised: string | null = null;
  if (/^\d+$/.test(value)) {
    normalised = value;
  } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(value)) {
    normalised = value.replace(/,/g, "");
  } else if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(value)) {
    normalised = value.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+\.\d{1,2}$/.test(value)) {
    normalised = value;
  } else if (/^\d+,\d{1,2}$/.test(value)) {
    normalised = value.replace(",", ".");
  }

  if (!normalised) {
    return { ok: false, message: "Use no more than two decimal places" };
  }

  const pounds = Number(normalised);
  const pence = Math.round(pounds * 100);
  if (!Number.isFinite(pounds) || pence <= 0 || pence > 100_000_00) {
    return { ok: false, message: "Enter a price between £0.01 and £100,000" };
  }
  return { ok: true, pence };
}
