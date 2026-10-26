// The shop screen (T3.1a): tabs Tools / Studio / Outfit, each item with its price, a Buy button, the reason it is locked
// (from economy.js whyNot, as a string key) or an "Owned" mark; the coins and the reputation tier show on top.
// The economy state comes in; a tap on Buy is only reported (onBuy). The game buys, saves and calls update(state).

import { el, button, icon, coinPill, header, screenShell } from './dom.js';
import { SHOP_TABS, shopEntries, tierInfo } from './screen-logic.js';

/**
 * Build the shop screen.
 * @param {{t: (key: string, vars?: object) => string, state: object, tab?: string, onBuy?: (itemId: string) => void,
 *   onBack?: () => void, reducedMotion?: boolean}} opts
 *   t = string function; state = the economy state (money, reputation, items ...); tab = which tab to start on;
 *   onBuy = Buy was tapped for an item id; onBack = Back
 * @returns {{node: HTMLElement, update: (data: {state?: object, tab?: string}) => void, dispose: () => void}} the screen
 */
export function createShopScreen({ t, state, tab = 'tools', onBuy, onBack, reducedMotion = false }) {
  const shell = screenShell('shop', { label: t('ui.shop.title'), reducedMotion });
  let current = state;
  let activeTab = SHOP_TABS.some((x) => x.id === tab) ? tab : 'tools';

  const head = header(t, t('ui.shop.title'), onBack, shell.signal);
  const stats = el('div', 'app-shopstats');
  const tabs = el('div', 'app-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', t('ui.shop.tabs'));
  const panel = el('div', 'app-body app-shoplist');
  panel.setAttribute('role', 'tabpanel');

  const tabButtons = SHOP_TABS.map((x) => {
    const b = el('button', 'app-tab', t(x.labelKey));
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => { activeTab = x.id; render(); panel.scrollTop = 0; }, { signal: shell.signal });
    tabs.append(b);
    return b;
  });

  /** Draw the coins, the reputation tier and the progress to the next tier. @returns {void} */
  function renderStats() {
    const info = tierInfo(current.reputation);
    stats.textContent = '';
    const coins = coinPill(t('ui.coins', { n: current.money }), 'app-pill--big');
    coins.setAttribute('aria-label', t('ui.shop.coinsLabel', { n: current.money }));
    const rep = el('span', 'app-pill app-pill--rep');
    rep.append(icon('heart'), el('span', 'app-pill__text', t('ui.shop.rep', { n: current.reputation, tier: t(info.nameKey) })));
    const line = el('p', 'app-shopstats__next', info.next
      ? t('ui.shop.nextTier', { n: info.next.missing, tier: t(info.next.nameKey) })
      : t('ui.shop.maxTier'));
    const pills = el('div', 'app-shopstats__pills');
    pills.append(coins, rep);
    stats.append(pills, line);
  }

  /** Draw one item card. @param {ReturnType<typeof shopEntries>[number]} item the entry @param {string} kindIcon icon name @returns {HTMLElement} the card */
  function itemCard(item, kindIcon) {
    const card = el('article', `app-item${item.owned ? ' app-item--owned' : ''}${!item.owned && !item.canBuy ? ' app-item--locked' : ''}`);
    const badge = el('span', 'app-item__badge');
    badge.append(icon(kindIcon));
    const text = el('div', 'app-item__text');
    text.append(el('h2', 'app-item__name', t(item.nameKey)), el('p', 'app-item__desc', t(item.descKey)));
    const side = el('div', 'app-item__side');
    if (item.owned) {
      const owned = el('span', 'app-owned');
      owned.append(icon('check'), el('span', '', t('ui.shop.owned')));
      side.append(owned);
      if (item.scrubWaiting) text.append(el('p', 'app-item__note', t('ui.shop.scrub')));
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
        why.append(icon('lock'), el('span', '', t(item.why.key, item.why.vars)));
        text.append(why);
      }
    }
    card.append(badge, text, side);
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
    const entries = shopEntries(current, activeTab);
    const kindIcon = { tools: 'tool', studio: 'studio', outfit: 'outfit' }[activeTab] ?? 'tool';
    if (entries.length === 0) panel.append(el('p', 'app-empty', t('ui.shop.empty')));
    for (const item of entries) panel.append(itemCard(item, kindIcon));
    panel.scrollTop = keep;
  }
  render();

  const bar = el('div', 'app-shopbar');
  bar.append(stats, tabs);
  shell.node.append(head, bar, panel);
  return {
    node: shell.node,
    /** Show new economy state and/or another tab. @param {{state?: object, tab?: string}} data new data @returns {void} */
    update(data) {
      if (data.state) current = data.state;
      if (data.tab && SHOP_TABS.some((x) => x.id === data.tab)) activeTab = data.tab;
      render();
    },
    dispose: shell.dispose,
  };
}
