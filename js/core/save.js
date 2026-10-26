// The save store: one versioned save object kept behind load / save / export / import, so the place it is kept
// (phone storage now, a cloud database later) can change without touching the game. Nothing here throws:
// blocked storage, damaged text and saves from a newer game version all end in a safe answer.
// No DOM here, so it can be tested in Node.

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'popper.save';
const BACKUP_KEY = 'popper.save.backup'; // a save that could not be read is kept here instead of being overwritten
export const NAME_MAX = 20;
/** The music volume a new player starts with (the same as DEFAULT_VOLUME in music.js) and the sound effects volume (full, as before). */
export const DEFAULT_MUSIC_VOLUME = 0.7;
export const DEFAULT_SFX_VOLUME = 1;

/**
 * A fresh save for a new player.
 * @param {number} [now] time in ms (a parameter so tests are repeatable)
 * @returns {object} the default save
 */
export function defaultSave(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    playerName: '',
    money: 0,
    chapter: 0,
    customersDone: 0,
    unlockedTools: ['fingers'],
    toolLevels: {},
    studioLayers: [],
    outfitTier: 1,
    stats: { pops: 0, stars: 0, bestCombo: 0 },
    // squeeze (T1.7): two fingers round a bump squeeze it (off by default; old saves load with it off)
    settings: { sound: true, music: true, vibration: true, reducedMotion: false, squeeze: false, lang: 'en', musicVolume: DEFAULT_MUSIC_VOLUME, sfxVolume: DEFAULT_SFX_VOLUME },
    seenComics: [],
    squeezeHintSeen: false, // the one-time "squeeze between two fingers" hint was shown (T1.7)
    // Economy fields (T3.2, docs/ECONOMY.md section 8). Added without a version bump: older saves simply get these defaults.
    reputation: 0,
    skipStreak: 0, // "Next customer" after a fail, in a row; a finished customer resets it
    mastery: {}, // clean pops per bump type
    items: {}, // bought shop items: id -> { needsScrub } (a studio upgrade shows only after its scrub job)
    threeStarDone: false, // a 3-star customer has happened (for the `mstar` strip)
    requestsDone: 0,
    pendingStrips: [], // milestone strips earned by the last customer, not yet played (B4: they survive closing the app on the result screen)
    endingSeen: false, // the "To be continued" ending was reached: the menu shows Keep working (T5.4, SPEC D23)
    keepWorkingDone: 0, // Keep working customers finished or skipped (its own count; story progress never moves in it)
    seenKinds: [], // Field guide (T6.5): the bump kinds, dotty nose and decoys she has met in a pop scene (old saves load [])
  };
}

/**
 * Clean up a name typed by the player: control characters removed, spaces tidied, at most NAME_MAX characters.
 * The result is only ever shown as plain text, never put into the page as HTML.
 * @param {unknown} raw what was typed
 * @returns {string} the clean name (empty when nothing usable was typed)
 */
export function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  const clean = raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  return [...clean].slice(0, NAME_MAX).join('').trim();
}

/** A whole number of at least 0, or the fallback. @param {unknown} v value @param {number} d fallback @returns {number} */
function count(v, d) {
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : d;
}

/** A list of short strings, or the fallback. @param {unknown} v value @param {string[]} d fallback @returns {string[]} */
function words(v, d) {
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 200) : d;
}

/** A true/false value, or the fallback. @param {unknown} v value @param {boolean} d fallback @returns {boolean} */
function flag(v, d) {
  return typeof v === 'boolean' ? v : d;
}

/**
 * A volume between 0 and 1 (rounded to two decimals), or the fallback when it is not a number.
 * @param {unknown} v value
 * @param {number} d fallback
 * @returns {number} volume
 */
export function clampVolume(v, d = DEFAULT_SFX_VOLUME) {
  return typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(1, Math.max(0, v)) * 100) / 100 : d;
}

/** A table of short names to whole numbers, or an empty one. @param {unknown} v value @returns {Object<string, number>} */
function countTable(v) {
  const out = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, n] of Object.entries(v).slice(0, 100)) if (k.length <= 30 && k !== '__proto__' && Number.isFinite(n) && n >= 0) out[k] = Math.floor(n);
  }
  return out;
}

/** The bought-items table (id -> { needsScrub }), or an empty one. @param {unknown} v value @returns {Object<string, {needsScrub: boolean}>} */
function itemTable(v) {
  const out = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, e] of Object.entries(v).slice(0, 100)) if (k.length <= 30 && k !== '__proto__') out[k] = { needsScrub: flag(e?.needsScrub, false) };
  }
  return out;
}

/**
 * Bring a save from an older version up to the current one, one step per version. Version 1 is the first, so there
 * is nothing to do yet; add a step here whenever SAVE_VERSION goes up. (The economy fields added in T3.2 did not need
 * a version: normalizeSave gives a save without them the defaults.)
 * @param {object} data a save with a version number
 * @returns {object} the save in the current shape
 */
export function migrate(data) {
  return data;
}

/**
 * Make any object into a valid save: missing or wrongly typed fields get their defaults, so old, hand-edited or
 * half-written saves never crash the game.
 * @param {unknown} raw the parsed save
 * @param {number} [now] time in ms for a missing createdAt
 * @returns {object} a complete, valid save
 */
