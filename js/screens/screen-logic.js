// The thinking part of the non-pop screens (T3.1a): stars, coin rows, shop lists, tiers, names and comic lists.
// Pure functions only: no DOM, no storage, no clock, so Node can test them. The screens (title.js, result.js, shop.js ...)
// only draw what these functions return. Text is never made here, only string KEYS plus their {placeholders}.

import { NAME_MAX, sanitizeName } from '../core/save.js';
import { SHOP_ITEMS, SHOP_ITEM_IDS, TIER_THRESHOLDS } from '../data/economy-data.js';
import { whyNot, tierFor } from '../game/economy.js';

/** The three shop tabs in order: id, the kind of item it lists (economy-data.js) and its string key. */
export const SHOP_TABS = [
  { id: 'tools', kind: 'tool', labelKey: 'ui.shop.tab.tools' },
  { id: 'studio', kind: 'studio', labelKey: 'ui.shop.tab.studio' },
  { id: 'outfit', kind: 'outfit', labelKey: 'ui.shop.tab.outfit' },
];

/** The settings switches in order: the settings field, its string key, and an optional hint line under it. */
export const SETTING_TOGGLES = [
  { id: 'sound', labelKey: 'ui.settings.sound' },
  { id: 'music', labelKey: 'ui.settings.music' },
  { id: 'vibration', labelKey: 'ui.settings.vibration' },
  { id: 'reducedMotion', labelKey: 'ui.settings.reducedMotion' },
  { id: 'squeeze', labelKey: 'ui.settings.squeeze', hintKey: 'ui.settings.squeezeHint' }, // T1.7
];

/** The settings volume sliders in order: the settings field, its string key and the volume used before one is saved. */
export const SETTING_SLIDERS = [
  { id: 'musicVolume', labelKey: 'ui.settings.musicVolume', fallback: 0.7 },
  { id: 'sfxVolume', labelKey: 'ui.settings.sfxVolume', fallback: 1 },
];

/**
 * A volume (0 to 1) as a whole percent for the slider and its label.
 * @param {unknown} v volume
 * @param {number} [d] fallback volume when it is not a number
 * @returns {number} 0 to 100
 */
export function volumePercent(v, d = 1) {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : d;
  return Math.round(Math.min(1, Math.max(0, n)) * 100);
}

/**
 * Stars as a whole number from 0 to 3.
 * @param {unknown} n any value
 * @returns {number} 0, 1, 2 or 3
 */
export function clampStars(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(3, v)) : 0;
}

/**
 * Which of the three stars are filled.
 * @param {unknown} stars how many stars were earned
 * @returns {boolean[]} three flags, filled stars first
 */
export function starStates(stars) {
  const n = clampStars(stars);
  return [0, 1, 2].map((i) => i < n);
}

/**
 * The corner points of a star polygon, as text for an SVG `points` attribute.
 * @param {number} cx middle x
 * @param {number} cy middle y
 * @param {number} outer radius of the tips
 * @param {number} inner radius of the dents
 * @param {number} [tips] number of tips (5 by default)
 * @returns {string} "x,y x,y ..." with one decimal
 */
