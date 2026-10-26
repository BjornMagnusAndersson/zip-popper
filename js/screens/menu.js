// The main menu (T3.1a): Continue (shows the current chapter's title), Keep working (T5.4, only after the ending),
// Free play, Comics, Field guide (T6.5, when the game passes onGuide), Face album (T8.2, when the game passes onAlbum),
// Shop, Your studio (T5.1c), Settings, About.
// State comes in, every tap goes out through a callback. update({playerName, chapterTitleKey}) refreshes the greeting
// and the Continue line when the save changes.

import { el, screenShell } from './dom.js';
import { mascotArt } from './mascot.js';

/**
 * Build the main menu.
 * @param {{t: (key: string, vars?: object) => string, playerName?: string, chapterTitleKey?: string,
 *   onContinue?: () => void, onFreePlay?: () => void, onComics?: () => void, onGuide?: () => void, onShop?: () => void,
 *   onStudio?: () => void, onSettings?: () => void, onAbout?: () => void, showShop?: boolean, showStudio?: boolean,
 *   reducedMotion?: boolean, showKeepWorking?: boolean, onKeepWorking?: () => void, keepWorkingPercent?: number,
 *   onAlbum?: () => void}} opts (onAlbum = the Face album button's tap; left out = no button, T8.2)
 *   t = string function; playerName = the player's name (plain text); chapterTitleKey = string key of the current chapter's
 *   title; the on... callbacks report which button was tapped; showShop = false leaves the Shop button out (the
 *   shop opens with the career chapter); showStudio = true adds the "Your studio" button (the studio view, T5.1c;
 *   the game shows it where the shop is open); showKeepWorking = true adds "Keep working" under Continue (T5.4, after
 *   the ending), with keepWorkingPercent (its pay) on its second line; onKeepWorking = its tap
 * @returns {{node: HTMLElement, update: (data: {playerName?: string, chapterTitleKey?: string}) => void, dispose: () => void}} the screen
 */
export function createMenuScreen({
  t, playerName = '', chapterTitleKey, onContinue, onFreePlay, onComics, onGuide, onShop, onStudio, onSettings, onAbout, showShop = true,
  showStudio = false, reducedMotion = false, showKeepWorking = false, onKeepWorking, keepWorkingPercent = 60, onAlbum,
}) {
  const shell = screenShell('menu', { label: t('ui.menu.title'), reducedMotion });
  const body = el('div', 'app-body app-menu');
  const top = el('div', 'app-menu__top');
  const art = el('div', 'app-menu__art');
  art.append(mascotArt());
  const hello = el('h1', 'app-menu__hello');
  top.append(art, hello);
  const list = el('nav', 'app-menu__list');
  list.setAttribute('aria-label', t('ui.menu.title'));

  const cont = el('button', 'app-menubtn app-menubtn--main');
  cont.type = 'button';
  const contLabel = el('span', 'app-menubtn__label', t('ui.menu.continue'));
  const contSub = el('span', 'app-menubtn__sub');
  cont.append(contLabel, contSub);
  cont.addEventListener('click', () => onContinue?.(), { signal: shell.signal });
  list.append(cont);
  if (showKeepWorking) { // Keep working (T5.4): after the ending, random customers at lower pay
    const work = el('button', 'app-menubtn app-menubtn--work');
    work.type = 'button';
    work.append(el('span', 'app-menubtn__label', t('ui.menu.keepWorking')), el('span', 'app-menubtn__sub', t('ui.menu.keepWorkingSub', { pct: keepWorkingPercent })));
    work.addEventListener('click', () => onKeepWorking?.(), { signal: shell.signal });
    list.append(work);
  }

  /** Add one menu button. @param {string} key label string key @param {(() => void)|undefined} fn tap callback @returns {void} */
  const add = (key, fn) => {
    const b = el('button', 'app-menubtn', t(key));
    b.type = 'button';
    b.addEventListener('click', () => fn?.(), { signal: shell.signal });
    list.append(b);
  };
  add('ui.menu.freePlay', onFreePlay);
  add('ui.menu.comics', onComics);
  if (onGuide) add('ui.menu.guide', onGuide); // the Field guide (T6.5): always there, like Comics (unmet cards are locked)
  if (onAlbum) add('ui.menu.album', onAlbum); // the Face album (T8.2): the game passes it from the career chapter on
  if (showShop) add('ui.menu.shop', onShop);
  if (showStudio) add('ui.menu.studio', onStudio);
  add('ui.menu.settings', onSettings);
  add('ui.menu.about', onAbout);
  if (list.children.length > 9) list.classList.add('app-menu__list--long'); // ten buttons (T8.2): a little tighter, so they fit
  /** Show the greeting and the Continue line for the current data. @param {{playerName?: string, chapterTitleKey?: string}} data new data @returns {void} */
  function render(data) {
    hello.textContent = data.playerName ? t('ui.menu.hello', { name: data.playerName }) : t('ui.menu.helloNoName');
    contSub.textContent = data.chapterTitleKey ? t('ui.menu.continueSub', { title: t(data.chapterTitleKey) }) : '';
    contSub.hidden = !data.chapterTitleKey;
  }
  render({ playerName, chapterTitleKey });

  body.append(top, list);
  shell.node.append(body);
  return {
    node: shell.node,
    /** Refresh the greeting and the Continue line. @param {{playerName?: string, chapterTitleKey?: string}} data new data @returns {void} */
    update(data) { render(data); },
    dispose: shell.dispose,
  };
}
