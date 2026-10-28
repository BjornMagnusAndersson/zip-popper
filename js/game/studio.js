// The studio's layers (T5.1a, SPEC section 4 "Studio", D10 and D11). Pure logic, no DOM, so it can be tested in Node.
// The studio is one room drawing (pop/backdrop.js) with a look per tier (0 dingy and dank, 1 a bit better, 2 clean,
// sparkly and spa-like) and, on top, one object per studio upgrade the player has bought AND scrubbed clean
// (save.studioLayers): lamp (a ring light on a stand), plant (a hanging plant), chair (a padded wingback chair behind
// the customer), wallPaint (fresh wall colour), sign (a shiny new sign) and leakFix (a new pipe joint: no more drip
// and no bucket, owner 2026-10-28).
// The same drawing is the backdrop of the pop scene and the full-size studio view (T5.1c, screens/studio.js), whose
// captions and her outfit (outfit tiers, T5.2) come from the helpers at the end of this file.

/**
 * Every studio layer, in the order they are drawn (back to front): the ceiling pipe and the wall first, the chair before
 * the side things.
 */
export const STUDIO_LAYERS = ['leakFix', 'wallPaint', 'sign', 'chair', 'plant', 'lamp'];

/**
 * Which studio layers show, in draw order (back to front). Unknown ids, doubles and non-studio items are left out.
 * @param {unknown} layers the owned layer ids (save.studioLayers), any order
 * @returns {string[]} the layers to draw, in STUDIO_LAYERS order
 */
export function studioLayersShown(layers) {
  if (!Array.isArray(layers)) return [];
  return STUDIO_LAYERS.filter((id) => layers.includes(id));
}

/**
 * The studio tier for a set of owned layers (SPEC D11: the room follows the upgrades): 0 or 1 layer = 0 (dingy and
 * dank), 2 or 3 = 1 (a bit better), 4 or more = 2 (clean, sparkly spa).
 * @param {unknown} layers the owned layer ids (save.studioLayers)
 * @returns {number} 0, 1 or 2
 */
export function studioTier(layers) {
  const n = studioLayersShown(layers).length;
  return n >= 4 ? 2 : n >= 2 ? 1 : 0;
}

/**
 * A short text that names a tier and its layers (the same room always gives the same key), used to cache the painted
 * room so it is only painted again when something changed.
 * @param {number|string} tier the backdrop kind (0, 1, 2 or 'home')
 * @param {unknown} layers the owned layer ids
 * @returns {string} for example "1:sign,plant"
 */
export function studioKey(tier, layers) {
  return `${tier}:${studioLayersShown(layers).join(',')}`;
}

// ---- The studio view screen (T5.1c, screens/studio.js) ----

// ---- Her outfit tiers (T5.2, SPEC section 4 "Studio", D6) ----
// The ONE place that says what she wears: tier 1 everyday clothes, tier 2 the apron (shop item 'apron'), tier 3 the
// scrubs (shop item 'scrubs'). The bought items (save.items) are the source of truth: the best one she owns wins, so
// scrubs bought before the apron still give tier 3. save.outfitTier is only a copy for the save shape in SPEC 8: it is
// written from the items every time the economy is saved (economy.js economyToSave) and never read to draw her, so old
// saves (outfitTier 1, maybe an apron already bought) still show the right outfit.

/** The outfit for each tier (index = tier - 1). The names are comic-art.js OUTFITS. */
export const OUTFIT_TIERS = ['everyday', 'apron', 'scrubs'];

/** The shop item that gives each outfit tier above 1, best first. */
export const OUTFIT_ITEMS = [['scrubs', 3], ['apron', 2]];

/**
 * Her outfit tier: 3 with the scrubs, else 2 with the apron, else 1 (everyday clothes).
 * @param {unknown} saveOrItems a save (its items are used) or a bought-items table (id -> {needsScrub})
 * @returns {number} 1, 2 or 3
 */
export function outfitTier(saveOrItems) {
  const x = saveOrItems && typeof saveOrItems === 'object' ? saveOrItems : {};
  const items = x.items && typeof x.items === 'object' ? x.items : x;
  return OUTFIT_ITEMS.find(([id]) => Object.hasOwn(items, id))?.[1] ?? 1;
}

/**
 * The outfit she wears (studio view, and the comic strips set after she owns it): the outfit of her outfit tier.
 * @param {unknown} saveOrItems a save or a bought-items table
 * @returns {'everyday'|'apron'|'scrubs'} an outfit name of comic-art.js OUTFITS
 */
export function heroOutfit(saveOrItems) {
  return OUTFIT_TIERS[outfitTier(saveOrItems) - 1];
}

/**
 * The string keys for the studio view's captions: one short line about the tier, and one per layer she has (in draw
 * order), or a hint line when she has none yet.
 * @param {number} tier the studio tier 0..2 (studioTier)
 * @param {unknown} layers the owned layer ids (save.studioLayers)
 * @returns {{tierKey: string, layerKeys: string[], emptyKey: string|null}} string keys (strings/en.json)
 */
export function studioCaptions(tier, layers) {
  const shown = studioLayersShown(layers);
  const tierKey = `ui.studio.tier.${[0, 1, 2].includes(tier) ? tier : 0}`;
  return {
    tierKey,
    layerKeys: shown.map((id) => `ui.studio.layer.${id}`),
    emptyKey: shown.length ? null : 'ui.studio.empty',
  };
}

/** How long her cap takes to float between her head and the chair in the studio view (T5.2b), in ms. */
export const CAP_FLIGHT_MS = 750;

/**
 * Her cap's place part way through its little flight in the studio view (T5.2b, screens/studio.js): it pops up off
 * her head, drifts over in a soft arc with a little wobble and settles on the chair seat (or the other way round).
 * She does a small hop at the start. Positions are in the picture's pixels.
 * @param {number} k progress 0..1 (clamped)
 * @param {{x: number, y: number, scale: number, rot: number}} from where the cap starts
 * @param {{x: number, y: number, scale: number, rot: number}} to where the cap lands
 * @param {number} lift how high the arc goes above the higher end, in pixels
 * @returns {{x: number, y: number, scale: number, rot: number, hop: number}} the cap's place, and her hop 0..1 (1 = top)
 */
export function capFlight(k, from, to, lift) {
  const t = Math.min(1, Math.max(0, Number(k) || 0));
  const ease = t * t * (3 - 2 * t); // smooth start and end
  /** Part way from a to b, eased. @param {number} a @param {number} b @returns {number} */
  const lerp = (a, b) => a + (b - a) * ease;
  const arc = Math.sin(Math.PI * t) * lift;
  const wobble = Math.sin(t * Math.PI * 3) * 14 * (1 - t);
  const hopK = Math.min(1, t / 0.4);
  return {
    x: lerp(from.x, to.x),
    y: lerp(from.y, to.y) - arc,
    scale: lerp(from.scale, to.scale),
    rot: lerp(from.rot, to.rot) + wobble,
    hop: t < 0.4 ? Math.sin(Math.PI * hopK) : 0,
  };
}

/**
 * Whether the studio view lets her take her cap off, and how it starts (T5.2b): only the scrubs have a cap; it starts on.
 * @param {string} outfit what she wears (comic-art.js OUTFITS name)
 * @param {Record<string, object>} outfits the OUTFITS table
 * @returns {{toggle: boolean, capOn: boolean}} toggle = tapping her takes the cap off and on
 */
export function studioCapStart(outfit, outfits) {
  const toggle = !!outfits?.[outfit]?.cap;
  return { toggle, capOn: toggle };
}
