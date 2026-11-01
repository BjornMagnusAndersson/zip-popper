// Keeps the browser's own install prompt (Android, Chrome; SPEC D52). The browser fires 'beforeinstallprompt' when the
// game can be installed: it is held back here (no mini bar of its own) and kept, so the menu's Install button can show
// it later. 'appinstalled' says the game was installed. index.html starts the watch early (the event can come before
// the game has started); the game reads the state and listens for changes. Never throws.

let deferred = null; // the held-back install prompt event, or null
let installedNow = false; // the game was installed during this visit
let watching = false;
const listeners = new Set();

/** Tell every listener that the install state changed. @returns {void} */
function notify() {
  for (const fn of listeners) { try { fn(); } catch { /* a listener's own problem */ } }
}

/**
 * Start listening for the browser's install prompt and for "installed" (once; later calls do nothing).
 * @param {Window} [win] the page window
 * @returns {void}
 */
export function watchInstallPrompt(win = globalThis) {
  if (watching || typeof win?.addEventListener !== 'function') return;
  watching = true;
  win.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify(); });
  win.addEventListener('appinstalled', () => { deferred = null; installedNow = true; notify(); });
}

/** Whether the browser's install prompt is waiting. @returns {boolean} true = the Install button can show it */
export function hasInstallPrompt() {
  return deferred !== null;
}

/** Whether the game was installed during this visit (the page is still the browser tab). @returns {boolean} true = installed now */
export function installedThisVisit() {
  return installedNow;
}

/**
 * Show the browser's install prompt (it can be shown only once; afterwards the button hides).
 * @returns {Promise<'accepted'|'dismissed'|'none'>} the player's choice, or 'none' when there was no prompt
 */
export async function runInstallPrompt() {
  const e = deferred;
  deferred = null;
  if (!e) { notify(); return 'none'; }
  let outcome = 'dismissed';
  try {
    await e.prompt();
    const choice = await e.userChoice;
    outcome = choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch { /* the browser refused to show it */ }
  if (outcome === 'accepted') installedNow = true;
  notify();
  return outcome;
}

/**
 * Listen for changes of the install state (the prompt came, was used, or the game was installed).
 * @param {() => void} fn called on every change
 * @returns {() => void} stops listening
 */
export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
