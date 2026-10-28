// Customers asking for more services (owner 2026-10-28, SPEC D42): a hint of things to come. Now and then a customer's
// second line asks whether the studio does facials or exfoliating yet. Nothing in the game answers it yet; a later
// strip has her decide to offer more services (BUILD-PLAN parking lot). Pure logic, no DOM, so it can be tested in Node.

/**
 * Which customers ask: in the career chapter (5) customers 3 and 10, and in Keep working every 9th customer from the
 * 2nd. Never a boss or event customer, a regular, a pin visit, a customer with a clock (their second line is the clock
 * joke) or the daily challenge. lineCount = how many lines there are (strings customer.ask.1 to .N).
 */
export const SERVICE_ASKS = { chapter: 5, careerN: [3, 10], kwEvery: 9, kwFrom: 2, lineCount: 4 };

/**
 * The second line of a customer who asks for more services, or null for everyone else.
 * @param {{chapter?: number, n?: number, keepWorking?: boolean, daily?: unknown}} step the customer step
 * @param {{boss?: unknown, regular?: boolean, pin?: boolean, timed?: boolean}} [o] boss = a boss or event customer;
 *   regular = a named regular; pin = a pin visit (game/pin-jar.js); timed = the round has a clock
 * @returns {string|null} string key, e.g. 'customer.ask.2'
 */
export function serviceAskKey(step, { boss = null, regular = false, pin = false, timed = false } = {}) {
  if (!step || step.daily || boss || regular || pin || timed) return null;
  const n = Math.floor(Number(step.n)) || 0;
  let k;
  if (step.keepWorking) {
    if (n < SERVICE_ASKS.kwFrom || (n - SERVICE_ASKS.kwFrom) % SERVICE_ASKS.kwEvery !== 0) return null;
    k = (n - SERVICE_ASKS.kwFrom) / SERVICE_ASKS.kwEvery;
  } else {
    if (step.chapter !== SERVICE_ASKS.chapter) return null;
    k = SERVICE_ASKS.careerN.indexOf(n);
    if (k < 0) return null;
  }
  return `customer.ask.${(k % SERVICE_ASKS.lineCount) + 1}`;
}
