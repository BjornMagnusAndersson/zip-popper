// The shop screen (T3.1a): tabs Tools / Studio / Outfit, each item with its price, a Buy button, the reason it is locked
// (from economy.js whyNot, as a string key) or an "Owned" mark; the coins and the reputation tier show on top.
// T5.3b: the coins sit in the top row and the wearing strip and studio button sit with the tabs (a narrow left column
// in landscape), so the list gets the room.
// The economy state comes in; a tap on Buy is only reported (onBuy). The game buys, saves and calls update(state).

import { el, svg, button, icon, itemIcon, coinPill, header, screenShell } from './dom.js';
import { SHOP_TABS, shopEntries, tierInfo, wornOutfit, canScrollMore } from './screen-logic.js';
import { drawCharacter, drawScrubCap, headSpot, OUTFITS } from '../game/comic-art.js';
import { studioCapStart } from '../game/studio.js';

/**
 * Build the shop screen.
 * @param {{t: (key: string, vars?: object) => string, state: object, tab?: string, onBuy?: (itemId: string) => void,
 *   onBack?: () => void, onStudio?: () => void, reducedMotion?: boolean}} opts
 *   t = string function; state = the economy state (money, reputation, items ...); tab = which tab to start on;
 *   onBuy = Buy was tapped for an item id; onBack = Back; onStudio = "See your studio" on the Studio tab (T5.1c; left
 *   out = no such button)
 * @returns {{node: HTMLElement, update: (data: {state?: object, tab?: string}) => void, dispose: () => void}} the screen
 */
