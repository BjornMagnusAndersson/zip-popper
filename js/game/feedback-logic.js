// The thinking part of the in-app feedback form (SPEC D52): the questions, cleaning the answers, the "also sent" line
// the game fills in by itself, the Google Form payload, the "Email it instead" mail link (kept short enough for every
// mail app), a guess of the phone model from the browser's user agent, and the small outbox for answers sent while
// offline. Pure functions only (no DOM, no storage, no network), so Node can test them. Text always comes from the
// string function `t` that the caller passes in (strings/en.json), never from here.

/**
 * The questions in order. type: 'stars' (1 to 5), 'choice' (one of options), 'text' (a paragraph), 'line' (one line).
 * A choice question may have a text box under it (textId). Every question is optional.
 * String keys: ui.feedback.q.<id> (the question), ui.feedback.q.<id>.<option> (each choice), ui.feedback.short.<id>
 * (the short label in the email).
 */
export const FEEDBACK_QUESTIONS = [
  { id: 'fun', type: 'stars', max: 5 },
  { id: 'feel', type: 'choice', options: ['easy', 'right', 'hard', 'fiddly'] },
  { id: 'comics', type: 'choice', options: ['loved', 'fine', 'skipped'] },
  { id: 'stopped', type: 'choice', options: ['never', 'start', 'studio', 'keepWorking'], textId: 'stoppedText' },
  { id: 'confusing', type: 'text' },
  { id: 'broken', type: 'choice', options: ['no', 'yes'], textId: 'brokenText' },
  { id: 'smooth', type: 'choice', options: ['smooth', 'stutters', 'slow', 'warm'] },
  { id: 'more', type: 'choice', options: ['yes', 'maybe', 'no'] },
  { id: 'phone', type: 'line' },
  { id: 'else', type: 'text', nameId: 'name' },
];

/** The Google Form fields the game fills (feedback-config.js `fields`), in form order; `auto` holds everything the game adds. */
export const FORM_FIELDS = ['fun', 'feel', 'comics', 'stopped', 'confusing', 'broken', 'smooth', 'more', 'phone', 'else', 'name', 'auto'];

/** The longest a paragraph answer may be, and a one-line answer (phone, name). */
export const TEXT_MAX = 1000;
export const LINE_MAX = 80;

/** The longest "Email it instead" link (mailto: plus everything after it); some mail apps cut longer ones. */
export const MAILTO_MAX = 1800;

/** At most this many unsent answers wait in the outbox, each at most OUTBOX_BODY_MAX characters. */
export const OUTBOX_MAX = 5;
export const OUTBOX_BODY_MAX = 12000;

/** The kinds of phone guessPhone can name (string keys ui.feedback.phone.<kind>, plus ".os" for the first five). */
export const PHONE_KINDS = ['iphone', 'ipad', 'ipod', 'android', 'androidPhone', 'chromebook', 'mac', 'windows', 'linux'];

/** How a send can end (string keys ui.feedback.thanks.<how>). */
export const SEND_RESULTS = ['sent', 'queued', 'email'];

/**
 * Every string key this module and the feedback screen build in code (so a test can check they exist in en.json).
 * @returns {string[]} the keys
 */
export function feedbackKeys() {
  const keys = [];
  for (const q of FEEDBACK_QUESTIONS) {
    keys.push(`ui.feedback.q.${q.id}`, `ui.feedback.short.${q.id}`);
    for (const o of q.options ?? []) keys.push(`ui.feedback.q.${q.id}.${o}`);
    if (q.textId) keys.push(`ui.feedback.q.${q.textId}`);
    if (q.nameId) keys.push(`ui.feedback.q.${q.nameId}`, `ui.feedback.short.${q.nameId}`);
  }
  PHONE_KINDS.forEach((k, i) => { keys.push(`ui.feedback.phone.${k}`); if (i < 5) keys.push(`ui.feedback.phone.${k}.os`); });
  for (const r of SEND_RESULTS) keys.push(`ui.feedback.thanks.${r}`);
  // the mail and the game's own line (autoText, mailBody, mailtoLink, answerText)
  for (const k of ['subject', 'nothing', 'starsValue', 'withText', 'short.auto', 'auto.text', 'auto.portrait', 'auto.landscape', 'auto.app', 'auto.browser', 'auto.test']) keys.push(`ui.feedback.${k}`);
  return keys;
}

/** The ids of the free-text answers (paragraphs and lines), the ones that may be shortened for the mail link. */
const TEXT_IDS = ['stoppedText', 'confusing', 'brokenText', 'phone', 'else', 'name'];

/**
 * A clean text answer: control characters (but not line breaks) removed, spaces tidied, cut to a length.
 * @param {unknown} v what was typed
 * @param {number} max the longest it may be
 * @param {boolean} [lines] true = keep line breaks (a paragraph)
 * @returns {string} the clean text ('' when nothing usable)
 */
