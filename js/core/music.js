// The background music player (T6.1a, SPEC D18). Two moods: 'calm' (menus, comics, shop, normal customers) and
// 'hectic' (hurry and combo requests, later competitions and timed events), or 'off'.
// The tunes are data (data/music-data.js), the timing is pure logic (music-logic.js), the instruments are
// music-voices.js. It plays through the sound player's AudioContext (sound.js), so there is only one, and it starts
// only after sound.unlock() ran inside a tap. The music switch (sound.isMusicOn) always wins: off = silence and no
// timer running. Notes are planned a little ahead (every 100 ms, 0.3 s ahead on the audio clock) so the timing stays
// steady even when the page is busy. The music pauses by itself while the page is hidden.

import { TRACKS, MUSIC_TABLE } from '../data/music-data.js';
import { buildPass, loopSeconds, barSeconds, collectDue, nextBarTime, fadePoints, positionAt } from './music-logic.js';
import { createMusicChain, playEvent } from './music-voices.js';

/** How often the planner runs (ms). */
export const TICK_MS = 100;
/** How far ahead notes are planned (seconds). */
export const LOOKAHEAD = 0.3;
/** Length of a mood change crossfade (seconds). */
export const CROSSFADE = 1.5;
/** Fade when the music is switched off, paused or the page is hidden (seconds). */
export const STOP_FADE = 0.6;
/** Overall music level at volume 1 (set so the music sits clearly under the sound effects). */
export const MUSIC_GAIN = 0.3; // 0.4 before R7: the owner found the music a bit loud
/** Volume the music starts at (0 to 1). */
export const DEFAULT_VOLUME = 0.7;

/**
 * Create the music player.
 * @param {{sound: object, tracks?: object, table?: object, volume?: number, doc?: Document|null}} opts sound = the
 *   sound player (sound.js; its context, unlock and music switch are used); tracks and table for tests; volume 0 to 1;
 *   doc = the page (to pause while it is hidden)
 * @returns {{setMood: (mood: string) => void, mood: () => string, sync: () => void, setVolume: (v: number) => void,
 *   volume: () => number, pause: () => void, resume: () => void, isPlaying: () => boolean,
 *   position: () => ({mood: string, bar: number, bars: number, section: string, pass: number}|null), dispose: () => void}}
 *   the player
 */
