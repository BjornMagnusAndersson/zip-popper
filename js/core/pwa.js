// Registers the service worker so the game works offline. Never throws.

/** Registers sw.js when the browser supports it; returns true if registration was started. */
export function registerServiceWorker() {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
    navigator.serviceWorker.register('./sw.js').catch(() => {});
    return true;
  } catch {
    return false;
  }
}
