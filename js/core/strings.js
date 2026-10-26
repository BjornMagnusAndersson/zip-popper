// The string table: every piece of player-facing text comes from here (strings/en.json), never from the code.
// Text can hold {placeholders}, and "<key>.one" is used instead of "<key>" when the number {n} is 1.
// No DOM here, so it can be tested in Node.

let table = {};
let language = 'en';

/**
 * Replace the whole string table (used at start-up and in tests).
 * @param {Record<string, string>} next key to text
 * @param {string} [lang] language code, English by default
 * @returns {void}
 */
export function setStrings(next, lang = 'en') {
  table = next || {};
  language = lang;
}

/**
 * Load the string table of a language from a json file.
 * @param {string} [lang] language code; the file is strings/<lang>.json next to index.html
 * @returns {Promise<void>} resolves when the table is in place; falls back to an empty table if the file fails
 */
export async function loadStrings(lang = 'en') {
  try {
    const res = await fetch(new URL(`../../strings/${lang}.json`, import.meta.url));
    setStrings(await res.json(), lang);
  } catch {
    setStrings({}, lang);
  }
}

/**
 * The current language code.
 * @returns {string} e.g. 'en'
 */
export function currentLanguage() {
  return language;
}

/**
 * Whether the table has a text for a key.
 * @param {string} key string-table key
 * @returns {boolean} true if present
 */
export function hasString(key) {
  return Object.prototype.hasOwnProperty.call(table, key);
}

/**
 * The text for a key with {placeholders} filled in. A missing key gives the key itself so the gap is easy to see.
 * With a number {n} of 1 the "<key>.one" text is used when the table has one.
 * @param {string} key string-table key
 * @param {Record<string, string|number>} [vars] values for the {placeholders}
 * @returns {string} the text
 */
export function t(key, vars = {}) {
  const useOne = Number(vars.n) === 1 && hasString(`${key}.one`);
  let out = table[useOne ? `${key}.one` : key];
  if (typeof out !== 'string') return key;
  for (const [name, value] of Object.entries(vars)) out = out.split(`{${name}}`).join(String(value));
  return out;
}