export function createMusic({ sound, tracks = TRACKS, table = MUSIC_TABLE, volume = DEFAULT_VOLUME, doc = globalThis.document ?? null } = {}) {
  let ctx = null;
  let chain = null;
  let wanted = 'off'; // the mood the game asked for
  let vol = clampVolume(volume);
  let userPaused = false;
  let hidden = Boolean(doc?.hidden);
  let players = []; // tunes playing or fading out: {id, track, bus, origin, stopAt, endAt, cursor}
  let timer = 0;
  let disposed = false;
  const nextPass = {}; // per tune: the pass to start from next time (so a tune that comes back is a bit different)

  /** Keep a volume between 0 and 1. @param {number} v volume @returns {number} clamped volume */
  function clampVolume(v) { return Math.min(1, Math.max(0, Number.isFinite(v) ? v : DEFAULT_VOLUME)); }

  /** Take the sound player's context once it exists and build the music chain on it. @returns {boolean} true when ready */
  function attach() {
    const c = sound?.context?.() ?? null;
    if (!c || c.state === 'closed') return false;
    if (c !== ctx) {
      ctx = c;
      chain = createMusicChain(ctx);
      chain.volume.gain.value = vol * MUSIC_GAIN;
      players = [];
    }
    return true;
  }

  /** The mood that should sound now: off while the switch is off, paused, hidden or disposed. @returns {string} mood */
  function effective() {
    if (disposed || userPaused || hidden || !sound?.isMusicOn?.()) return 'off';
    return Object.hasOwn(table, wanted) ? wanted : 'off';
  }

  /** The tune that is playing and not fading out, or null. @returns {object|null} player */
  function live() {
    return players.find((p) => p.stopAt === null) ?? null;
  }

  /**
   * Fade a gain smoothly to a level from a time (equal-power shape, no clicks). Anything planned on it is replaced.
   * @param {AudioParam} param the gain
   * @param {number} to the level at the end
   * @param {number} at when the fade starts
   * @param {number} dur seconds
   * @param {number} [from] the level now (read from the gain when not given)
   * @returns {void}
   */
  function fade(param, to, at, dur, from = param.value) {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(from, now);
    if (at > now) param.setValueAtTime(from, at);
    for (const p of fadePoints(from, to, Math.max(at, now), dur)) param.linearRampToValueAtTime(p.v, p.t);
  }

  /**
   * The track data behind a tune name (a 'file' entry plays its generated fallback until file playback exists).
   * @param {string} id tune name (calm or hectic)
   * @returns {object|null} the track
   */
  function trackFor(id) {
    const entry = table[id];
    if (!entry) return null;
    const name = entry.type === 'synth' ? entry.track : entry.fallback;
    return tracks[name] ?? null;
  }

  /**
   * Start a tune at a time, fading in.
   * @param {string} id tune name
   * @param {number} at start time on the audio clock
   * @param {number} dur fade-in seconds
   * @returns {void}
   */
  function start(id, at, dur) {
    const track = trackFor(id);
    if (!track) return;
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(chain.input);
    fade(bus.gain, 1, at, dur, 0);
    const pass = nextPass[id] ?? 0;
    players.push({
      id, track, bus, origin: at, stopAt: null, endAt: null,
      cursor: { passStart: at, pass, index: 0, events: buildPass(track, pass), loopSeconds: loopSeconds(track) },
    });
  }

  /**
   * Fade a tune out from a time; it is removed once silent.
   * @param {object} p the player
   * @param {number} at when the fade starts
   * @param {number} dur seconds
   * @returns {void}
   */
  function stop(p, at, dur) {
    p.stopAt = at;
    p.endAt = at + dur;
    nextPass[p.id] = p.cursor.pass + 1;
    fade(p.bus.gain, 0, at, dur);
  }

  /** Plan the notes that are due in the next LOOKAHEAD seconds; drop tunes that have faded out. @returns {void} */
  function tick() {
    if (!ctx || ctx.state === 'closed') { halt(); return; }
    const now = ctx.currentTime;
    const horizon = now + LOOKAHEAD;
    for (const p of players) {
      const until = p.endAt === null ? horizon : Math.min(horizon, p.endAt);
      for (const { at, ev } of collectDue(p.cursor, until, (n) => buildPass(p.track, n))) {
        if (at < now - 0.02 || at < p.origin) continue; // late (the page was busy): skip rather than bunch up
        try { playEvent(ctx, p.bus, ev, at); } catch { /* one bad note must not stop the music */ }
      }
    }
    const gone = players.filter((p) => p.endAt !== null && now > p.endAt + 2); // +2 s lets the last notes ring out
    for (const p of gone) { try { p.bus.disconnect(); } catch { /* already */ } }
    players = players.filter((p) => !gone.includes(p));
    if (!players.length) halt();
  }

  /** Stop the planner timer. @returns {void} */
  function halt() {
    if (timer) clearInterval(timer);
    timer = 0;
  }

  /** Make sure the planner timer runs (and plan once right away). @returns {void} */
  function run() {
    if (!timer) timer = setInterval(tick, TICK_MS);
    tick();
  }

  /**
   * Bring the sound in line with the wanted mood, the switch, pause and page visibility.
   * @param {boolean} [moodChange] true when the game changed the mood (then a hectic tune finishes its bar first and
   *   the change is a full crossfade); false for the switch, pause and hidden page (a quicker fade)
   * @returns {void}
   */
  function sync(moodChange = false) {
    if (!attach()) return; // before the first tap: wait (onUnlock calls sync again)
    if (ctx.state === 'suspended') ctx.resume?.().catch?.(() => {});
    const mood = effective();
    const cur = live();
    if (cur?.id === mood) return;
    const now = ctx.currentTime;
    const dur = moodChange ? CROSSFADE : STOP_FADE;
    let at = now + 0.05;
    if (cur && moodChange && cur.track.finishBarOnLeave) at = nextBarTime(cur.origin, at, barSeconds(cur.track));
    if (cur) stop(cur, at, dur);
    if (mood !== 'off') start(mood, at, dur);
    if (players.length) run();
  }

  const offUnlock = sound?.onUnlock?.(() => sync()) ?? (() => {});
  /** The page was hidden or shown: pause while hidden. @returns {void} */
  const onVisibility = () => { hidden = Boolean(doc?.hidden); sync(); };
  doc?.addEventListener?.('visibilitychange', onVisibility);

  return {
    /**
     * Ask for a mood: 'calm', 'hectic' or 'off'. Changes crossfade over 1.5 s; from hectic the bar is finished first.
     * Before the first tap the wish is kept and starts at the tap.
     * @param {string} mood the mood
     * @returns {void}
     */
    setMood(mood) {
      wanted = Object.hasOwn(table, mood) ? mood : 'off';
      sync(true);
    },
    /** The mood the game asked for. @returns {string} mood */
    mood: () => wanted,
    /** Check the music switch again (call after it changed). @returns {void} */
    sync: () => sync(),
    /** Set the music volume. @param {number} v 0 to 1 @returns {void} */
    setVolume(v) {
      vol = clampVolume(v);
      if (ctx && chain) chain.volume.gain.setTargetAtTime(vol * MUSIC_GAIN, ctx.currentTime, 0.05);
    },
    /** The music volume. @returns {number} 0 to 1 */
    volume: () => vol,
    /** Pause (fade out); the mood is kept. @returns {void} */
    pause() { userPaused = true; sync(); },
    /** Go on after pause(). @returns {void} */
    resume() { userPaused = false; sync(); },
    /** Whether a tune is playing now (not counting one that is fading out). @returns {boolean} playing */
    isPlaying: () => Boolean(live()) && Boolean(timer),
    /**
     * Where the playing tune is (for the music test page).
     * @returns {{mood: string, bar: number, bars: number, section: string, pass: number}|null} position or null
     */
    position() {
      const p = live();
      if (!p || !ctx || ctx.currentTime < p.origin) return null;
      return { mood: p.id, ...positionAt(p.track, p.origin, ctx.currentTime), pass: p.cursor.pass };
    },
    /** Stop everything and let go of the page events. @returns {void} */
    dispose() {
      disposed = true;
      offUnlock();
      doc?.removeEventListener?.('visibilitychange', onVisibility);
      halt();
      for (const p of players) { try { p.bus.disconnect(); } catch { /* already */ } }
      players = [];
      chain?.disconnect();
      chain = null;
      ctx = null;
    },
  };
}