export function normalizeSave(raw, now = Date.now()) {
  const d = defaultSave(now);
  const s = raw && typeof raw === 'object' ? raw : {};
  const st = s.stats && typeof s.stats === 'object' ? s.stats : {};
  const se = s.settings && typeof s.settings === 'object' ? s.settings : {};
  const levels = {};
  if (s.toolLevels && typeof s.toolLevels === 'object') {
    for (const [k, v] of Object.entries(s.toolLevels)) if (Number.isFinite(v) && v >= 0) levels[k] = Math.floor(v);
  }
  return {
    version: SAVE_VERSION,
    createdAt: count(s.createdAt, d.createdAt),
    playerName: sanitizeName(s.playerName),
    money: count(s.money, d.money),
    chapter: count(s.chapter, d.chapter),
    customersDone: count(s.customersDone, d.customersDone),
    unlockedTools: words(s.unlockedTools, d.unlockedTools),
    toolLevels: levels,
    studioLayers: words(s.studioLayers, d.studioLayers),
    outfitTier: Math.max(1, count(s.outfitTier, d.outfitTier)),
    stats: { pops: count(st.pops, 0), stars: count(st.stars, 0), bestCombo: count(st.bestCombo, 0) },
    settings: {
      sound: flag(se.sound, d.settings.sound),
      music: flag(se.music, d.settings.music),
      vibration: flag(se.vibration, d.settings.vibration),
      reducedMotion: flag(se.reducedMotion, d.settings.reducedMotion),
      squeeze: flag(se.squeeze, d.settings.squeeze),
      lang: typeof se.lang === 'string' && se.lang.length <= 8 ? se.lang : d.settings.lang,
      musicVolume: clampVolume(se.musicVolume, d.settings.musicVolume),
      sfxVolume: clampVolume(se.sfxVolume, d.settings.sfxVolume),
    },
    seenComics: words(s.seenComics, d.seenComics),
    squeezeHintSeen: flag(s.squeezeHintSeen, d.squeezeHintSeen),
    reputation: count(s.reputation, d.reputation),
    skipStreak: count(s.skipStreak, d.skipStreak),
    mastery: countTable(s.mastery),
    items: itemTable(s.items),
    threeStarDone: flag(s.threeStarDone, d.threeStarDone),
    requestsDone: count(s.requestsDone, d.requestsDone),
    pendingStrips: words(s.pendingStrips, d.pendingStrips),
    endingSeen: flag(s.endingSeen, d.endingSeen),
    keepWorkingDone: count(s.keepWorkingDone, d.keepWorkingDone),
    seenKinds: words(s.seenKinds, d.seenKinds),
  };
}

/**
 * Create the save store on top of a storage (e.g. localStorage). Also works with no storage at all (then the game
 * simply forgets everything when closed).
 * @param {Storage|undefined} storage e.g. localStorage
 * @returns {{load: () => object, save: (data: object) => boolean, reset: () => object, exportText: (data: object) => string,
 *   importText: (text: string) => {ok: boolean, save?: object, error?: string}, hasSave: () => boolean}} the store
 */
export function createSaveStore(storage) {
  /** Keep unreadable text aside so it is not lost. @param {string} text what was stored @returns {void} */
  const keepBackup = (text) => {
    try { storage?.setItem(BACKUP_KEY, text); } catch { /* blocked or full storage: nothing more to do */ }
  };

  return {
    /** Whether a save exists in storage. @returns {boolean} true if one is stored */
    hasSave() {
      try { return !!storage?.getItem(SAVE_KEY); } catch { return false; }
    },

    /** Read the save; a fresh one when nothing usable is stored. @returns {object} a valid save */
    load() {
      let text = null;
      try { text = storage?.getItem(SAVE_KEY) ?? null; } catch { return defaultSave(); }
      if (!text) return defaultSave();
      try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || !Number.isFinite(parsed.version)) throw new Error('no version');
        if (parsed.version > SAVE_VERSION) { keepBackup(text); return defaultSave(); } // from a newer game: do not mangle it
        return normalizeSave(migrate(parsed));
      } catch {
        keepBackup(text);
        return defaultSave();
      }
    },

    /** Write the save. @param {object} data the save @returns {boolean} true if it was written */
    save(data) {
      try { storage?.setItem(SAVE_KEY, JSON.stringify(normalizeSave(data))); return !!storage; } catch { return false; }
    },

    /** Start over with a fresh save (the old one is not kept). @returns {object} the fresh save */
    reset() {
      const fresh = defaultSave();
      try { storage?.setItem(SAVE_KEY, JSON.stringify(fresh)); } catch { /* blocked storage */ }
      return fresh;
    },

    /** The save as text for a backup file. @param {object} data the save @returns {string} json text */
    exportText(data) {
      return JSON.stringify(normalizeSave(data), null, 2);
    },

    /** Read a backup file's text; on success it also becomes the stored save.
     * @param {string} text the file contents @returns {{ok: boolean, save?: object, error?: string}} result */
    importText(text) {
      let parsed;
      try { parsed = JSON.parse(text); } catch { return { ok: false, error: 'notJson' }; }
      if (!parsed || typeof parsed !== 'object' || !Number.isFinite(parsed.version)) return { ok: false, error: 'notSave' };
      if (parsed.version > SAVE_VERSION) return { ok: false, error: 'tooNew' };
      const next = normalizeSave(migrate(parsed));
      this.save(next);
      return { ok: true, save: next };
    },
  };
}
