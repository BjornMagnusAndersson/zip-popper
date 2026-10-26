// The main menu (T3.1a): Continue (shows the current chapter's title), Free play, Comics, Shop, Settings, About.
// State comes in, every tap goes out through a callback. update({playerName, chapterTitleKey}) refreshes the greeting
// and the Continue line when the save changes.

import { el, screenShell } from './dom.js';
import { mascotArt } from './mascot.js';

/**
 * Build the main menu.
 * @param {{t: (key: string, vars?: object) => string, playerName?: string, chapterTitleKey?: string,
 *   onContinue?: () => void, onFreePlay?: () => void, onComics?: () => void, onShop?: () => void,
 *   onSettings?: () => void, onAbout?: () => void, showShop?: boolean, reducedMotion?: boolean}} opts
 *   t = string function; playerName = the player's name (plain text); chapterTitleKey = string key of the current chapter's
 *   title; the on... callbacks report which button was tapped; showShop = false leaves the Shop button out (the
 *   shop opens with the career chapter)
 * @returns {{node: HTMLElement, update: (data: {playerName?: string, chapterTitleKey?: string}) => void, dispose: () => void}} the screen
 */
export function createMenuScreen({
  t, playerName = '', chapterTitleKey, onContinue, onFreePlay, onComics, onShop, onSettings, onAbout, showShop = true,
  reducedMotion = false,
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

  /** Add one menu button. @param {string} key label string key @param {(() => void)|undefined} fn tap callback @returns {void} */
  const add = (key, fn) => {
    const b = el('button', 'app-menubtn', t(key));
    b.type = 'button';
    b.addEventListener('click', () => fn?.(), { signal: shell.signal });
    list.append(b);
  };
  add('ui.menu.freePlay', onFreePlay);
  add('ui.menu.comics', onComics);
  if (showShop) add('ui.menu.shop', onShop);
  add('ui.menu.settings', onSettings);
  add('ui.menu.about', onAbout);

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
