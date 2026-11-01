// Sends feedback answers to the Google Form (SPEC D52). A cross-site post with mode 'no-cors': the browser sends it but
// never shows the answer (it is "opaque"), so a fetch that finishes counts as sent and one that throws (offline, no
// network) as not sent. The service worker only handles GET requests from this site, so it never touches this post.
// Never throws.

/**
 * Post one encoded form body to the form's address.
 * @param {string} action the form's formResponse address (feedback-config.js formAction)
 * @param {string} body the encoded answers (feedback-logic.js formBody)
 * @param {typeof fetch} [fetchFn] the fetch to use (tests pass a fake)
 * @returns {Promise<boolean>} true = sent (as far as the browser can tell)
 */
export async function postFeedback(action, body, fetchFn = globalThis.fetch) {
  if (!action || !body || typeof fetchFn !== 'function') return false;
  try {
    await fetchFn(action, {
      method: 'POST', mode: 'no-cors', cache: 'no-store', credentials: 'omit',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Send what waits in the outbox, oldest first; it stops at the first one that fails (still offline).
 * @param {{body: string, at: number}[]} outbox the waiting answers
 * @param {string} action the form's address
 * @param {typeof fetch} [fetchFn] the fetch to use
 * @returns {Promise<{body: string, at: number}[]>} what is still waiting
 */
export async function flushOutbox(outbox, action, fetchFn = globalThis.fetch) {
  const left = Array.isArray(outbox) ? [...outbox] : [];
  while (left.length) {
    if (!(await postFeedback(action, left[0].body, fetchFn))) break;
    left.shift();
  }
  return left;
}
