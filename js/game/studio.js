// The studio's layers (T5.1a, SPEC section 4 "Studio", D10 and D11). Pure logic, no DOM, so it can be tested in Node.
// The studio is one room drawing (pop/backdrop.js) with a look per tier (0 dingy and dank, 1 a bit better, 2 clean,
// sparkly and spa-like) and, on top, one object per studio upgrade the player has bought AND scrubbed clean
// (save.studioLayers): lamp (a ring light on a stand), plant (a hanging plant), chair (a padded wingback chair behind
// the customer), wallPaint (fresh wall colour) and sign (a shiny new sign).
// The same drawing is the backdrop of the pop scene and the full-size studio view (T5.1c, screens/studio.js), whose
// captions and her outfit (outfit tiers, T5.2) come from the helpers at the end of this file.

/** Every studio layer, in the order they are drawn (back to front): the wall first, the chair before the side things. */
export const STUDIO_LAYERS = ['wallPaint', 'sign', 'chair', 'plant', 'lamp'];

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
