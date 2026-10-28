// The app router (T3.1c, with T3.3 save wiring and T3.4 free play): wires every screen, the story chapters, the
// economy, the comics and the pop rounds into one game. index.html calls startApp().
// Flow: first start = name screen, then the menu; later starts = title, then the menu. Continue plays the next story
// step (chapter-logic.js): a chapter strip, a special mode (torchlight, T4.5; phone scroll, T4.6), a customer (intro, pop
// round, result), the hygiene scare strip (gloves), the teaser strip and the "To be continued" screen. Free play,
// Comics, the Field guide (T6.5; also over the pop scene from its "?" button), Shop (with the wipe-and-scrub job for
// studio upgrades, T5.1b), Settings and About hang off the menu; after the ending also Keep working (T5.4: random
// customers at lower pay through the same customer flow, no story). From the career chapter on, every finished
// customer's result screen opens with a before and after reveal, and the face goes into the Face album (T8.2, menu).
// The save is written after every customer, purchase, scrub job, comic seen and setting change, so a reload goes on
// exactly where the player was. All the rules are pure helpers in app-logic.js (tested in Node); this file only shows
// screens and passes what happened back to those helpers. All text comes from the string table (t).
// Testing flags (page address): ?test (a throwaway in-memory save; nothing is written to the phone), with ?test also
// ?chapter=N&customer=M (jump: customer M is next), ?money=500, ?rep=40, ?name=Maja, ?layers=lamp,plant or
// ?layers=all (studio upgrades owned, T5.1a), ?album=demo (12 faces in the Face album, T8.2), ?twist=fidgety|ticklish|
// sensitive|hurry (every customer gets that twist, T8.3), ?boss=hairday|nosestrip|golden|horn (every customer is that
// boss or event and its tools are owned, T8.4), ?daily=YYYY-MM-DD (the daily challenge's date, T8.5) and
// ?dailystreak=N (a streak of N days up to the day before); ?seed=N (every face uses that
// seed, also without ?test); ?demo is handled by index.html (the old pop demo).

import { t } from '../core/strings.js';
import { createSaveStore } from '../core/save.js';
import { createSound } from '../core/sound.js';
import { createMusic } from '../core/music.js';
import { createPopMode } from '../pop/pop-mode.js';
import { faceGeometry } from '../pop/logic.js';
import { makeFaceTexture } from '../pop/face.js';
import { playComic } from './comic.js';
import { ARTS, dressHeroine, studioKit } from './comic-art.js';
import { describeRequest } from './requests.js';
import { economyFromSave, masteryProgress } from './economy.js';
import { getChapter } from '../data/chapters.js';
import { BUMP_IDS } from '../data/bumps.js';
import { SHOP_ITEMS } from '../data/economy-data.js';
import { importNoticeKey, osPrefersStill, ignoreInput, backRoute } from '../screens/screen-logic.js';
import { createTitleScreen } from '../screens/title.js';
import { createNameScreen } from '../screens/name.js';
import { createMenuScreen } from '../screens/menu.js';
import { createCustomerIntroScreen } from '../screens/customer-intro.js';
import { createResultScreen } from '../screens/result.js';
import { createShopScreen } from '../screens/shop.js';
import { createComicsScreen } from '../screens/comics.js';
import { createSettingsScreen } from '../screens/settings.js';
import { createAboutScreen } from '../screens/about.js';
import { createSpecialScreen } from '../screens/special.js';
import { createTorchlightScreen } from '../screens/torchlight.js';
import { createPhoneScrollScreen } from '../screens/phone-scroll.js';
import { createScrubScreen } from '../screens/scrub.js';
import { createEndScreen } from '../screens/end.js';
import { createStudioScreen } from '../screens/studio.js';
import { createGuideScreen } from '../screens/guide.js';
import {
  guideCards, metKinds, addSeenKinds, twistCards, addSeenTwists, bossCards, addSeenBosses, skillCards,
} from '../screens/guide-logic.js';
import { createDiplomaScreen } from '../screens/diploma.js';
import { createReveal } from '../screens/reveal.js';
import { createAlbumScreen } from '../screens/album.js';
import { faceSetup, recordFace, revealOn, stripFriendsMet } from '../screens/album-logic.js';
import { describeTwist } from '../data/twists.js';
import { describeBoss } from '../data/bosses.js';
import * as L from './app-logic.js';
import {
  today, dailyState, dailyFor, dailyStep, describeGoal, judgeDaily, dailyResult, settleDaily, msToMidnight, addDays,
  dailyTag, dailyPayout,
} from './daily-logic.js';
import { createDailyDoneScreen } from '../screens/daily-done.js';

/** The daily goals an Ow already spoils (the header chip says "missed" at the first Ow, T8.5). */
const OW_GOALS = ['stars3', 'noOw'];

/** Which shop tab shows an item kind (to come back to the same tab after a purchase). */
const TAB_OF_KIND = { tool: 'tools', studio: 'studio', outfit: 'outfit' };

/**
 * A storage that lives only in memory (for ?test runs: nothing is written to the phone).
 * @returns {{getItem: (k: string) => string|null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void}} the storage
 */
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

/**
 * The phone's storage, or null when it is blocked (private mode and so on).
 * @returns {Storage|null} localStorage or null
 */
function phoneStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/**
 * Start the game in a page element.
 * @param {HTMLElement} root the element the screens fill (full window)
 * @param {{search?: string}} [o] the page address query (location.search by default)
 * @returns {{readonly save: object, store: object}} a small handle for tests and the console
 */
