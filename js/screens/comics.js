// The comics screen (T3.1a): the list of all strips. Strips the player has seen can be replayed; unseen ones show as
// locked ("???"). The screen only reports a tap (onPlay with the strip id); the game starts the comic player.

import { el, button, icon, header, screenShell } from './dom.js';
import { comicEntries } from './screen-logic.js';

/**
 * Build the comics screen.
 * @param {{t: (key: string, vars?: object) => string, strips: {id: string, titleKey: string, kind?: string}[], seen?: string[],
 *   onPlay?: (stripId: string) => void, onBack?: () => void, reducedMotion?: boolean}} opts
 *   t = string function; strips = every strip in display order (kind: 'chapter', 'milestone' or 'teaser'); seen = ids of
 *   the strips already seen; onPlay = Replay was tapped; onBack = Back
 * @returns {{node: HTMLElement, update: (data: {seen?: string[], strips?: object[]}) => void, dispose: () => void}} the screen
 */
export function createComicsScreen({ t, strips, seen = [], onPlay, onBack, reducedMotion = false }) {
  const shell = screenShell('comics', { label: t('ui.comics.title'), reducedMotion });
  let allStrips = strips;
  let seenIds = seen;
  const head = header(t, t('ui.comics.title'), onBack, shell.signal);
  const count = el('p', 'app-comics__count');
  const list = el('div', 'app-body app-comics');

  /** Draw the list for the current data. @returns {void} */
  function render() {
    const entries = comicEntries(allStrips, seenIds);
    const found = entries.filter((e) => e.seen).length;
    count.textContent = t('ui.comics.count', { seen: found, total: entries.length });
    list.textContent = '';
    for (const e of entries) {
      const card = el('article', `app-comic app-comic--${e.kind}${e.seen ? '' : ' app-comic--locked'}`);
      const kind = el('span', 'app-comic__kind', t(`ui.comics.kind.${e.kind}`));
      const title = el('h2', 'app-comic__title', e.seen ? t(e.titleKey) : t('ui.comics.hidden'));
      const text = el('div', 'app-comic__text');
      text.append(kind, title);
      if (!e.seen) text.append(el('p', 'app-comic__lockedHint', t('ui.comics.lockedHint')));
      card.append(text);
      if (e.seen) {
        card.append(button('app-btn app-btn--main app-btn--small', t('ui.comics.replay'), () => onPlay?.(e.id), shell.signal));
      } else {
        const lock = el('span', 'app-comic__lock');
        lock.setAttribute('role', 'img');
        lock.setAttribute('aria-label', t('ui.comics.locked'));
        lock.append(icon('lock'));
        card.append(lock);
      }
      list.append(card);
    }
  }
  render();
  shell.node.append(head, count, list);
  return {
    node: shell.node,
    /** Show a new seen-list and/or strip list. @param {{seen?: string[], strips?: object[]}} data new data @returns {void} */
    update(data) {
      if (data.seen) seenIds = data.seen;
      if (data.strips) allStrips = data.strips;
      render();
    },
    dispose: shell.dispose,
  };
}
