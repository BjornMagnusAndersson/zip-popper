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
    // Daily challenge (T8.5, game/daily-logic.js; old saves load these): streak = days in a row with the goal reached,
    // lastDone = the last rewarded day and lastPlayed = the last day tried ('YYYY-MM-DD' or ''), best = the longest
    // streak, attempts = tries in all (finished or skipped daily customers).
    dailyStreak: 0, dailyLastDone: '', dailyLastPlayed: '', dailyBest: 0, dailyAttempts: 0,
    seenKinds: [], // Field guide (T6.5): the bump kinds, dotty nose and decoys she has met in a pop scene (old saves load [])
    albumFaces: [], // Face album (T8.2): small recipes of the faces she has cleared, no pictures (old saves load [])
    seenTwists: [], // Field guide (T8.3): the customer twists she has met (fidgety, ticklish, sensitive, hurry; old saves load [])
    seenBosses: [], // Field guide (T8.4): the boss and event customers she has met (hairday, nosestrip, golden, horn; old saves load [])
    // Line memory (R6-lines, game/customer-lines.js): per regular id or walk-in name key, the visits and the line keys
    // said last time {visits, intro?, second?, result?}, so a return visit says other lines (old saves load {})
    customerLines: {},
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

/** A date written as 'YYYY-MM-DD' (the daily challenge, T8.5), or ''. @param {unknown} v value @returns {string} */
function dateText(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
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
    dailyStreak: count(s.dailyStreak, d.dailyStreak),
    dailyLastDone: dateText(s.dailyLastDone),
    dailyLastPlayed: dateText(s.dailyLastPlayed),
    dailyBest: count(s.dailyBest, d.dailyBest),
    dailyAttempts: count(s.dailyAttempts, d.dailyAttempts),
    seenKinds: words(s.seenKinds, d.seenKinds),
    albumFaces: albumList(s.albumFaces),
    seenTwists: words(s.seenTwists, d.seenTwists),
    seenBosses: words(s.seenBosses, d.seenBosses),
    customerLines: lineMemo(s.customerLines),
  };
}

/**
 * The line memory (R6-lines), cleaned: at most 60 customers (ids of up to 60 characters), each with a visit count and
 * the short line keys said last time; anything else is dropped.
 * @param {unknown} v the stored table
 * @returns {Object<string, {visits: number, intro?: string, second?: string, result?: string}>} the memory
 */
function lineMemo(v) {
  const out = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [id, e] of Object.entries(v).slice(-60)) {
    if (id.length > 60 || id === '__proto__' || !e || typeof e !== 'object') continue;
    const entry = { visits: count(e.visits, 0) };
    for (const k of ['intro', 'second', 'result']) if (shortText(e[k], 60)) entry[k] = e[k];
    out[id] = entry;
  }
  return out;
}

/** A short text, or undefined. @param {unknown} v value @param {number} max longest length @returns {string|undefined} */
function shortText(v, max) {
  return typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined;
}

/**
 * The Face album list (T8.2, screens/album-logic.js), cleaned: entries without an id or a seed are dropped, every
 * other field gets a safe value, and at most 100 entries are read (the album itself keeps 60). A face spec keeps only
 * short text and number parts and its accessories list.
 * @param {unknown} v the stored list
 * @returns {object[]} the album
 */
function albumList(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const e of v.slice(0, 100)) {
    if (!e || typeof e !== 'object' || !shortText(e.id, 30) || !Number.isFinite(e.seed) || e.seed < 1) continue;
    const entry = {
      id: e.id, seed: Math.floor(e.seed), count: Math.min(12, Math.max(1, count(e.count, 6))), kinds: words(e.kinds, ['whitehead']).slice(0, 12),
      strip: flag(e.strip, false), decoys: flag(e.decoys, true), w: count(e.w, 390), h: count(e.h, 560),
      stars: Math.min(3, count(e.stars, 0)), times: Math.max(1, count(e.times, 1)), lastSeen: count(e.lastSeen, 0),
    };
    if (e.face && typeof e.face === 'object' && !Array.isArray(e.face)) {
      const face = {};
      for (const [k, x] of Object.entries(e.face).slice(0, 20)) {
        if (k === '__proto__' || k.length > 20) continue;
        if (k === 'accessories') face.accessories = words(x, []).slice(0, 6);
        else if (shortText(x, 30) || Number.isFinite(x)) face[k] = x;
      }
      entry.face = face;
    }
    if (shortText(e.nameKey, 60)) entry.nameKey = e.nameKey;
    if (shortText(e.stamp, 30)) entry.stamp = e.stamp; // a boss or event stamp (T8.4): the event id
    if (e.mix && typeof e.mix === 'object' && !Array.isArray(e.mix)) { // a boss face's bump mix (T8.4)
      const mix = countTable(e.mix);
      if (Object.keys(mix).length) entry.mix = mix;
    }
    if (Number.isFinite(e.grown) && e.grown > 0 && e.grown <= 3) entry.grown = e.grown; // a boss face's grown horns (T8.4)
    out.push(entry);
  }
  return out;
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