export function cleanText(v, max, lines = false) {
  if (typeof v !== 'string') return '';
  let s = v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ');
  s = lines ? s.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
  return [...s.trim()].slice(0, max).join('').trim();
}

/**
 * Clean every answer: stars a whole number 0 to 5 (0 = not given), a choice only one of its options, texts tidied and cut.
 * Unknown fields are dropped.
 * @param {object} raw the answers as the screen collected them
 * @returns {{fun: number, feel: string, comics: string, stopped: string, stoppedText: string, confusing: string,
 *   broken: string, brokenText: string, smooth: string, more: string, phone: string, else: string, name: string}} clean answers
 */
export function cleanAnswers(raw) {
  const a = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const q of FEEDBACK_QUESTIONS) {
    if (q.type === 'stars') {
      const n = Math.floor(Number(a[q.id]));
      out[q.id] = Number.isFinite(n) && n >= 1 && n <= q.max ? n : 0;
    } else if (q.type === 'choice') out[q.id] = q.options.includes(a[q.id]) ? a[q.id] : '';
    else out[q.id] = cleanText(a[q.id], q.type === 'line' ? LINE_MAX : TEXT_MAX, q.type === 'text');
    if (q.textId) out[q.textId] = cleanText(a[q.textId], TEXT_MAX, true);
    if (q.nameId) out[q.nameId] = cleanText(a[q.nameId], LINE_MAX);
  }
  return out;
}

/**
 * One answer as text for the form and the mail: stars as "4" (form) or "4 of 5" (mail), a choice as its words, a
 * choice with a text box as "Choice: text" (or the text alone when no choice was picked).
 * @param {object} a clean answers
 * @param {{id: string, type: string, textId?: string, nameId?: string}} q the question
 * @param {(key: string, vars?: object) => string} t the string function
 * @param {boolean} forMail true = the mail wording ("4 of 5")
 * @returns {string} the text ('' when not answered)
 */
function answerText(a, q, t, forMail) {
  if (q.type === 'stars') return a[q.id] ? (forMail ? t('ui.feedback.starsValue', { n: a[q.id] }) : String(a[q.id])) : '';
  if (q.type !== 'choice') return a[q.id] ?? '';
  const choice = a[q.id] ? t(`ui.feedback.q.${q.id}.${a[q.id]}`) : '';
  const text = q.textId ? a[q.textId] : '';
  if (choice && text) return t('ui.feedback.withText', { choice, text });
  return choice || text || '';
}

/**
 * The answered questions as label and value pairs, in question order (the name last), for the mail and the form.
 * @param {object} answers the answers (cleaned here)
 * @param {(key: string, vars?: object) => string} t the string function
 * @param {boolean} [forMail] true = the mail wording
 * @returns {{id: string, label: string, value: string}[]} only the answered ones
 */
export function answerLines(answers, t, forMail = true) {
  const a = cleanAnswers(answers);
  const out = [];
  for (const q of FEEDBACK_QUESTIONS) {
    const value = answerText(a, q, t, forMail);
    if (value) out.push({ id: q.id, label: t(`ui.feedback.short.${q.id}`), value });
    if (q.nameId && a[q.nameId]) out.push({ id: q.nameId, label: t(`ui.feedback.short.${q.nameId}`), value: a[q.nameId] });
  }
  return out;
}

/**
 * The line of things the game fills in by itself (not asked): version, upright or sideways, screen and window size,
 * progress, play time, Lighter graphics, home screen app or browser, and the browser's user agent. One compact text,
 * so the Google Form needs only one field for all of it.
 * @param {{version?: string, ua?: string, screenW?: number, screenH?: number, w?: number, h?: number, chapter?: number,
 *   customersDone?: number, keepWorkingDone?: number, playMs?: number, lowDetail?: boolean, installed?: boolean,
 *   test?: boolean}} info what the game knows (test = a ?test run, marked at the front)
 * @param {(key: string, vars?: object) => string} t the string function
 * @returns {string} the line
 */
export function autoText(info, t) {
  const i = info ?? {};
  /** A whole number of at least 0 (0 when unknown). @param {unknown} v value @returns {number} the number */
  const n = (v) => (Number.isFinite(v) && v > 0 ? Math.round(v) : 0);
  const w = n(i.w);
  const h = n(i.h);
  const test = i.test ? `${t('ui.feedback.auto.test')} | ` : ''; // a ?test run (the links page): easy to tell apart in the answers
  return test + t('ui.feedback.auto.text', {
    version: String(i.version ?? ''),
    orient: t(w > h ? 'ui.feedback.auto.landscape' : 'ui.feedback.auto.portrait'),
    screen: `${n(i.screenW)}x${n(i.screenH)}`,
    window: `${w}x${h}`,
    chapter: n(i.chapter),
    customers: n(i.customersDone),
    kw: n(i.keepWorkingDone),
    min: Math.round(n(i.playMs) / 60000),
    lite: t(i.lowDetail ? 'ui.settings.on' : 'ui.settings.off'),
    app: t(i.installed ? 'ui.feedback.auto.app' : 'ui.feedback.auto.browser'),
    ua: cleanText(i.ua, 400),
  });
}

