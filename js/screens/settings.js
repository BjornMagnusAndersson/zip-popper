// The settings screen (T3.1a): the player's name (the same field as the first start), switches for sound, music,
// vibration, reduced motion and the two-finger squeeze (T1.7, with a hint line), export and import of the save file, and "Start over" with a confirm step.
// Nothing is saved here: every change is reported (onName, onToggle, onExport, onImport, onReset) and the game saves.

import { el, button, icon, header, screenShell } from './dom.js';
import { createNameField } from './name.js';
import { SETTING_TOGGLES, SETTING_SLIDERS, volumePercent } from './screen-logic.js';

/**
 * Build the settings screen.
 * @param {{t: (key: string, vars?: object) => string, playerName?: string,
 *   settings?: {sound?: boolean, music?: boolean, vibration?: boolean, reducedMotion?: boolean},
 *   onName?: (name: string) => void, onToggle?: (key: string, value: boolean) => void, onExport?: () => void,
 *   onImport?: (text: string) => void, onReset?: () => void, onBack?: () => void, reducedMotion?: boolean,
 *   onVolume?: (key: string, value: number, final: boolean) => void}} opts
 *   t = string function; playerName = the name now; settings = the switches and the two volumes (musicVolume, sfxVolume,
 *   0 to 1); onName = a clean name was confirmed;
 *   onToggle = a switch changed (setting name, new value); onExport = Export save; onImport = the text of the chosen save
 *   file; onReset = the player confirmed "Start over"; onBack = Back; onVolume = a volume slider moved (setting name,
 *   0 to 1, final = true when the finger or key was let go)
 * @returns {{node: HTMLElement, update: (data: {playerName?: string, settings?: object, notice?: {key: string, vars?: object}|null}) => void,
 *   dispose: () => void}} the screen. update can also show a notice line (a string key), such as the result of an import.
 */