export function createShopScreen({ t, state, tab = 'tools', onBuy, onBack, onStudio, reducedMotion = false }) {
  const shell = screenShell('shop', { label: t('ui.shop.title'), reducedMotion });
  let current = state;
  let activeTab = SHOP_TABS.some((x) => x.id === tab) ? tab : 'tools';
  let capOn = true; // the scrub cap on her picture in the Outfit tab (a tap takes it off); only kept while this screen is open

  const head = header(t, t('ui.shop.title'), onBack, shell.signal);
  const coinsSlot = el('span', 'app-shopcoins'); // the coins pill, in the top row next to the title (T5.3b)
  head.append(coinsSlot);
  const stats = el('div', 'app-shopstats');
  const extras = el('div', 'app-shopextras'); // the wearing strip and the "See your studio" button, above the list
  const tabs = el('div', 'app-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', t('ui.shop.tabs'));
  const panel = el('div', 'app-body app-shoplist');
  panel.setAttribute('role', 'tabpanel');
  // T5.3b: the list sits in a frame with a bouncing "more below" arrow that shows only while the list can scroll further.
  const listFrame = el('div', 'app-shoplistframe');
  const more = el('button', 'app-shopmore');
  more.type = 'button';
  more.setAttribute('aria-label', t('ui.shop.moreBelow'));
  more.append(icon('back'));
  listFrame.append(panel, more);

  const tabButtons = SHOP_TABS.map((x) => {
    const b = el('button', 'app-tab', t(x.labelKey));
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => { activeTab = x.id; render(); panel.scrollTop = 0; }, { signal: shell.signal });
    tabs.append(b);
    return b;
  });

  /** Draw the coins (top row) and one reputation pill with the progress to the next tier inside it. @returns {void} */
  function renderStats() {
    const info = tierInfo(current.reputation);
    stats.textContent = '';
    coinsSlot.textContent = '';
    const coins = coinPill(t('ui.coins', { n: current.money }), 'app-pill--big');
    coins.setAttribute('aria-label', t('ui.shop.coinsLabel', { n: current.money }));
    coinsSlot.append(coins);
    const rep = el('span', 'app-pill app-pill--rep app-pill--stack');
    const words = el('span', 'app-pill__stack');
    words.append(
      el('span', 'app-pill__text', t('ui.shop.rep', { n: current.reputation, tier: t(info.nameKey) })),
      el('span', 'app-shopstats__next', info.next
        ? t('ui.shop.nextTier', { n: info.next.missing, tier: t(info.next.nameKey) })
        : t('ui.shop.maxTier')),
    );
    rep.append(icon('heart'), words);
    stats.append(rep);
  }

  /**
   * The "wearing now" strip of the Outfit tab: a bigger picture of her in the outfit she has on, and its name. In the
   * scrubs the picture is a button: a tap takes her cap off (it floats beside her) and again puts it back, like the studio view.
   * @returns {HTMLElement} the strip
   */
  function wearingStrip() {
    const worn = wornOutfit(current);
    const name = t(worn.nameKey);
    const canCap = studioCapStart(worn.outfit, OUTFITS).toggle;
    const box = el('div', 'app-wearing');
    const pic = svg('svg', { class: 'app-wearing__pic', viewBox: '-170 -680 340 700', role: canCap ? null : 'img', 'aria-label': canCap ? null : t('ui.shop.preview', { outfit: name }), 'aria-hidden': canCap ? 'true' : null });
    const layer = { x: 0, y: 0, scale: 1, pose: 'hips', expr: 'happy', outfit: worn.outfit, look: -1, cap: canCap && capOn };
    pic.append(drawCharacter('heroine', layer).node);
    if (canCap && !capOn) {
      // the cap she took off rests beside her, at the lower right
      const spot = headSpot('heroine', layer);
      const cap = svg('g', { transform: `translate(104 -40) rotate(-12) scale(${spot.scale * 0.5})` });
      cap.append(drawScrubCap());
      pic.append(cap);
    }
    const text = el('div', 'app-wearing__text');
    text.append(el('p', 'app-wearing__label', t('ui.shop.wearingNow')), el('p', 'app-wearing__name', name));
    if (canCap) {
      text.append(el('p', 'app-wearing__hint', t(capOn ? 'ui.shop.capHint' : 'ui.shop.capHintOn')));
      const tap = el('button', 'app-wearing__tap');
      tap.type = 'button';
      tap.setAttribute('aria-label', `${t('ui.shop.preview', { outfit: name })}. ${t(capOn ? 'ui.studio.capOff' : 'ui.studio.capOn')}`);
      tap.append(pic);
      tap.addEventListener('click', toggleCap, { signal: shell.signal });
      box.append(tap, text);
    } else box.append(pic, text);
    return box;
  }

  /** Take her scrub cap off, or put it back on (the picture is drawn again; she gives a little hop unless motion is off). @returns {void} */
  function toggleCap() {
    capOn = !capOn;
    render();
    const tap = extras.querySelector('.app-wearing__tap'); // the picture was drawn again: keep the keyboard focus on it
    tap?.focus();
    if (!reducedMotion) tap?.classList.add('app-wearing__tap--hop');
  }

  /** Draw one item card. @param {ReturnType<typeof shopEntries>[number]} item the entry @param {string} kindIcon the tab's icon name (for an item without its own icon) @returns {HTMLElement} the card */
  function itemCard(item, kindIcon) {
    const card = el('article', `app-item${item.owned ? ' app-item--owned' : ''}${item.scrubWaiting ? ' app-item--scrub' : ''}${!item.owned && !item.canBuy ? ' app-item--locked' : ''}`);
    const badge = el('span', 'app-item__badge');
    badge.append(itemIcon(item.id, kindIcon)); // each item its own picture; the tab's icon for an item without one (B40a)
    const text = el('div', 'app-item__text');
    text.append(el('h2', 'app-item__name', t(item.nameKey)), el('p', 'app-item__desc', t(item.descKey)));
    const side = el('div', 'app-item__side');
    if (item.owned) {
      const owned = el('span', `app-owned${item.scrubWaiting ? ' app-owned--scrub' : ''}`);
      if (item.scrubWaiting) owned.append(el('span', '', t('ui.shop.scrubTag')));
      else owned.append(icon('check'), el('span', '', t('ui.shop.owned')));
      side.append(owned);
      if (item.scrubWaiting) text.append(el('p', 'app-item__note', t('ui.shop.scrub')));
      if (item.wearing) side.append(el('span', 'app-wearing-tag', t('ui.shop.wearing')));
    } else if (item.story) {
      const why = el('p', 'app-item__why');
      why.append(icon('lock'), el('span', '', t('ui.shop.why.story')));
      side.append(why);
    } else {
      const price = coinPill(String(item.price));
      price.setAttribute('aria-label', t('ui.coins', { n: item.price }));
      side.append(price);
      const buy = button('app-btn app-btn--main app-btn--small', t('ui.shop.buy'), () => onBuy?.(item.id), shell.signal);
      buy.disabled = !item.canBuy;
      if (!item.canBuy) buy.setAttribute('aria-describedby', `app-why-${item.id}`);
      side.append(buy);
      if (item.why) {
        const why = el('p', 'app-item__why');
        why.id = `app-why-${item.id}`;
        const vars = item.why.vars.nameKey ? { ...item.why.vars, name: t(item.why.vars.nameKey) } : item.why.vars;
        why.append(icon('lock'), el('span', '', t(item.why.key, vars)));
        text.append(why);
      }
    }
    card.append(badge, text, side);
    return card;
  }

  /**
   * The "Coming soon" card at the end of the Tools tab (owner 2026-10-28, SPEC D42): a greyed mystery card that hints
   * more is planned without saying what (customers already ask for facials). Nothing to buy.
   * @returns {HTMLElement} the card
   */
  function soonCard() {
    const card = el('article', 'app-item app-item--locked app-item--soon');
    card.append(
      el('span', 'app-item__badge app-item__badge--soon', '?'),
      (() => { const text = el('div', 'app-item__text'); text.append(el('h2', 'app-item__name', t('ui.shop.soon.name')), el('p', 'app-item__desc', t('ui.shop.soon.desc'))); return text; })(),
      (() => { const side = el('div', 'app-item__side'); side.append(el('span', 'app-soon-tag', t('ui.shop.soon.tag'))); return side; })(),
    );
    return card;
  }

  /** Draw the tabs and the list of the active tab, keeping the scroll place. @returns {void} */
  function render() {
    const keep = panel.scrollTop;
    renderStats();
    SHOP_TABS.forEach((x, i) => {
      tabButtons[i].setAttribute('aria-selected', String(x.id === activeTab));
      tabButtons[i].classList.toggle('app-tab--on', x.id === activeTab);
    });
    panel.textContent = '';
    extras.textContent = '';
    const entries = shopEntries(current, activeTab);
    const kindIcon = { tools: 'tool', studio: 'studio', outfit: 'outfit' }[activeTab] ?? 'tool';
    if (activeTab === 'outfit') extras.append(wearingStrip());
    if (activeTab === 'studio' && onStudio) extras.append(button('app-btn app-shop-studio', t('ui.shop.seeStudio'), () => onStudio(), shell.signal));
    if (entries.length === 0) panel.append(el('p', 'app-empty', t('ui.shop.empty')));
    for (const item of entries) panel.append(itemCard(item, kindIcon));
    if (activeTab === 'tools') panel.append(soonCard()); // more is coming (SPEC D42)
    panel.scrollTop = keep;
    updateMore();
  }
  /** Show the "more below" arrow only while the list can scroll further down. @returns {void} */
  function updateMore() {
    more.hidden = !canScrollMore(panel.scrollTop, panel.clientHeight, panel.scrollHeight);
  }
  more.addEventListener('click', () => panel.scrollBy({ top: Math.max(120, panel.clientHeight * 0.8), behavior: reducedMotion ? 'auto' : 'smooth' }), { signal: shell.signal });
  panel.addEventListener('scroll', updateMore, { passive: true, signal: shell.signal });
  window.addEventListener('resize', updateMore, { signal: shell.signal });
  const watcher = typeof ResizeObserver === 'function' ? new ResizeObserver(updateMore) : null;
  watcher?.observe(panel);
  render();
  more.hidden = true;
  requestAnimationFrame(updateMore);

  const bar = el('div', 'app-shopbar');
  bar.append(stats, tabs, extras);
  shell.node.append(head, bar, listFrame);
  return {
    node: shell.node,
    /** Show new economy state and/or another tab. @param {{state?: object, tab?: string}} data new data @returns {void} */
    update(data) {
      if (data.state) current = data.state;
      if (data.tab && SHOP_TABS.some((x) => x.id === data.tab)) activeTab = data.tab;
      render();
    },
    /** Stop watching the list and remove the screen. @returns {void} */
    dispose() { watcher?.disconnect(); shell.dispose(); },
  };
}