/**
 * The body of the Google Form post (application/x-www-form-urlencoded): each answer under its form field id
 * (entry.NNN from feedback-config.js), answered questions only, plus the game's own line under `auto`. Fields with no
 * id in the config are left out.
 * @param {object} answers the answers (cleaned here)
 * @param {string} auto the game's own line (autoText)
 * @param {{fields?: Object<string, string>}} config the feedback config
 * @param {(key: string, vars?: object) => string} t the string function
 * @returns {string} the encoded body ('' when the config has no field ids at all)
 */
export function formBody(answers, auto, config, t) {
  const fields = config?.fields ?? {};
  const p = new URLSearchParams();
  const values = Object.fromEntries(answerLines(answers, t, false).map((l) => [l.id, l.value]));
  values.auto = auto;
  for (const id of FORM_FIELDS) {
    const entry = typeof fields[id] === 'string' ? fields[id].trim() : '';
    if (entry && values[id]) p.append(entry, values[id]);
  }
  return p.toString();
}

/**
 * The mail's plain-text body: the answers one per line, then the game's own line.
 * @param {object} answers clean answers
 * @param {string} auto the game's own line
 * @param {(key: string, vars?: object) => string} t the string function
 * @returns {string} the body
 */
export function mailBody(answers, auto, t) {
  const lines = answerLines(answers, t, true).map((l) => `${l.label}: ${l.value}`);
  if (!lines.length) lines.push(t('ui.feedback.nothing'));
  return `${lines.join('\n')}\n\n${t('ui.feedback.short.auto')}: ${auto}`;
}

/**
 * Shorten a text to about a share of its length, with an ellipsis.
 * @param {string} s the text
 * @param {number} keep how many characters to keep (at least 20)
 * @returns {string} the shorter text
 */
function shorten(s, keep) {
  const chars = [...s];
  return `${chars.slice(0, Math.max(20, keep)).join('').trimEnd()}…`;
}

/**
 * The "Email it instead" link: mailto: with the address (none when the config has none: the mail app still opens),
 * subject "Hold Still, Honey feedback vX" and all answers plus the game's own line as the body. The whole link stays
 * at most `max` characters: the longest free-text answers are shortened first, then the user agent, and as a last
 * resort the body is cut.
 * @param {object} answers the answers (cleaned here)
 * @param {{version?: string, email?: string, auto?: object}} o version = the game version; email = the address
 *   (feedback-config.js); auto = what the game knows (autoText info)
 * @param {(key: string, vars?: object) => string} t the string function
 * @param {number} [max] the longest link
 * @returns {{url: string, body: string, trimmed: boolean}} the link, the body text in it and whether anything was shortened
 */