export function startApp(root, { search = globalThis.location?.search ?? '' } = {}) {
  const flags = L.parseFlags(search);
  const store = createSaveStore(flags.test ? memoryStorage() : phoneStorage() ?? undefined);
  let save = store.load();
  if (flags.test) {
    save = L.applyTestFlags(save, flags);
    store.save(save);
  }
  let screen = null; // the screen on show ({node, dispose})
  let pop = null; // the pop scene while a round or free play is on
  let guideOverlay = null; // the Field guide over the pop scene (T6.5), while it is open
  const sound = createSound({ sfxOn: save.settings.sound, musicOn: save.settings.music, sfxVolume: save.settings.sfxVolume }); // comics and menus
  const music = createMusic({ sound, volume: save.settings.musicVolume }); // background music (T6.1a), on the same audio as the sounds
  let hurryTimer = 0; // ends the hectic music when a hurry request's time is up
  let hurry = null; // that hurry clock: {request, left: ms still to go, since: when it last went on (null = paused while hidden)}
  let midnightTimer = 0; // redraws the menu at midnight, so a new day's challenge shows while the app is open (T8.5)
  // Browsers only allow sound after a tap: the first tap anywhere wakes the audio, and the music starts then.
  for (const type of ['click', 'touchend', 'keydown']) (root.ownerDocument ?? root).addEventListener(type, () => sound.unlock(), { passive: true });
  installVibrationSwitch();

  /**
   * The pop scene keeps its sound switch in a storage; this one maps it onto the save's sound setting, so the switch
   * in the pop scene and the one in Settings are the same switch.
   */
  const popStorage = {
    /** The sound switch as the pop scene reads it. @returns {string} 'on' or 'off' */
    getItem: () => (save.settings.sound ? 'on' : 'off'),
    /** The pop scene's sound switch changed. @param {string} _k key @param {string} v 'on' or 'off' @returns {void} */
    setItem: (_k, v) => { persist(L.setSetting(save, 'sound', v !== 'off')); sound.setOn(v !== 'off'); },
  };

  /** Whether the calm version is on (the player's switch, or the phone's own reduced-motion setting). @returns {boolean} true = reduced motion */
  const still = () => Boolean(save.settings.reducedMotion) || osPrefersStill();
  /** The player's name for {name} in texts. @returns {string} the name (the default name when empty) */
  const playerName = () => save.playerName || t('name.default');
  /**
   * The pop scene's two-finger squeeze options (T1.7): the Settings switch, and the one-time hint (remembered once shown).
   * @returns {{squeeze: boolean, squeezeHint: boolean, onSqueezeHint: () => void}} createPopMode options
   */
  const squeezeOptions = () => ({
    squeeze: Boolean(save.settings.squeeze),
    squeezeHint: Boolean(save.settings.squeeze) && !save.squeezeHintSeen,
    onSqueezeHint: () => persist({ ...save, squeezeHintSeen: true }),
  });
  /**
   * The pop scene's lighter graphics (owner 2026-10-28, older phones): the Settings switch, and switching it on by itself
   * (saved) when the scene finds its frames slow.
   * @returns {{lowDetail: boolean, onSlow: () => void}} createPopMode options
   */
  const detailOptions = () => ({
    lowDetail: Boolean(save.settings.lowDetail),
    onSlow: () => { if (!save.settings.lowDetail) persist(L.setSetting(save, 'lowDetail', true)); },
  });
  /**
   * The pop scene's Field guide options (T6.5): the "?" button, the kinds she has met (for the first-time hints) and
   * where newly met kinds go (saved at once).
   * @returns {{onGuide: () => void, seenKinds: string[], onSeenKinds: (kinds: string[]) => void}} createPopMode options
   */
  const guideOptions = () => ({
    onGuide: openGuideOverlay,
    seenKinds: metKinds(save),
    onSeenKinds: (kinds) => persist(addSeenKinds(save, kinds)),
  });
  /** The Field guide's cards for the save as it is now. @returns {object[]} cards (guide-logic.js guideCards) */
  const currentGuideCards = () => guideCards({ seenKinds: metKinds(save), ownedTools: economyFromSave(save).unlockedTools });
  /** The Field guide's customer twist cards for the save as it is now (T8.3). @returns {object[]} cards (guide-logic.js twistCards) */
  const currentTwistCards = () => twistCards({ seenTwists: save.seenTwists });
  /** The Field guide's Events cards for the save as it is now (T8.4). @returns {object[]} cards (guide-logic.js bossCards) */
  const currentEventCards = () => bossCards({ seenBosses: save.seenBosses });
  /** The Field guide's "Pop mastery" cards for the save as it is now (D34). @returns {object[]} cards (guide-logic.js skillCards) */
  const currentSkillCards = () => {
    const eco = economyFromSave(save);
    return skillCards({ seenKinds: metKinds(save), progress: Object.fromEntries(BUMP_IDS.map((id) => [id, masteryProgress(eco, id)])) });
  };

  /**
   * Keep a new save and write it to storage.
   * @param {object} next the new save
   * @returns {void}
   */
  function persist(next) {
    save = next;
    store.save(save);
  }

  /**
   * Vibration follows the save's switch: the pop scene buzzes through navigator.vibrate, so that call is wrapped once
   * to do nothing while vibration is off.
   * @returns {void}
   */
  function installVibrationSwitch() {
    const nav = globalThis.navigator;
    if (!nav || typeof nav.vibrate !== 'function') return;
    const real = nav.vibrate.bind(nav);
    try {
      Object.defineProperty(nav, 'vibrate', { configurable: true, value: L.guardVibrate(real, () => Boolean(save.settings.vibration)) });
    } catch { /* cannot wrap here: vibration then always follows the phone */ }
  }

  /**
   * Play the music that fits what is on show (app-logic.js musicMoodFor; the saved music switch decides first).
   * @param {{screen: string, request?: object|null, requestOpen?: boolean}} context what is on show
   * @returns {void}
   */
  function setMusic(context) {
    clearTimeout(hurryTimer);
    hurry = null;
    music.setMood(L.musicMoodFor({ musicOn: save.settings.music, ...context }));
  }

  /**
   * Music for a customer round: hectic while a hurry or combo request is open. A hurry request is over when its time
   * is up; a combo request counts as open until the round ends (the pop scene does not report it earlier).
   * @param {object|null} request the round's request
   * @returns {void}
   */
  function roundMusic(request) {
    setMusic({ screen: 'round', request });
    if (request?.type === 'hurry' && Number.isFinite(request.timeLimit)) {
      hurry = { request, left: request.timeLimit * 1000, since: performance.now() };
      planHurryEnd();
    }
  }

  /** (Re)start the timer that ends the hectic music when the hurry request's time is up. @returns {void} */
  function planHurryEnd() {
    clearTimeout(hurryTimer);
    if (!hurry) return;
    const h = hurry;
    hurryTimer = setTimeout(() => { if (hurry === h) { hurry = null; setMusic({ screen: 'round', request: h.request, requestOpen: false }); } }, h.left);
  }

  /**
   * The page was hidden or shown again (B83): the hurry clock stands still while hidden (pop-mode.js pauses the round's
   * own clock), so the timer that ends the hectic music stops too and goes on with the time that was left.
   * @returns {void}
   */
  function onPageVisibility() {
    if (!hurry) return;
    const now = performance.now();
    if (globalThis.document?.hidden) {
      if (hurry.since === null) return; // already paused
      clearTimeout(hurryTimer);
      hurry.left = Math.max(0, hurry.left - (now - hurry.since));
      hurry.since = null;
    } else if (hurry.since === null) {
      hurry.since = now;
      planHurryEnd();
    }
  }
  globalThis.document?.addEventListener?.('visibilitychange', onPageVisibility);
  globalThis.addEventListener?.('pagehide', onPageVisibility);
  globalThis.addEventListener?.('pageshow', onPageVisibility);

  /** Take the screen or the pop scene that is on show away. @returns {void} */
  function clear() {
    closeGuideOverlay(false);
    screen?.dispose();
    screen = null;
    pop?.dispose();
    pop = null;
  }

  // The phone's Back button (B87): while a screen other than the menu, title or name screen is on show, one extra page
  // history entry (the "guard") sits on top. Back takes it away, and the game runs that screen's own Back or Menu
  // action instead of leaving the page (screen-logic.js backRoute). On the menu Back leaves the game as usual (after
  // the guard, if one is still there, a second Back). The address stays the same, so a reload works as before.
  const hist = globalThis.history;
  let nav = { root: true, back: null }; // what is on show for Back: root = menu, title or name; back = its Back or Menu action
  let guardOn = Boolean(hist?.state?.popperGuard); // a reload on the guard entry: it is still there
  let changedAt = -Infinity; // when the screen last changed (ms), for the double-tap guard (B85)
  let restoring = false; // true while Back runs a screen's action (onBackButton): no new history entry then

  /**
   * A new screen is on show: note the time (the double-tap guard) and what Back does there, and make sure the guard
   * history entry is there when Back should not leave the game.
   * @param {{root?: boolean, back?: (() => void)|null}} [o] root = the menu, title or name screen; back = its Back or Menu action
   * @returns {void}
   */
  function screenChanged({ root: top = false, back = null } = {}) {
    changedAt = performance.now();
    nav = { root: top, back };
    if (!top) pushGuard();
  }

  /** Put the guard history entry on top (once), so the phone's Back comes to the game first (B87). @returns {void} */
  function pushGuard() {
    if (guardOn || restoring || typeof hist?.pushState !== 'function') return;
    try { hist.pushState({ popperGuard: true }, ''); guardOn = true; } catch { /* no history here: Back leaves as before */ }
  }

  /**
   * The phone's or browser's Back took the guard entry away (B87): do what the screen's own Back or Menu button does
   * (screen-logic.js backRoute), then put the guard back if the new screen still is not a top screen.
   * @param {PopStateEvent} e the history event
   * @returns {void}
   */
  function onBackButton(e) {
    if (e.state?.popperGuard) { guardOn = true; return; } // Forward onto the guard entry again: nothing to do
    guardOn = false;
    const route = backRoute({ root: nav.root, overlay: Boolean(guideOverlay), hasBack: typeof nav.back === 'function', ending: Boolean(pop?.ending?.()) });
    restoring = true; // the new screen must not add an entry here (see below)
    try {
      if (route === 'overlay') closeGuideOverlay(true);
      else if (route === 'back') nav.back();
    } finally { restoring = false; }
    // Still not a top screen: step forward onto the same guard entry again. (A new entry added here, without a tap,
    // could be skipped by the phone's next Back; going forward never is.) The popstate it brings sets guardOn.
    if (!nav.root) { try { hist.forward(); } catch { pushGuard(); } }
  }
  globalThis.addEventListener?.('popstate', onBackButton);

  /**
   * The double-tap guard (B85): a finger or mouse tap in the first moment after a screen change, and a held Enter or
   * Space key's repeats on a button, are stopped before any screen sees them (screen-logic.js ignoreInput).
   * @param {MouseEvent|KeyboardEvent} e the click, keydown or keypress
   * @returns {void}
   */
  function guardInput(e) {
    const target = e.target;
    const skip = ignoreInput({
      type: e.type, trusted: e.isTrusted, pointer: e.detail > 0, repeat: e.repeat, key: e.key,
      onButton: Boolean(target?.closest?.('button, a[href], [role="button"]')), inPop: Boolean(target?.closest?.('.pop-game')),
      msSinceChange: performance.now() - changedAt,
    });
    if (skip) { e.preventDefault(); e.stopImmediatePropagation(); }
  }
  globalThis.addEventListener?.('click', guardInput, true);
  globalThis.addEventListener?.('keydown', guardInput, true);
  globalThis.addEventListener?.('keypress', guardInput, true);

  /**
   * Show a screen (the old one goes).
   * @param {{node: HTMLElement, dispose: () => void}} next the screen
   * @param {{root?: boolean, back?: (() => void)|null}} [navOpts] for the phone's Back (B87): root = the menu, title or
   *   name screen (Back may leave the game); back = what the screen's own Back or Menu button does (none = Back stays)
   * @returns {object} the same screen
   */
  function show(next, navOpts = {}) {
    clear();
    setMusic({ screen: 'menu' });
    screenChanged(navOpts);
    screen = next;
    root.append(next.node);
    // The old screen (and the button that was focused on it) is gone: keep keyboard focus in the new screen, so Tab starts
    // at its first control and a screen reader reads its name. Screens that focus a control themselves do so a moment later.
    const doc = root.ownerDocument ?? document;
    if (!root.contains(doc.activeElement) || doc.activeElement === root) next.node.focus?.({ preventScroll: true });
    return next;
  }

  /**
   * Play one comic strip over the page, mark it seen (and save) when it was read or skipped, then go on.
   * @param {string} id strip id
   * @param {() => void} then what comes after (when the player taps Continue on the end card)
   * @returns {void}
   */
  function playStrip(id, then) {
    const strip = L.stripById(id);
    if (!strip) { then(); return; }
    clear();
    sound.unlock();
    setMusic({ screen: 'comic' });
    screenChanged(); // a comic: Back stays (it has no Back or Menu button, B87)
    const sv = L.stripVars(id, save);
    const vars = { ...sv.values };
    for (const [k, key] of Object.entries(sv.keys)) vars[k] = t(key);
    playComic(strip, {
      name: playerName(), vars, reducedMotion: still() || undefined, sound,
      arts: studioKit(dressHeroine(ARTS, L.comicOutfit(strip, save)), L.comicStudio(strip, save)), // outfit, gloves, plant
      onSeen: (sid) => persist(L.markSeen(save, sid)),
      onClose: then,
    });
  }

  /**
   * Play several strips one after another (milestone strips), then go on.
   * @param {string[]} ids strip ids
   * @param {() => void} then what comes after the last one
   * @returns {void}
   */
  function playStrips(ids, then) {
    if (!ids.length) { then(); return; }
    playStrip(ids[0], () => playStrips(ids.slice(1), then));
  }

  /**
   * Put a "Menu" button into the pop scene's top bar (the pop scene has none of its own).
   * @param {() => void} onClick what it does
   * @returns {void}
   */
  function addPopMenuButton(onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pop-btn pop-menu';
    b.textContent = t('ui.pop.menu');
    // Ignored in the short pause after a finished customer (the button is hidden then too), so the pay is never lost.
    b.addEventListener('click', () => { if (!pop?.ending?.()) onClick(); });
    pop?.node.querySelector('.pop-head')?.prepend(b);
  }

  /**
   * Put the daily challenge's goal into the pop scene's header (T8.5): a small gold chip under the customer's name.
   * @param {{id: string, n?: number, timeLimit?: number}} goal the day's goal
   * @returns {(missed: boolean) => void} repaints the chip (true = the goal can no longer be reached this try)
   */
  function addPopGoalChip(goal) {
    const chip = document.createElement('p');
    chip.className = 'pop-goal';
    const name = t(describeGoal(goal).nameKey);
    /** Paint the chip. @param {boolean} missed the goal is out of reach this try @returns {void} */
    const paint = (missed) => {
      chip.textContent = t(missed ? 'ui.daily.chipMissed' : 'ui.daily.chip', { goal: name });
      chip.classList.toggle('pop-goal--missed', missed);
    };
    paint(false);
    pop?.node.querySelector('.pop-title')?.after(chip);
    return paint;
  }

  /**
   * Draw a customer's face for the intro portrait (the same face renderer as the pop scene, a bit worried).
   * @param {object} spec the face parts (customer.face)
   * @param {number} seed the face seed
   * @param {string} label what screen readers say
   * @returns {HTMLCanvasElement} the picture
   */
  function facePortrait(spec, seed, label) {
    const w = 220;
    const h = 240;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const canvas = makeFaceTexture(w, h, dpr, faceGeometry(w, h, spec), spec, { mood: 'grim', redness: 0.6, seed });
    canvas.className = 'app-intro__face';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    return canvas;
  }

  /** First start: ask for the name, then the menu. @returns {void} */
  function showName() {
    show(createNameScreen({
      t, reducedMotion: still(),
      onDone: (name) => { persist(L.setName(save, name)); showMenu(); },
    }), { root: true });
  }

  /** The title screen. @returns {void} */
  function showTitle() {
    show(createTitleScreen({ t, reducedMotion: still(), onStart: () => { sound.unlock(); showMenu(); }, onAbout: () => showAbout(showTitle) }), { root: true });
  }

  /**
   * The date of today's daily challenge (T8.5): the ?daily= date in a test run, else the phone's date right now.
   * @returns {string} 'YYYY-MM-DD'
   */
  function dailyDate() {
    return (flags.test && flags.daily) || today();
  }

  /**
   * The second line of the menu's Daily challenge button (T8.5): today's goal and the streak, or "Done today".
   * @returns {{key: string, vars?: object}} string key and its values
   */
  function dailyMenuLine() {
    const date = dailyDate();
    const st = dailyState(save, date);
    if (st.done) return { key: 'ui.menu.dailyDone' };
    const goal = t(describeGoal(dailyFor(date, economyFromSave(save).unlockedTools).goal).nameKey); // her tools: No Ows needs a warm cloth (D27c)
    return st.streak ? { key: 'ui.menu.dailySub', vars: { goal, n: st.streak } } : { key: 'ui.menu.dailySubNew', vars: { goal } };
  }

  /** The main menu. @returns {void} */
  function showMenu() {
    clearTimeout(midnightTimer);
    const menu = showMenuScreen();
    // At midnight the menu draws itself again (a new challenge, or the streak line), if it is still on show (T8.5).
    if (L.keepWorkingOpen(save) && !(flags.test && flags.daily)) {
      midnightTimer = setTimeout(() => { if (screen === menu) showMenu(); }, msToMidnight());
    }
  }

  /** Build and show the main menu screen. @returns {object} the screen */
  function showMenuScreen() {
    return show(createMenuScreen({
      t, reducedMotion: still(), playerName: save.playerName, chapterTitleKey: L.chapterTitleKey(save),
      onContinue: () => { sound.unlock(); continueStory(); }, onFreePlay: startFreePlay, onComics: showComics, onGuide: () => showGuide(showMenu),
      onShop: () => showShop(showMenu), onStudio: () => showStudio(showMenu), onSettings: showSettings,
      onAbout: () => showAbout(showMenu), showShop: L.shopOpen(save), showStudio: L.shopOpen(save),
      showKeepWorking: L.keepWorkingOpen(save), keepWorkingPercent: L.KEEP_WORKING_PERCENT,
      onKeepWorking: () => { sound.unlock(); keepWorking(); },
      // The daily challenge (T8.5): with Keep working, after the ending.
      showDaily: L.keepWorkingOpen(save), dailySub: L.keepWorkingOpen(save) ? dailyMenuLine() : null,
      onDaily: () => { sound.unlock(); playDaily(); },
      onAlbum: L.shopOpen(save) ? () => showAlbum(showMenu) : undefined, // the Face album (T8.2): from the career chapter on, like the shop
    }), { root: true });
  }

  /**
   * The Face album (T8.2): the faces she has cleared in her studio.
   * @param {() => void} back where Back goes
   * @returns {void}
   */
  function showAlbum(back) {
    show(createAlbumScreen({ t, reducedMotion: still(), faces: save.albumFaces, friendsMet: stripFriendsMet(save), onBack: back }), { back });
  }

  /**
   * The pop scene's stage size right now (the face layout depends on it), for the before and after reveal (T8.2).
   * @returns {{w: number, h: number}|null} CSS px, or null when there is no pop scene
   */
  function popStageSize() {
    const r = pop?.node.querySelector('.pop-stage')?.getBoundingClientRect();
    return r ? { w: r.width, h: r.height } : null;
  }

  /**
   * Keep working (T5.4, SPEC D23): the next random customer after the ending, through the same intro, round and
   * result as the career. Waiting milestone strips and a studio scrub job come first, as in continueStory. The story
   * never moves here; Menu leaves at any time (the save is written after every customer).
   * @returns {void}
   */
  function keepWorking() {
    const lost = L.pendingStrips(save);
    if (lost.length) { playStrips(lost, () => { persist(L.clearPendingStrips(save)); keepWorking(); }); return; }
    const waiting = L.pendingScrub(save);
    if (waiting) { runScrub(waiting, keepWorking); return; }
    showIntro(L.keepWorkingStep(save));
  }

  /**
   * The daily challenge (T8.5): today's customer through the same intro, round and result as Keep working, or, once
   * today's goal is reached, the small "done today" screen (no replay: the reward is once per day and a second try
   * would only pay normal Keep working coins). Waiting milestone strips and a scrub job come first, as in keepWorking.
   * @returns {void}
   */
  function playDaily() {
    const date = dailyDate();
    if (dailyState(save, date).done) { showDailyDone(date); return; }
    const lost = L.pendingStrips(save);
    if (lost.length) { playStrips(lost, () => { persist(L.clearPendingStrips(save)); playDaily(); }); return; }
    const waiting = L.pendingScrub(save);
    if (waiting) { runScrub(waiting, playDaily); return; }
    showIntro(dailyStep(date));
  }

  /**
   * The "done today" screen of the daily challenge (T8.5): the streak, the best streak and tomorrow's goal.
   * @param {string} date today, 'YYYY-MM-DD'
   * @returns {void}
   */
  function showDailyDone(date) {
    const st = dailyState(save, date);
    show(createDailyDoneScreen({
      t, reducedMotion: still(), streak: st.streak, best: st.best,
      nextGoalKey: describeGoal(dailyFor(addDays(date, 1), economyFromSave(save).unlockedTools).goal).nameKey, onMenu: showMenu,
    }), { back: showMenu });
  }

  /**
   * The Field guide from the menu (T6.5).
   * @param {() => void} back where Back goes
   * @returns {void}
   */
  function showGuide(back) {
    show(createGuideScreen({
      t, reducedMotion: still(), cards: currentGuideCards(), twistCards: currentTwistCards(), eventCards: currentEventCards(),
      skillCards: currentSkillCards(), onBack: back,
    }), { back });
  }

  /**
   * The Field guide over the pop scene (T6.5, its "?" button): the scene stays as it is underneath and takes no taps
   * or keys while the guide is open (hurry rounds have no "?" button, so no clock runs out meanwhile).
   * @returns {void}
   */
  function openGuideOverlay() {
    if (!pop || guideOverlay) return;
    guideOverlay = createGuideScreen({
      t, reducedMotion: still(), cards: currentGuideCards(), twistCards: currentTwistCards(), eventCards: currentEventCards(),
      skillCards: currentSkillCards(), overlay: true, onBack: () => closeGuideOverlay(true),
    });
    pop.node.inert = true;
    changedAt = performance.now(); // the double-tap guard (B85); the phone's Back closes it (B87, onBackButton)
    root.append(guideOverlay.node);
    guideOverlay.focus();
  }

  /**
   * Close the Field guide over the pop scene, if it is open, and give the scene its taps back.
   * @param {boolean} refocus true = put keyboard focus back on the "?" button
   * @returns {void}
   */
  function closeGuideOverlay(refocus) {
    if (!guideOverlay) return;
    guideOverlay.dispose();
    guideOverlay = null;
    if (!pop) return;
    pop.node.inert = false;
    changedAt = performance.now(); // the double-tap guard (B85): the Back tap must not land on the scene's buttons
    if (refocus) { // the "?" button, or the face when that button is hidden
      const btn = pop.node.querySelector('.pop-guide');
      (btn && !btn.hidden ? btn : pop.node.querySelector('.pop-canvas'))?.focus({ preventScroll: true });
    }
  }

  /**
   * The studio view (T5.1c): her whole studio with every upgrade she has, her in it, and the wall of fame (R8j: a tap
   * on a frame opens that diploma again).
   * @param {() => void} back where Back goes (in hang mode also Continue: back into the game)
   * @param {string|null} [hang] a new Master's bump id: its frame drops onto the wall (right after its diploma)
   * @returns {void}
   */
  function showStudio(back, hang = null) {
    const again = () => showStudio(back); // after reading a diploma again, back to the studio (no longer in hang mode)
    show(createStudioScreen({
      t, reducedMotion: still(), ...L.studioViewArgs(save), hang, onBack: back, onContinue: back,
      onDiploma: (type) => show(createDiplomaScreen({
        t, reducedMotion: still(), type, playerName: playerName(), buttonKey: 'ui.diploma.back', onContinue: again,
      }), { back: again }),
    }), { back });
  }

  /**
   * The About screen.
   * @param {() => void} back where Back goes
   * @returns {void}
   */
  function showAbout(back) {
    show(createAboutScreen({ t, reducedMotion: still(), onBack: back }), { back });
  }

  /**
   * Play the next story step (see the file comment). A studio upgrade still waiting for its scrub job comes first.
   * @returns {void}
   */
  function continueStory() {
    const lost = L.pendingStrips(save); // milestone strips left over when the app was closed on a result screen (B4)
    if (lost.length) { playStrips(lost, () => { persist(L.clearPendingStrips(save)); continueStory(); }); return; }
    const waiting = L.pendingScrub(save);
    if (waiting) { runScrub(waiting, continueStory); return; }
    const step = L.nextStep(save);
    /** Finish this step, save, and play the next. @returns {void} */
    const done = () => { persist(L.finishStep(save, step)); continueStory(); };
    if (step.type === 'strip' || step.type === 'teaser' || step.type === 'bridge') playStrip(step.stripId, done);
    else if (step.type === 'scare') playStrip(L.SCARE_STRIP, done);
    else if (step.type === 'special' && getChapter(step.chapter)?.special === 'torchlight') playTorchlight(step, done);
    else if (step.type === 'special' && getChapter(step.chapter)?.special === 'phoneScroll') playPhoneScroll(done);
    else if (step.type === 'special') {
      // Fallback for a special mode with no screen yet (none in v1: torchlight T4.5, phoneScroll T4.6).
      show(createSpecialScreen({ t, reducedMotion: still(), titleKey: getChapter(step.chapter)?.titleKey, onContinue: done }));
    } else if (step.type === 'customer') showIntro(step);
    else {
      persist(L.finishStep(save, step)); // the end: v1 is finished (Continue shows this screen again)
      show(createEndScreen({ t, reducedMotion: still(), textKey: step.textKey, playerName: save.playerName, onMenu: showMenu }), { back: showMenu });
    }
  }

  /**
   * The torchlight special mode (T4.5, chapter 1): the sneaky pop by torchlight; the catch's Continue goes on with the
   * story. No money, no stats.
   * @param {{chapter: number}} step the special step
   * @param {() => void} done finishes the step and plays the next
   * @returns {void}
   */
  function playTorchlight(step, done) {
    sound.unlock();
    const tl = show(createTorchlightScreen({
      t, reducedMotion: still(), roundArgs: L.torchlightArgs(save, step.chapter, flags.seed),
      popOptions: { storage: popStorage, sfxVolume: save.settings.sfxVolume, ...squeezeOptions(), ...detailOptions() }, onContinue: done, onMenu: showMenu,
    }), { back: showMenu });
    tl.unlock();
  }

  /**
   * The phone-scroll special mode (T4.6, chapter 4): late-night scrolling with tiny pops; the idea card's Continue goes
   * on with the story (strip 5). No money, no stats; calm music (show() sets it).
   * @param {() => void} done finishes the step and plays the next
   * @returns {void}
   */
  function playPhoneScroll(done) {
    sound.unlock();
    show(createPhoneScrollScreen({ t, sound, seed: flags.seed, reducedMotion: still(), onContinue: done, onMenu: showMenu }), { back: showMenu });
  }

  /**
   * A customer's intro: portrait, story line, request, the tweezers hint, Start.
   * @param {{chapter: number, n: number, total: number}} step the customer step
   * @returns {void}
   */
  function showIntro(step) {
    // ?twist= (T8.3) and ?boss= (T8.4) only in test runs.
    const args = L.roundArgs(save, step, flags.seed, flags.test ? flags.twist : null, flags.test ? flags.boss : null);
    if (!args && step.keepWorking) { showMenu(); return; } // never happens: every Keep working number has a customer
    if (!args) { persist(L.finishStep(save, step)); continueStory(); return; } // no such customer: never in v1 data
    // The twist pill (T8.3). A hurry request IS the "in a hurry" twist: its pill carries the request's own line (with
    // the seconds) instead of a second box.
    const req = describeRequest(args.request);
    const hurry = args.twist === 'hurry' && req;
    const twist = describeTwist(args.twist, { ownedTools: args.unlockedTools });
    // The daily challenge (T8.5): "Daily challenge: Combo master" in the step pill, the goal's line in the note box.
    const goal = args.daily ? describeGoal(args.daily.goal) : null;
    const note = goal ? { key: goal.lineKey, vars: goal.vars, labelKey: 'ui.daily.label' } : hurry ? null : req;
    show(createCustomerIntroScreen({
      t, reducedMotion: still(), customer: args.customer, playerName: playerName(), request: note,
      twist: hurry ? { ...twist, lineKey: req.key, lineVars: req.vars, hintKey: null } : twist,
      boss: describeBoss(args.boss?.id ?? null), // a boss or event customer's gold pill (T8.4)
      step: goal ? { key: 'ui.daily.pill', vars: { goal: t(goal.nameKey) } }
        : step.keepWorking ? { key: 'ui.keepWorking.step', n: step.n } : step.total > 1 ? { n: step.n, total: step.total } : null,
      portrait: facePortrait(args.customer.face, args.seed, t(args.customer.nameKey)),
      hintKey: L.introHintKey(save, step), onStart: () => playRound(step, args), onMenu: showMenu,
    }), { back: showMenu });
  }

  /**
   * Play one customer in the pop scene; when it ends, pay, save and show the result.
   * @param {{chapter: number, n: number}} step the customer step
   * @param {object} args the startRound arguments (app-logic.js roundArgs)
   * @returns {void}
   */
  function playRound(step, args) {
    clear();
    if (args.twist) persist(addSeenTwists(save, [args.twist])); // she has met this twist: its guide card opens (T8.3)
    if (args.boss) persist(addSeenBosses(save, [args.boss.id])); // ... and this boss or event: its Events card (T8.4)
    pop = createPopMode({ t, storage: popStorage, sfxVolume: save.settings.sfxVolume, reducedMotion: still(), ...squeezeOptions(), ...detailOptions(), ...guideOptions() });
    pop.mount(root);
    addPopMenuButton(showMenu);
    screenChanged({ back: showMenu }); // Back = the scene's Menu button (not in the end pause, B87)
    const paintGoal = args.daily ? addPopGoalChip(args.daily.goal) : null; // the daily goal in the header (T8.5)
    // An Ow spoils a "3 stars" or "No Ows" day at once: the chip says so (Try again starts it fresh).
    const goalHooks = paintGoal && OW_GOALS.includes(args.daily.goal.id) ? { onOw: () => paintGoal(true) } : {};
    sound.unlock();
    pop.unlock();
    /** Start (or start again) the round. @returns {void} */
    const start = () => { roundMusic(args.request); paintGoal?.(false); pop.startRound({ ...args, ...goalHooks, customerName:args.customerNameKey ? t(args.customerNameKey) : null, onFinish: (payload) => finishRound(step, payload, start, args) }); };
    start();
  }

  /**
   * A round ended: Try again starts it afresh; otherwise the result is applied, saved and shown.
   * @param {{chapter: number, n: number}} step the customer step
   * @param {object} payload the onFinish payload
   * @param {() => void} again starts the same round again
   * @param {object} [args] the round's startRound arguments (for the before and after reveal and the album, T8.2)
   * @returns {void}
   */
  function finishRound(step, payload, again, args) {
    // A boss pays its bonus (T8.4); the visit's lines go along so the line memory counts the visit (R6-lines).
    // A pin visit puts the pin into the jar (owner 2026-10-28, game/pin-jar.js).
    const out = L.applyRound(save, payload, { ...step, ...(args?.boss ? { boss: args.boss.id } : {}), ...(args?.lines ? { lines: args.lines } : {}), ...(args?.pin ? { pin: true } : {}) });
    if (out.retry) { again(); return; }
    // T8.5: a daily challenge try (finished or skipped) settles the goal reward and the streak, once per day.
    const daily = step.daily
      ? settleDaily(out.save, { date: step.daily, reached: judgeDaily(args?.daily?.goal, dailyResult(payload)) }) : null;
    const stamp = out.boss ?? daily?.milestone?.stamp ?? null; // a boss stamp (T8.4) or a streak milestone stamp (T8.5)
    // T8.2: a finished career or Keep working customer gets the before and after reveal and goes into the album.
    const face = args && !out.failed && revealOn(step) ? faceSetup(args, popStageSize(), payload) : null; // payload: nose strip peeled?
    // The save also lists the milestone strips still to play (B4), so closing the app now loses none.
    persist(recordFace(daily ? daily.save : out.save, { step, customer: args?.customer, setup: face, stars: out.stars, failed: out.failed, stamp }));
    /** Play the waiting milestone strips once, forget them, then go on. @param {() => void} then what comes after @returns {void} */
    const playWaiting = (then) => playStrips(L.pendingStrips(save), () => { persist(L.clearPendingStrips(save)); then(); });
    // Keep working goes on to its next customer (T5.4); the daily challenge goes back to the menu (T8.5).
    const onward = step.daily ? showMenu : step.keepWorking ? keepWorking : continueStory;
    if (out.failed) { playWaiting(onward); return; } // "Next customer": on with the story
    /** The Master diplomas of this round (D34) one after the other, then the waiting strips, then on. @param {() => void} then what comes after @returns {void} */
    const afterResult = (then) => showDiplomas(out.skills?.mastered ?? [], () => playWaiting(then));
    const tag = daily ? dailyTag(daily) : step.keepWorking ? { key: 'ui.keepWorking.pay', vars: { pct: L.KEEP_WORKING_PERCENT } } : null;
    show(createResultScreen({
      t, reducedMotion: still(), stars: out.stars, payout: daily ? dailyPayout(out.payout, daily) : out.payout, reputationChange: out.reputationChange,
      factKey: out.factKey, reactionKey: out.reactionKey, playerName: playerName(),
      tagKey: tag?.key ?? null, tagVars: tag?.vars ?? {},
      // "New stamp!" for a boss (T8.4) or a streak milestone (T8.5; its name key is boss.<stamp>.name, as in the album).
      stampKey: stamp && face ? (out.boss ? describeBoss(out.boss)?.nameKey ?? null : `boss.${stamp}.name`) : null,
      reveal: face ? createReveal({ t, setup: face, reducedMotion: still(), name: args.customerNameKey ? t(args.customerNameKey) : '' }) : null,
      skills: L.skillNews(out.skills), // D34: "Level up!" or how many clean pops the next level needs
      pinCount: out.pinJar ?? null, // "Pin taken away! Pin jar: n" after a pin visit
      onContinue: () => afterResult(onward),
      onShop: L.shopOpen(save) ? () => afterResult(() => showShop(onward)) : undefined,
    }));
  }

  /**
   * Show the Master diploma of each kind in the list (D34), one after the other, then go on.
   * @param {string[]} types bump ids that just reached Master
   * @param {() => void} then what comes after the last one
   * @returns {void}
   */
  function showDiplomas(types, then) {
    if (!types.length) { then(); return; }
    // "Hang it up!": the studio view, where the new frame drops onto the wall of fame; its Continue goes on (R8j)
    show(createDiplomaScreen({
      t, reducedMotion: still(), type: types[0], playerName: playerName(), buttonKey: 'ui.diploma.hang',
      onContinue: () => showStudio(() => showDiplomas(types.slice(1), then), types[0]),
    }));
    sound.play('cheer');
  }

  /** Free play (SPEC section 6): random faces, the owned tools, never fails, changes no money or stats. @returns {void} */
  function startFreePlay() {
    clear();
    pop = createPopMode({ t, storage: popStorage, sfxVolume: save.settings.sfxVolume, reducedMotion: still(), ...squeezeOptions(), ...detailOptions(), ...guideOptions() });
    pop.mount(root);
    addPopMenuButton(showMenu);
    screenChanged({ back: showMenu }); // Back = the scene's Menu button (B87)
    sound.unlock();
    pop.unlock();
    setMusic({ screen: 'free' });
    pop.startFree(L.freeArgs(save, flags.seed));
  }

  /**
   * The shop. Buying saves at once; a studio item goes straight to its scrub job, a ready item may start its strip.
   * @param {() => void} back where Back goes
   * @param {string} [tab] the tab to open
   * @returns {void}
   */
  function showShop(back, tab = 'tools') {
    const shop = show(createShopScreen({
      t, reducedMotion: still(), state: economyFromSave(save), tab, onBack: back,
      onStudio: () => showStudio(() => showShop(back, 'studio')),
      onBuy: (id) => {
        const out = L.buyItem(save, id);
        if (!out.ok) return;
        persist(out.save);
        /** Back to the shop on the same tab. @returns {void} */
        const reopen = () => showShop(back, TAB_OF_KIND[SHOP_ITEMS[id]?.kind] ?? 'tools');
        if (out.needsScrub) runScrub(id, reopen);
        else if (out.strips.length) playStrips(out.strips, reopen);
        else shop.update({ state: economyFromSave(save) });
      },
    }), { back });
  }

  /**
   * The scrub job of a bought studio item (T5.1b: wipe and scrub that item clean in a close-up). Required: the item
   * shows and its strip plays only after it. Gives +1 reputation.
   * @param {string} itemId the studio item
   * @param {() => void} then what comes after
   * @returns {void}
   */
  function runScrub(itemId, then) {
    sound.unlock();
    show(createScrubScreen({
      t, sound, reducedMotion: still(), itemId, itemNameKey: `ui.item.${itemId}.name`,
      onDone: () => {
        const out = L.scrubDone(save, itemId);
        persist(out.save);
        playStrips(out.strips, then);
      },
    }));
  }

  /** The comics list; a seen strip can be replayed. @returns {void} */
  function showComics() {
    show(createComicsScreen({
      t, reducedMotion: still(), strips: L.comicsList(), seen: save.seenComics, onBack: showMenu,
      onPlay: (id) => playStrip(id, showComics),
    }), { back: showMenu });
  }

  /**
   * Hand the save to the player as a file (Settings, Export).
   * @param {string} text the save as text
   * @returns {void}
   */
  function download(text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = t('ui.settings.fileName');
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Settings: name, switches, export, import and start over. @returns {void} */
  function showSettings() {
    const s = show(createSettingsScreen({
      t, reducedMotion: still(), osStill: osPrefersStill(), playerName: save.playerName, settings: save.settings,
      onName: (name) => persist(L.setName(save, name)),
      onToggle: (key, value) => {
        persist(L.setSetting(save, key, value));
        if (key === 'sound') sound.setOn(value);
        if (key === 'music') { sound.setMusicOn(value); sound.unlock(); setMusic({ screen: 'menu' }); }
        if (key === 'reducedMotion') s.node.classList.toggle('app-still', value || osPrefersStill());
        if (key === 'vibration') { try { globalThis.navigator?.vibrate?.(value ? 40 : 0); } catch { /* not allowed here */ } } // a tiny buzz to feel it; off stops any buzz
      },
      onVolume: (key, value, final) => { // a volume slider moved: apply at once, save, and let a let-go effects slider be heard
        persist(L.setSetting(save, key, value));
        if (key === 'musicVolume') music.setVolume(value);
        if (key === 'sfxVolume') { sound.setVolume(value); if (final) { sound.unlock(); sound.play('pop_small'); } }
      },
      onExport: () => { download(store.exportText(save)); s.update({ notice: { key: 'ui.settings.exported' } }); },
      onImport: (text) => {
        const result = store.importText(text);
        if (result.ok) {
          save = result.save;
          sound.setOn(save.settings.sound);
          sound.setMusicOn(save.settings.music);
          sound.setVolume(save.settings.sfxVolume);
          music.setVolume(save.settings.musicVolume);
          setMusic({ screen: 'menu' });
        }
        s.update({ notice: { key: importNoticeKey(result) }, playerName: save.playerName, settings: save.settings });
      },
      onReset: () => { // a fresh save: bring the live sound and music switches in line with it too
        save = store.reset();
        sound.setOn(save.settings.sound);
        sound.setMusicOn(save.settings.music);
        sound.setVolume(save.settings.sfxVolume);
        music.setVolume(save.settings.musicVolume);
        setMusic({ screen: 'menu' });
        boot();
      },
      onBack: showMenu,
    }), { back: showMenu });
  }

  /** The first screen: the name screen on a first start, the title otherwise. @returns {void} */
  function boot() {
    if (!save.playerName) showName();
    else showTitle();
  }

  boot();
  return { get save() { return save; }, store };
}
