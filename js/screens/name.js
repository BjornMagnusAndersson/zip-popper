// The name screen (T3.1a, SPEC D8): the player types her own name on first start. The same field is used again in
// Settings (createNameField). The name is cleaned with sanitizeName, kept to NAME_MAX characters, shown only as plain
// text (never as HTML), and an empty field means the default name from the string table (name.default).

import { el, screenShell } from './dom.js';
import { resolveName, nameLimit } from './screen-logic.js';

/**
 * A name field with a confirm button. It reports the clean name (or the default name when the field is empty) and
 * puts that clean name back into the field.
 * @param {{t: (key: string, vars?: object) => string, value?: string, buttonKey?: string, showLabel?: boolean, signal: AbortSignal,
 *   onSubmit?: (name: string) => void}} opts t = string function; value = the name now; buttonKey = key of the button text;
 *   showLabel = false keeps the label for screen readers only (when a heading already says it);
 *   signal = removes the listeners on dispose; onSubmit = called with the clean name
 * @returns {{node: HTMLFormElement, input: HTMLInputElement, setValue: (v: string) => void}} the field
 */
export function createNameField({ t, value = '', buttonKey = 'ui.name.go', showLabel = true, signal, onSubmit }) {
  const form = el('form', 'app-namefield');
  form.noValidate = true;
  const label = el('label', showLabel ? 'app-field__label' : 'app-field__label app-sr', t('ui.name.label'));
  const input = el('input', 'app-input');
  input.type = 'text';
  input.name = 'player-name';
  input.id = `app-name-${Math.random().toString(36).slice(2, 8)}`;
  label.htmlFor = input.id;
  input.maxLength = nameLimit();
  input.value = value;
  input.placeholder = t('name.default');
  input.autocomplete = 'off';
  input.autocapitalize = 'words';
  input.spellcheck = false;
  input.enterKeyHint = 'done';
  const go = el('button', 'app-btn app-btn--main', t(buttonKey));
  go.type = 'submit';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const clean = resolveName(input.value, t('name.default'));
    input.value = clean;
    onSubmit?.(clean);
  }, { signal });
  form.append(label, input, go);
  return { node: form, input, setValue: (v) => { input.value = v; } };
}

/**
 * Build the first-start name screen, with a short "just a cartoon, do not try this at home" note under the field.
 * @param {{t: (key: string, vars?: object) => string, name?: string, onDone?: (name: string) => void, reducedMotion?: boolean}} opts
 *   t = string function; name = a name to start with (for example when the screen is shown again); onDone = called with the
 *   clean name (the default name when the field was empty)
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createNameScreen({ t, name = '', onDone, reducedMotion = false }) {
  const shell = screenShell('name', { label: t('ui.name.title'), reducedMotion });
  const card = el('div', 'app-card app-name');
  const field = createNameField({ t, value: name, signal: shell.signal, onSubmit: onDone });
  card.append(
    el('h1', 'app-name__title', t('ui.name.title')),
    el('p', 'app-name__prompt', t('ui.name.prompt')),
    field.node,
    el('p', 'app-name__hint', t('ui.name.hint', { max: nameLimit(), default: t('name.default') })),
    el('p', 'app-name__cartoon', t('ui.name.cartoon')), // seen once, on first start (owner 2026-10-28; About says more)
  );
  const body = el('div', 'app-body app-body--center');
  body.append(card);
  shell.node.append(body);
  return { node: shell.node, dispose: shell.dispose };
}
