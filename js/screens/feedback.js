// The feedback screen (SPEC D52): a short friendly intro, ten questions (a star row, choices as big tap buttons, text
// boxes; nothing is required), a small "Also sent:" line naming what the game adds by itself, then Send and "Email it
// instead". After sending, a thank-you card with Back to the menu and "Send more feedback". The questions come from
// game/feedback-logic.js; how the answers travel (Google Form, the outbox when offline, or mail) is the game's job
// (app.js onSend); this screen only collects the answers and opens the mail app when asked. All text comes from the
// string table and is set as plain text.

import { el, button, header, screenShell, starIcon } from './dom.js';
import { FEEDBACK_QUESTIONS, TEXT_MAX, LINE_MAX } from '../game/feedback-logic.js';

/**
 * Open the mail app with a mailto: link (a link click works in browsers and in a home screen app).
 * @param {string} url the mailto: link
 * @returns {void}
 */
function openMail(url) {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    document.body.append(a);
    a.click();
    a.remove();
  } catch { /* no mail app: the thank-you card still offers Copy */ }
}

/**
 * Build the feedback screen.
 * @param {{t: (key: string, vars?: object) => string, reducedMotion?: boolean, phoneGuess?: string, onBack?: () => void,
 *   onMenu?: () => void, onSend?: (answers: object) => Promise<'sent'|'queued'|'email'>,
 *   mailFor?: (answers: object) => {url: string, body: string}}} opts
 *   t = string function; phoneGuess = the pre-filled phone answer; onBack = Back; onMenu = "Back to the menu" on the
 *   thank-you card; onSend = Send (the game sends or keeps the answers and says how it went; 'email' = open the mail
 *   app instead); mailFor = the mail link and its body text for the answers ("Email it instead", and Copy)
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createFeedbackScreen({ t, reducedMotion = false, phoneGuess = '', onBack, onMenu, onSend, mailFor }) {
  const shell = screenShell('feedback', { label: t('ui.feedback.title'), reducedMotion });
  const head = header(t, t('ui.feedback.title'), onBack, shell.signal);
  const body = el('div', 'app-body app-feedback');
  const uid = Math.random().toString(36).slice(2, 8); // keeps the radio groups and ids of this screen apart
  const form = el('div', 'app-feedback__form');
  const intro = el('p', 'app-card app-feedback__intro', t('ui.feedback.intro'));
  form.append(intro);
  const read = {}; // answer id -> () => value, filled while the questions are built

  /**
   * A text box with its label (a paragraph or one line).
   * @param {string} id the answer id
   * @param {string} labelKey the label's string key
   * @param {boolean} paragraph true = a paragraph box, false = one line
   * @param {string} [value] text to start with
   * @param {boolean} [question] true = the label is the question itself (big, like the other questions)
   * @returns {HTMLElement} the label and box
   */
  const textBox = (id, labelKey, paragraph, value = '', question = false) => {
    const wrap = el('div', 'app-fbfield');
    const label = el('label', question ? 'app-fbq__q' : 'app-field__label', t(labelKey));
    const box = el(paragraph ? 'textarea' : 'input', `app-input app-fbtext${paragraph ? ' app-fbtext--para' : ''}`);
    box.id = `fb-${id}-${uid}`;
    label.htmlFor = box.id;
    box.maxLength = paragraph ? TEXT_MAX : LINE_MAX;
    box.autocomplete = 'off';
    if (paragraph) box.rows = 3;
    else { box.type = 'text'; box.enterKeyHint = 'next'; }
    box.value = value;
    read[id] = () => box.value;
    wrap.append(label, box);
    return wrap;
  };

  /**
   * The radio buttons of one question as big tap buttons (one can be picked; arrow keys move between them).
   * @param {{id: string, options: string[]}} q the question
   * @returns {HTMLElement} the row of choices
   */
  const choices = (q) => {
    const row = el('div', 'app-fbchoices');
    const inputs = q.options.map((opt) => {
      const label = el('label', 'app-fbchoice');
      const input = el('input', 'app-fbchoice__input');
      input.type = 'radio';
      input.name = `fb-${q.id}-${uid}`;
      input.value = opt;
      label.append(input, el('span', 'app-fbchoice__text', t(`ui.feedback.q.${q.id}.${opt}`)));
      row.append(label);
      return input;
    });
    read[q.id] = () => inputs.find((i) => i.checked)?.value ?? '';
    return row;
  };

  /**
   * The 1 to 5 star row: tapping a star fills it and the ones before it.
   * @param {{id: string, max: number}} q the question
   * @returns {HTMLElement} the star row
   */
  const stars = (q) => {
    const row = el('div', 'app-fbstars');
    const items = [];
    for (let n = 1; n <= q.max; n += 1) {
      const label = el('label', 'app-fbstar');
      const input = el('input', 'app-fbchoice__input');
      input.type = 'radio';
      input.name = `fb-${q.id}-${uid}`;
      input.value = String(n);
      input.setAttribute('aria-label', t('ui.feedback.q.fun.star', { n }));
      const pic = el('span', 'app-fbstar__pic');
      label.append(input, pic);
      row.append(label);
      items.push({ input, pic });
    }
    /** Fill the stars up to the chosen one. @returns {void} */
    const paint = () => {
      const chosen = Number(items.find((i) => i.input.checked)?.input.value ?? 0);
      items.forEach(({ pic }, i) => pic.replaceChildren(starIcon(i < chosen, 40)));
    };
    row.addEventListener('change', paint, { signal: shell.signal });
    paint();
    read[q.id] = () => Number(items.find((i) => i.input.checked)?.input.value ?? 0);
    return row;
  };

  for (const q of FEEDBACK_QUESTIONS) {
    if (q.type === 'stars' || q.type === 'choice') {
      const set = el('fieldset', 'app-card app-fbq');
      set.append(el('legend', 'app-fbq__q', t(`ui.feedback.q.${q.id}`)), q.type === 'stars' ? stars(q) : choices(q));
      if (q.textId) set.append(textBox(q.textId, `ui.feedback.q.${q.textId}`, true));
      form.append(set);
    } else {
      const card = el('div', 'app-card app-fbq');
      card.append(textBox(q.id, `ui.feedback.q.${q.id}`, q.type === 'text', q.id === 'phone' ? phoneGuess : '', true));
      if (q.id === 'phone') card.append(el('p', 'app-fbq__hint', t('ui.feedback.q.phone.hint')));
      if (q.nameId) card.append(textBox(q.nameId, `ui.feedback.q.${q.nameId}`, false));
      form.append(card);
    }
  }

  form.append(el('p', 'app-feedback__also', t('ui.feedback.alsoSent')));
  const status = el('p', 'app-notice app-feedback__status');
  status.setAttribute('role', 'status');
  status.hidden = true;
  const sendBtn = button('app-btn app-btn--main app-btn--big app-feedback__send', t('ui.feedback.send'), () => send(), shell.signal);
  const mailBtn = button('app-btn app-feedback__mail', t('ui.feedback.email'), () => email(), shell.signal);
  const actions = el('div', 'app-actions app-feedback__actions');
  actions.append(sendBtn, mailBtn);
  form.append(status, actions);

  // The thank-you card (hidden until sent)
  const thanks = el('section', 'app-card app-feedback__thanks');
  thanks.hidden = true;
  const thanksTitle = el('h2', 'app-feedback__thanksTitle', t('ui.feedback.thanks.title'));
  thanksTitle.tabIndex = -1;
  const thanksText = el('p', 'app-about__text app-feedback__thanksText');
  const copyRow = el('div', 'app-feedback__copy');
  const copyNote = el('p', 'app-feedback__copied');
  copyNote.setAttribute('role', 'status');
  let lastMailBody = '';
  copyRow.append(el('p', 'app-feedback__noMail', t('ui.feedback.noMail')), button('app-btn app-btn--small', t('ui.feedback.copy'), () => copy(), shell.signal), copyNote);
  const thanksActions = el('div', 'app-actions');
  thanksActions.append(
    button('app-btn app-btn--main app-btn--big', t('ui.feedback.menu'), () => onMenu?.(), shell.signal),
    button('app-btn', t('ui.feedback.again'), () => showForm(), shell.signal),
  );
  thanks.append(thanksTitle, thanksText, copyRow, thanksActions);

  /** Read every answer as the screen shows it. @returns {object} the raw answers (game/feedback-logic.js cleans them) */
  function answers() {
    return Object.fromEntries(Object.entries(read).map(([id, fn]) => [id, fn()]));
  }

  /**
   * Show the thank-you card for how the answers went.
   * @param {'sent'|'queued'|'email'} how sent = to the developer; queued = saved for later (offline); email = the mail app opened
   * @returns {void}
   */
  function showThanks(how) {
    thanksText.textContent = t(`ui.feedback.thanks.${how}`);
    copyRow.hidden = how !== 'email';
    copyNote.textContent = '';
    form.hidden = true;
    thanks.hidden = false;
    body.scrollTop = 0;
    thanksTitle.focus({ preventScroll: true });
  }

  /** Back to the questions (with the answers still in them), to send more. @returns {void} */
  function showForm() {
    thanks.hidden = true;
    form.hidden = false;
    status.hidden = true;
    body.scrollTop = 0;
    intro.scrollIntoView?.({ block: 'start' });
    sendBtn.focus({ preventScroll: true });
  }

  /** Open the mail app with the answers, then the thank-you card. @returns {void} */
  function email() {
    const mail = mailFor?.(answers());
    if (!mail) return;
    lastMailBody = mail.body;
    openMail(mail.url);
    showThanks('email');
  }

  /** Send: the game sends the answers, keeps them for later, or asks for the mail app. @returns {Promise<void>} */
  async function send() {
    if (sendBtn.disabled) return;
    sendBtn.disabled = true;
    mailBtn.disabled = true;
    sendBtn.textContent = t('ui.feedback.sending');
    let how = 'email';
    try { how = (await onSend?.(answers())) ?? 'email'; } catch { how = 'email'; }
    sendBtn.disabled = false;
    mailBtn.disabled = false;
    sendBtn.textContent = t('ui.feedback.send');
    if (!shell.node.isConnected) return; // the player left meanwhile
    if (how === 'email') email();
    else showThanks(how);
  }

  /** Copy the mail text (for a phone or computer with no mail app). @returns {Promise<void>} */
  async function copy() {
    try {
      await navigator.clipboard.writeText(lastMailBody);
      copyNote.textContent = t('ui.feedback.copied');
    } catch {
      copyNote.textContent = t('ui.feedback.copyFailed');
    }
  }

  body.append(form, thanks);
  shell.node.append(head, body);
  return { node: shell.node, dispose: shell.dispose };
}