export function createSettingsScreen({
  t, playerName = '', settings = {}, onName, onToggle, onVolume, onExport, onImport, onReset, onBack, reducedMotion = false,
}) {
  const shell = screenShell('settings', { label: t('ui.settings.title'), reducedMotion });
  let values = { sound: true, music: true, vibration: true, reducedMotion: false, squeeze: false, ...settings };
  const head = header(t, t('ui.settings.title'), onBack, shell.signal);
  const body = el('div', 'app-body app-settings');
  const notice = el('p', 'app-notice');
  notice.setAttribute('role', 'status');
  notice.hidden = true;

  /** Show (or clear) the notice line. @param {{key: string, vars?: object}|null|undefined} n the notice @returns {void} */
  function showNotice(n) {
    notice.hidden = !n;
    notice.textContent = n ? t(n.key, n.vars ?? {}) : '';
  }

  // Name
  const nameCard = el('section', 'app-card app-setcard');
  nameCard.append(el('h2', 'app-setcard__title', t('ui.settings.name')));
  const field = createNameField({
    t, value: playerName, buttonKey: 'ui.settings.nameSave', showLabel: false, signal: shell.signal,
    onSubmit: (name) => { onName?.(name); showNotice({ key: 'ui.settings.nameSaved' }); },
  });
  nameCard.append(field.node);

  // Switches
  const switchCard = el('section', 'app-card app-setcard');
  const switches = SETTING_TOGGLES.map((tog) => {
    const row = el('div', 'app-switchrow');
    let label = el('span', 'app-switchrow__label', t(tog.labelKey));
    if (tog.hintKey) { // a switch with a short explanation under its name (the two-finger squeeze, T1.7)
      const text = el('div', 'app-switchrow__text');
      text.append(label, el('span', 'app-switchrow__hint', t(tog.hintKey)));
      label = text;
    }
    const sw = el('button', 'app-switch');
    sw.type = 'button';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-label', t(tog.labelKey));
    const state = el('span', 'app-switch__state');
    sw.append(el('span', 'app-switch__knob'), state);
    sw.addEventListener('click', () => {
      values = { ...values, [tog.id]: !values[tog.id] };
      paint();
      onToggle?.(tog.id, values[tog.id]);
    }, { signal: shell.signal });
    row.append(label, sw);
    switchCard.append(row);
    return { tog, sw, state };
  });

  /** Show every switch as on or off. @returns {void} */
  function paint() {
    for (const { tog, sw, state } of switches) {
      const on = Boolean(values[tog.id]);
      sw.setAttribute('aria-checked', String(on));
      sw.classList.toggle('app-switch--on', on);
      state.textContent = t(on ? 'ui.settings.on' : 'ui.settings.off');
    }
  }
  paint();

  // Volume sliders (music and sound effects): they report while dragging (final = false) and when let go (final = true)
  const sliders = SETTING_SLIDERS.map((def) => {
    const id = `app-vol-${def.id}`;
    const row = el('div', 'app-sliderrow');
    const label = el('label', 'app-sliderrow__label', t(def.labelKey));
    label.htmlFor = id;
    const shown = el('span', 'app-sliderrow__value');
    const input = el('input', 'app-slider');
    input.type = 'range';
    input.id = id;
    input.min = '0';
    input.max = '100';
    input.step = '1';
    /** Show the number next to the name and keep the slider handle in line. @returns {void} */
    const paintOne = () => {
      const pct = volumePercent(values[def.id], def.fallback);
      input.value = String(pct);
      input.style.setProperty('--fill', `${pct}%`);
      shown.textContent = t('ui.settings.percent', { value: pct });
      input.setAttribute('aria-valuetext', shown.textContent);
    };
    /** The slider moved or was let go: remember the value and tell the game. @param {boolean} final true when let go @returns {void} */
    const move = (final) => {
      const pct = volumePercent(Number(input.value) / 100, def.fallback);
      values = { ...values, [def.id]: pct / 100 };
      paintOne();
      onVolume?.(def.id, pct / 100, final);
    };
    input.addEventListener('input', () => move(false), { signal: shell.signal });
    input.addEventListener('change', () => move(true), { signal: shell.signal });
    const top = el('div', 'app-sliderrow__top');
    top.append(label, shown);
    row.append(top, input);
    switchCard.append(row);
    paintOne();
    return paintOne;
  });

  // Save file
  const saveCard = el('section', 'app-card app-setcard');
  const file = el('input');
  file.type = 'file';
  file.accept = '.json,application/json';
  file.hidden = true;
  file.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    file.value = '';
    if (!chosen) return;
    try {
      onImport?.(await chosen.text());
    } catch {
      showNotice({ key: 'ui.settings.importFailed' });
    }
  }, { signal: shell.signal });
  const saveRow = el('div', 'app-actions app-actions--row');
  saveRow.append(
    button('app-btn', t('ui.settings.export'), () => onExport?.(), shell.signal),
    button('app-btn', t('ui.settings.import'), () => file.click(), shell.signal),
  );
  saveCard.append(el('h2', 'app-setcard__title', t('ui.settings.save')), saveRow, file);

  // Start over, with a confirm step
  const resetCard = el('section', 'app-card app-setcard app-setcard--danger');
  const resetBtn = button('app-btn app-btn--danger app-reset', t('ui.settings.reset'), () => askReset(true), shell.signal);
  const confirm = el('div', 'app-confirm');
  confirm.setAttribute('role', 'alertdialog');
  confirm.setAttribute('aria-label', t('ui.settings.resetAsk'));
  confirm.hidden = true;
  const keepBtn = button('app-btn app-btn--main', t('ui.settings.resetNo'), () => askReset(false), shell.signal);
  const confirmRow = el('div', 'app-actions');
  confirmRow.append(keepBtn, button('app-btn app-btn--danger app-reset-yes', t('ui.settings.resetYes'), () => { askReset(false); onReset?.(); }, shell.signal));
  confirm.append(el('p', 'app-confirm__ask', t('ui.settings.resetAsk')), el('p', 'app-confirm__warn', t('ui.settings.resetWarn')), confirmRow);
  resetCard.append(resetBtn, confirm);
  shell.node.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !confirm.hidden) askReset(false); }, { signal: shell.signal });

  /** Show or hide the "are you sure" step; the safe button gets the focus. @param {boolean} on true = ask @returns {void} */
  function askReset(on) {
    confirm.hidden = !on;
    resetBtn.hidden = on;
    if (on) keepBtn.focus(); else resetBtn.focus();
  }

  body.append(notice, nameCard, switchCard, saveCard, resetCard);
  shell.node.append(head, body);
  return {
    node: shell.node,
    /** Show new values and/or a notice line. @param {{playerName?: string, settings?: object, notice?: {key: string, vars?: object}|null}} data new data @returns {void} */
    update(data) {
      if (data.playerName !== undefined) field.setValue(data.playerName);
      if (data.settings) { values = { ...values, ...data.settings }; paint(); for (const p of sliders) p(); }
      if (data.notice !== undefined) showNotice(data.notice);
    },
    dispose: shell.dispose,
  };
}
