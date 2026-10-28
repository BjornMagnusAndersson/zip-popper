// Did-you-know facts shown after a customer. Each entry is a string KEY (text in strings/en.json), never literal text.

/** The fact keys (35, owner 2026-10-28: 25 more so they repeat less), in the order they are handed out. */
export const FACT_KEYS = Array.from({ length: 35 }, (_, i) => `fact.${i + 1}`);

/**
 * Returns the fact key for the n-th customer. The list cycles, so after the last fact the first one comes back.
 * Index 0 is the first customer.
 * @param {number} index customer number counted from 0
 * @returns {string} string-table key, e.g. 'fact.3'
 */
export function factForCustomer(index) {
  const n = Math.floor(Number(index)) || 0;
  return FACT_KEYS[((n % FACT_KEYS.length) + FACT_KEYS.length) % FACT_KEYS.length];
}
