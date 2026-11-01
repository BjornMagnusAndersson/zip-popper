// The thinking part of the install hint (SPEC D52): is the game already installed (opened from the home screen), which
// kind of phone and browser this is, and whether the menu shows the install card (iPhone and iPad Safari: "tap Share,
// then Add to Home Screen"; Android and Chrome: an Install button that uses the browser's own prompt). Also what the
// About screen's "Install the game" card says. Pure functions only, so Node can test them.

/**
 * Whether the game runs installed (from the home screen) rather than in a browser tab.
 * @param {{matchMedia?: (q: string) => {matches: boolean}, navigator?: {standalone?: boolean}}} [env] the page (tests pass a fake)
 * @returns {boolean} true = installed
 */
export function isInstalled(env = globalThis) {
  try { if (env?.matchMedia?.('(display-mode: standalone)')?.matches) return true; } catch { /* no matchMedia here */ }
  return env?.navigator?.standalone === true;
}

/**
 * Which kind of browser this is, for the install hint: 'ios' = Safari on iPhone or iPad (it can add to the home screen
 * from its Share button; iPadOS Safari says "Macintosh", a touch screen tells it apart from a Mac), 'iosOther' = another
 * browser on iPhone or iPad (Chrome, Firefox, Edge, the Google app), 'inapp' = an app's built-in browser on any phone
 * (Snapchat, Instagram, Facebook, TikTok ...: it cannot install and may forget the save, so the player should open the
 * page in Safari or Chrome first), 'other' = everything else (Android and computers: they show an install prompt by
 * themselves when they can).
 * @param {string} ua navigator.userAgent
 * @param {number} [maxTouchPoints] navigator.maxTouchPoints
 * @returns {'ios'|'iosOther'|'inapp'|'other'} the kind
 */
export function installPlatform(ua, maxTouchPoints = 0) {
  const s = typeof ua === 'string' ? ua : '';
  if (/FBAN|FBAV|FB_IAB|Messenger|Instagram|Snapchat|musical_ly|TikTok|BytedanceWebview|Line\/|Twitter|LinkedInApp|Pinterest|Reddit|Discord/.test(s)) return 'inapp';
  const apple = /iPhone|iPad|iPod/.test(s) || (/Macintosh/.test(s) && maxTouchPoints > 1);
  if (!apple) return /Android/.test(s) && /; wv\)/.test(s) ? 'inapp' : 'other'; // "; wv)" = an Android app's web view
  return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(s) ? 'iosOther' : 'ios';
}

/**
 * Which install card the menu shows, if any. A test flag (?installhint=ios|android) always shows that card (screenshots,
 * the links page). Otherwise never in a ?test run, never once installed, never after "Not now", never on the very
 * first visit (only once the story has started or from the second menu visit), and only where installing works: iPhone
 * and iPad Safari, or a browser that offered its install prompt (Android, Chrome); in an app's built-in browser the
 * card says to open the page in Safari or Chrome first.
 * @param {{installed?: boolean, platform?: string, hasPrompt?: boolean, dismissed?: boolean, test?: boolean,
 *   force?: string|null, menuVisits?: number, storyStarted?: boolean}} o installed = isInstalled; platform =
 *   installPlatform; hasPrompt = the browser's install prompt is waiting; dismissed = "Not now" was tapped (saved);
 *   test = a ?test run; force = the ?installhint= flag; menuVisits = menu visits this session (this one included);
 *   storyStarted = the first strip was seen
 * @returns {'ios'|'android'|'inapp'|null} the card, or null for none
 */
export function installHintMode({ installed = false, platform = 'other', hasPrompt = false, dismissed = false, test = false, force = null, menuVisits = 0, storyStarted = false } = {}) {
  if (force === 'ios' || force === 'android' || force === 'inapp') return force;
  if (test || installed || dismissed) return null;
  if (!storyStarted && menuVisits < 2) return null;
  if (platform === 'ios' || platform === 'inapp') return platform;
  return hasPrompt ? 'android' : null;
}

/** Every kind of About card (string keys ui.about.install.<mode>), in the order aboutInstallMode checks them. */
export const ABOUT_INSTALL_MODES = ['installed', 'ios', 'iosOther', 'inapp', 'android', 'other'];

/**
 * What the About screen's "Install the game" card says: already installed, the Safari steps, "open it in Safari first",
 * "open it in Safari or Chrome first" (an app's built-in browser),
 * an Install button (the browser's prompt is waiting), or the browser menu steps (anything else).
 * @param {{installed?: boolean, platform?: string, hasPrompt?: boolean, force?: string|null}} o as installHintMode
 * @returns {'installed'|'ios'|'iosOther'|'inapp'|'android'|'other'} the kind of card
 */
export function aboutInstallMode({ installed = false, platform = 'other', hasPrompt = false, force = null } = {}) {
  if (force === 'ios' || force === 'android' || force === 'inapp') return force;
  if (installed) return 'installed';
  if (platform === 'ios' || platform === 'iosOther' || platform === 'inapp') return platform;
  return hasPrompt ? 'android' : 'other';
}