export function starPoints(cx, cy, outer, inner, tips = 5) {
  const pts = [];
  for (let i = 0; i < tips * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / tips;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * The name to keep after the player typed something: cleaned up, or the default name when nothing usable was typed.
 * @param {unknown} raw what was typed
 * @param {string} fallback the default name (from the string table key name.default)
 * @returns {string} the name, at most NAME_MAX characters, plain text
 */
export function resolveName(raw, fallback) {
  return sanitizeName(raw) || sanitizeName(fallback);
}

/** The most characters a name may have (the same number save.js enforces). @returns {number} the limit */
export function nameLimit() {
  return NAME_MAX;
}

/**
 * The lines of the coin breakdown on the result screen. Pops and total always show; tip, combo and request only when
 * they paid something.
 * @param {{popCoins?: number, tip?: number, combo?: number, requestBonus?: number, total?: number}} payout from economy.js roundPayout
 * @returns {{id: string, key: string, amount: number}[]} rows in order, the last one is the total
 */
export function coinRows(payout) {
  const p = payout ?? {};
  // Turns a value into a whole number, or 0 when it is not a positive number.
  const num = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const pops = num(p.popCoins);
  const tip = num(p.tip);
  const combo = num(p.combo);
  const request = num(p.requestBonus);
  const total = Number.isFinite(p.total) ? num(p.total) : pops + tip + combo + request;
  const rows = [{ id: 'pops', key: 'ui.result.pops', amount: pops }];
  if (tip > 0) rows.push({ id: 'tip', key: 'ui.result.tip', amount: tip });
  if (combo > 0) rows.push({ id: 'combo', key: 'ui.result.combo', amount: combo });
  if (request > 0) rows.push({ id: 'request', key: 'ui.result.request', amount: request });
  rows.push({ id: 'total', key: 'ui.result.total', amount: total });
  return rows;
}

/**
 * The headline of the result screen.
 * @param {{stars?: number, failed?: boolean}} result the finished customer
 * @returns {string} string key
 */
export function resultTitleKey(result) {
  if (result?.failed) return 'ui.result.fail.title';
  return `ui.result.title.${clampStars(result?.stars)}`;
}

/**
 * The reputation line of the result screen: what the customer gave, or (after a fail) what "Next customer" would cost.
 * @param {{failed?: boolean, reputationChange?: number, skipPenalty?: number}} result the finished customer
 * @returns {{key: string, vars: {n: number}}|null} the line, or null when there is nothing to say
 */
export function reputationLine(result) {
  const r = result ?? {};
  if (r.failed) {
    const cost = Math.floor(Number(r.skipPenalty));
    return cost > 0 ? { key: 'ui.result.rep.cost', vars: { n: cost } } : null;
  }
  const gain = Math.floor(Number(r.reputationChange));
  return gain > 0 ? { key: 'ui.result.rep.gain', vars: { n: gain } } : null;
}

/**
 * The reputation tier now, its name key and how far the next one is.
 * @param {number} reputation reputation points
 * @returns {{tier: number, nameKey: string, next: {tier: number, nameKey: string, need: number, missing: number}|null}} tier info (next is null at the top)
 */
export function tierInfo(reputation) {
  const rep = Number.isFinite(reputation) && reputation > 0 ? Math.floor(reputation) : 0;
  const tier = tierFor(rep);
  const nextNeed = TIER_THRESHOLDS[tier]; // thresholds are indexed by tier - 1, so index `tier` is the next tier
  return {
    tier,
    nameKey: `ui.shop.tier.${tier}`,
    next: nextNeed === undefined ? null : { tier: tier + 1, nameKey: `ui.shop.tier.${tier + 1}`, need: nextNeed, missing: nextNeed - rep },
  };
}

/**
 * The text key and placeholders that say why an item cannot be bought (whyNot from economy.js).
 * @param {object} state the economy state
 * @param {string} itemId a shop item id
 * @param {string|null} why the answer of whyNot
 * @returns {{key: string, vars: object}|null} the line to show, or null when the item can be bought
 */
export function whyLine(state, itemId, why) {
  if (why === null) return null;
  const item = SHOP_ITEMS[itemId];
  if (why === 'tier' && item) return { key: 'ui.shop.why.tier', vars: { tier: item.tier } };
  if (why === 'money' && item) return { key: 'ui.shop.why.money', vars: { n: Math.max(1, item.price - (state?.money ?? 0)) } };
  if (why === 'story') return { key: 'ui.shop.why.story', vars: {} };
  if (why === 'owned') return { key: 'ui.shop.owned', vars: {} };
  return { key: 'ui.shop.why.unknown', vars: {} };
}

/**
 * The items of one shop tab, ready to draw.
 * @param {object} state the economy state (economy.js): money, reputation, items ...
 * @param {string} tabId 'tools', 'studio' or 'outfit'
 * @returns {{id: string, nameKey: string, descKey: string, price: number, owned: boolean, story: boolean, scrubWaiting: boolean,
 *   canBuy: boolean, why: {key: string, vars: object}|null}[]} entries in shop order (cheap to expensive within the shop table order)
 */
export function shopEntries(state, tabId) {
  const tab = SHOP_TABS.find((x) => x.id === tabId);
  if (!tab) return [];
  const items = state?.items ?? {};
  return SHOP_ITEM_IDS.filter((id) => SHOP_ITEMS[id].kind === tab.kind).map((id) => {
    const why = whyNot({ ...state, items }, id);
    const owned = Object.hasOwn(items, id);
    return {
      id,
      nameKey: `ui.item.${id}.name`,
      descKey: `ui.item.${id}.desc`,
      price: SHOP_ITEMS[id].price,
      owned,
      story: Boolean(SHOP_ITEMS[id].story),
      scrubWaiting: owned && Boolean(items[id].needsScrub),
      canBuy: why === null,
      why: owned ? null : whyLine(state, id, why),
    };
  });
}

/**
 * The comics list for the Comics screen: each strip with a flag for "seen".
 * @param {{id: string, titleKey: string, kind?: string}[]} strips every strip in display order (kind: 'chapter', 'milestone' or 'teaser')
 * @param {string[]} seen strip ids the player has seen (save.seenComics)
 * @returns {{id: string, titleKey: string, kind: string, seen: boolean}[]} entries
 */
export function comicEntries(strips, seen) {
  const seenSet = new Set(Array.isArray(seen) ? seen : []);
  return (Array.isArray(strips) ? strips : []).map((s) => ({
    id: s.id, titleKey: s.titleKey, kind: ['chapter', 'milestone', 'teaser'].includes(s.kind) ? s.kind : 'chapter', seen: seenSet.has(s.id),
  }));
}

/**
 * The notice text key for the answer of saveStore.importText (core/save.js), for the router to hand to the settings screen.
 * @param {{ok: boolean, error?: string}} result what importText answered
 * @returns {string} string key
 */
export function importNoticeKey(result) {
  if (result?.ok) return 'ui.settings.imported';
  return result?.error === 'tooNew' ? 'ui.settings.importTooNew' : 'ui.settings.importFailed';
}

/** Share of the patch (0..1) that must be clean before a scrub job counts as done (placeholder scrub, T3.1c). */
export const SCRUB_DONE = 0.9;
/** Share of the patch one Space press scrubs (the keyboard way to do the scrub job). */
export const SCRUB_KEY_STEP = 0.1;

/**
 * A fresh, all-dirty scrub patch split into cells.
 * @param {number} [cols] cells across
 * @param {number} [rows] cells down
 * @returns {{cols: number, rows: number, cells: boolean[]}} the grid (true = clean)
 */
export function scrubGrid(cols = 12, rows = 8) {
  return { cols, rows, cells: Array.from({ length: cols * rows }, () => false) };
}

/**
 * Rub at a point: every cell whose middle is under the brush becomes clean. All sizes are shares of the patch (0..1).
 * @param {{cols: number, rows: number, cells: boolean[]}} grid the patch
 * @param {number} x brush middle, share of the width
 * @param {number} y brush middle, share of the height
 * @param {number} rx brush radius, share of the width
 * @param {number} ry brush radius, share of the height
 * @returns {{cols: number, rows: number, cells: boolean[]}} a new grid
 */
export function wipeCells(grid, x, y, rx, ry) {
  const cells = grid.cells.map((clean, i) => {
    if (clean) return true;
    const dx = ((i % grid.cols) + 0.5) / grid.cols - x;
    const dy = (Math.floor(i / grid.cols) + 0.5) / grid.rows - y;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  });
  return { ...grid, cells };
}

/**
 * How much of the patch is clean.
 * @param {{cells: boolean[]}} grid the patch
 * @returns {number} 0..1
 */
export function scrubShare(grid) {
  return grid.cells.length ? grid.cells.filter(Boolean).length / grid.cells.length : 1;
}
