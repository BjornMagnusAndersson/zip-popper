// The pin jar (owner 2026-10-28, a joke and a lesson): now and then a customer comes in who "tried a safety pin at
// home". She takes the pin away, it goes into a jar on the studio shelf that slowly fills up, and the result card says
// why pins and needles from home are a bad idea. Pure logic, no DOM, so it can be tested in Node.

/**
 * Which customers bring a pin: in the career chapter (5) customers 6 and 12, and in Keep working every 7th customer
 * from the 4th. Never a boss or event customer, a regular, or the daily challenge. introCount = how many intro lines
 * there are (strings customer.pin.intro.1 to .N); drawnMax = the most pins the jar draws (it stays full after that).
 */
export const PIN_JAR = { chapter: 5, careerN: [6, 12], kwEvery: 7, kwFrom: 4, introCount: 3, drawnMax: 24 };

/**
 * Whether this customer brings a pin from home.
 * @param {{chapter?: number, n?: number, keepWorking?: boolean, daily?: unknown}} step the customer step
 * @param {{boss?: unknown, regular?: boolean}} [o] boss = the customer is a boss or event; regular = a named regular
 * @returns {boolean} true = a pin visit
 */
export function pinVisit(step, { boss = null, regular = false } = {}) {
  if (!step || step.daily || boss || regular) return false;
  const n = Math.floor(Number(step.n)) || 0;
  if (step.keepWorking) return n >= PIN_JAR.kwFrom && (n - PIN_JAR.kwFrom) % PIN_JAR.kwEvery === 0;
  return step.chapter === PIN_JAR.chapter && PIN_JAR.careerN.includes(n);
}

/**
 * The pin customer's first line (it replaces the usual intro), taking turns through the variants.
 * @param {number} count pins already in the jar
 * @returns {string} string key, e.g. 'customer.pin.intro.2'
 */
export function pinIntroKey(count) {
  const k = Math.max(0, Math.floor(Number(count)) || 0) % PIN_JAR.introCount;
  return `customer.pin.intro.${k + 1}`;
}

/**
 * How many pins the jar draws for a count (none at all before the first pin; full stays full).
 * @param {number} count pins in the jar (save.pinJar)
 * @returns {number} 0..drawnMax
 */
export function pinsDrawn(count) {
  return Math.max(0, Math.min(PIN_JAR.drawnMax, Math.floor(Number(count)) || 0));
}
