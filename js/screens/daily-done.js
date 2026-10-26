// The daily challenge's "done today" screen (T8.5): shown instead of a customer once today's goal was reached (or the
// phone clock was moved back to a day already played). The streak in big letters, the best streak, a hint at
// tomorrow's goal and a button back to the menu. No replay: the reward is once per day.

import { el, button, screenShell } from './dom.js';
import { mascotArt } from './mascot.js';

/**
 * Build the "done today" screen.
 * @param {{t: (key: string, vars?: object) => string, streak?: number, best?: number, nextGoalKey?: string|null,
 *   onMenu?: () => void, reducedMotion?: boolean}} opts t = string function; streak = days in a row now; best = the
 *   longest streak; nextGoalKey = the name key of tomorrow's goal (data/daily.js); onMenu = the Menu button
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createDailyDoneScreen({ t, streak = 0, best = 0, nextGoalKey = null, onMenu, reducedMotion = false }) {
  const shell = screenShell('daily', { label: t('ui.daily.title'), reducedMotion });
  const body = el('div', 'app-body app-body--center app-end app-daily');
  const art = el('div', 'app-end__art');
  art.append(mascotArt());
  const card = el('div', 'app-card app-end__card');
  card.append(
    el('h1', 'app-end__title', t('ui.daily.title')),
    el('p', 'app-end__thanks', t('ui.daily.doneToday')),
    el('p', 'app-daily__streak', t('ui.daily.streak', { n: streak })),
    el('p', 'app-daily__best', t('ui.daily.best', { n: Math.max(best, streak) })),
  );
  if (nextGoalKey) card.append(el('p', 'app-daily__next', t('ui.daily.tomorrow', { goal: t(nextGoalKey) })));
  card.append(button('app-btn app-btn--main app-btn--big', t('ui.daily.menu'), () => onMenu?.(), shell.signal));
  body.append(art, card);
  shell.node.append(body);
  return { node: shell.node, dispose: shell.dispose };
}