export function mailtoLink(answers, { version = '', email = '', auto = {} } = {}, t, max = MAILTO_MAX) {
  const a = cleanAnswers(answers);
  const to = typeof email === 'string' && /^[^\s@?&]+@[^\s@?&]+$/.test(email.trim()) ? email.trim() : '';
  const subject = t('ui.feedback.subject', { version });
  let info = { ...auto, version };
  /** Build the link for the answers and info now. @returns {{url: string, body: string}} link and body */
  const build = () => {
    const body = mailBody(a, autoText(info, t), t);
    return { url: `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, body };
  };
  let out = build();
  let trimmed = false;
  for (let guard = 0; out.url.length > max && guard < 60; guard += 1) {
    trimmed = true;
    const longest = TEXT_IDS.filter((id) => a[id].length > 40).sort((x, y) => a[y].length - a[x].length)[0];
    if (longest) a[longest] = shorten(a[longest], Math.floor([...a[longest]].length * 0.7));
    else if (String(info.ua ?? '').length > 60) info = { ...info, ua: shorten(String(info.ua), 60) };
    else break;
    out = build();
  }
  if (out.url.length > max) { // still too long (very many short answers): cut the body itself
    trimmed = true;
    let body = out.body;
    const head = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=`;
    while (body.length > 0 && head.length + encodeURIComponent(`${body}…`).length > max) body = [...body].slice(0, -20).join('');
    body = `${body}…`;
    out = { url: head + encodeURIComponent(body), body };
  }
  return { ...out, trimmed };
}

/**
 * How Send goes (SPEC D52): to the Google Form when the config has its address and the phone is online, into the
 * outbox when offline, and by mail when the form is not set up yet.
 * @param {{formAction?: string, online?: boolean}} o formAction = the form's address; online = navigator.onLine
 * @returns {'form'|'outbox'|'email'} the route
 */
export function sendRoute({ formAction = '', online = true } = {}) {
  if (!formAction) return 'email';
  return online === false ? 'outbox' : 'form';
}

/**
 * The outbox, cleaned: at most OUTBOX_MAX entries of {body, at}, each body a non-empty string of at most OUTBOX_BODY_MAX.
 * @param {unknown} list the stored list
 * @returns {{body: string, at: number}[]} the outbox
 */
export function cleanOutbox(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((e) => e && typeof e.body === 'string' && e.body.length > 0)
    .map((e) => ({ body: e.body.slice(0, OUTBOX_BODY_MAX), at: Number.isFinite(e.at) && e.at > 0 ? Math.floor(e.at) : 0 }))
    .slice(-OUTBOX_MAX);
}

/**
 * Put one unsent form body into the outbox (the oldest goes when it is full).
 * @param {unknown} list the outbox now
 * @param {string} body the encoded form body (formBody)
 * @param {number} now time in ms
 * @returns {{body: string, at: number}[]} the new outbox
 */
export function outboxAdd(list, body, now) {
  if (typeof body !== 'string' || !body) return cleanOutbox(list);
  return cleanOutbox([...cleanOutbox(list), { body, at: now }]);
}

/**
 * Whether to try sending the outbox now (at app start and when the phone comes back online): only with something in
 * it, a form address, the phone online and no try already running.
 * @param {{outbox?: unknown[], formAction?: string, online?: boolean, busy?: boolean}} o the situation
 * @returns {boolean} true = try now
 */
export function shouldFlush({ outbox = [], formAction = '', online = true, busy = false } = {}) {
  return Array.isArray(outbox) && outbox.length > 0 && Boolean(formAction) && online !== false && !busy;
}

/**
 * The first parenthesis group of a user agent split into its parts ("Linux; Android 13; SM-G991B" -> three parts).
 * @param {string} ua the user agent
 * @returns {string[]} the parts, trimmed
 */
function uaParts(ua) {
  const m = ua.match(/\(([^)]*)\)/);
  return m ? m[1].split(';').map((p) => p.trim()) : [];
}

/**
 * A guess of the phone or computer from the browser's user agent, for the pre-filled phone answer (the tester can fix
 * it). iPadOS Safari says "Macintosh"; a touch screen (maxTouchPoints > 1) tells it apart from a real Mac.
 * @param {string} ua navigator.userAgent
 * @param {number} [maxTouchPoints] navigator.maxTouchPoints
 * @returns {{key: string, vars: {model?: string, os?: string}}|null} string key (ui.feedback.phone.<kind>, ".os" when the
 *   system version is known) and its values, or null when nothing can be guessed
 */
export function guessPhone(ua, maxTouchPoints = 0) {
  const s = typeof ua === 'string' ? ua : '';
  /** The key with ".os" when the version is known. @param {string} kind the kind @param {string} os the version @param {object} [more] other values @returns {{key: string, vars: object}} the guess */
  const pick = (kind, os, more = {}) => ({ key: `ui.feedback.phone.${kind}${os ? '.os' : ''}`, vars: { ...more, ...(os ? { os } : {}) } });
  const apple = s.match(/(iPhone|iPad|iPod)/);
  if (apple) {
    const os = (s.match(/OS (\d+(?:_\d+)*) like Mac/)?.[1] ?? '').replace(/_/g, '.');
    return pick(apple[1].toLowerCase(), os);
  }
  if (/Macintosh/.test(s) && maxTouchPoints > 1) return pick('ipad', s.match(/Version\/(\d+(?:\.\d+)*)/)?.[1] ?? '');
  if (/Android/.test(s)) {
    const parts = uaParts(s);
    const at = parts.findIndex((p) => /^Android\b/.test(p));
    const os = at >= 0 ? (parts[at].match(/Android\s+([\d.]+)/)?.[1] ?? '') : '';
    let model = at >= 0 && parts[at + 1] ? parts[at + 1].replace(/\s*Build\/.*$/, '').trim() : '';
    if (/^(K|wv|Mobile|Tablet|U|rv:.*|[a-z]{2}(-[a-z]{2})?)$/i.test(model)) model = ''; // a hidden model (Chrome's short user agent), Firefox or a language code
    return model ? pick('android', os, { model }) : pick('androidPhone', os);
  }
  if (/CrOS/.test(s)) return pick('chromebook', '');
  if (/Macintosh/.test(s)) return pick('mac', '');
  if (/Windows/.test(s)) return pick('windows', '');
  if (/Linux/.test(s)) return pick('linux', '');
  return null;
}
