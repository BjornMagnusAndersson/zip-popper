// The app router (T3.1c, with T3.3 save wiring and T3.4 free play): wires every screen, the story chapters, the
// economy, the comics and the pop rounds into one game. index.html calls startApp().
// Flow: first start = name screen, then the menu; later starts = title, then the menu. Continue plays the next story
// step (chapter-logic.js): a chapter strip, a special mode (torchlight, T4.5; phone scroll, T4.6), a customer (intro, pop
// round, result), the hygiene scare strip (gloves), the teaser strip and the "To be continued" screen. Free play,
// Comics, Shop (with the placeholder scrub job until T5.1b), Settings and About hang off the menu.
// The save is written after every customer, purchase, scrub job, comic seen and setting change, so a reload goes on
// exactly where the player was. All the rules are pure helpers in app-logic.js (tested in Node); this file only shows
// screens and passes what happened back to those helpers. All text comes from the string table (t).
// Testing flags (page address): ?test (a throwaway in-memory save; nothing is written to the phone), with ?test also
// ?chapter=N&customer=M (jump: customer M is next), ?money=500, ?rep=40, ?name=Maja; ?seed=N (every face uses that
// seed, also without ?test); ?demo is handled by index.html (the old pop demo).

import { t } from '../core/strings.js';
import { createSaveStore } from '../core/save.js';
import { createSound } from '../core/sound.js';
import { createMusic } from '../core/music.js';
import { createPopMode } from '../pop/pop-mode.js';
import { faceGeometry } from '../pop/logic.js';
import { makeFaceTexture } from '../pop/face.js';
import { playComic } from './comic.js';
import { ARTS } from './comic-art.js';
import { describeRequest } from './requests.js';
import { economyFromSave } from './economy.js';
import { getChapter } from '../data/chapters.js';
import { SHOP_ITEMS } from '../data/economy-data.js';
import { importNoticeKey } from '../screens/screen-logic.js';
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
import * as L from './app-logic.js';

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
  const sound = createSound({ sfxOn: save.settings.sound, musicOn: save.settings.music, sfxVolume: save.settings.sfxVolume }); // comics and menus
  const music = createMusic({ sound, volume: save.settings.musicVolume }); // background music (T6.1a), on the same audio as the sounds
  let hurryTimer = 0; // ends the hectic music when a hurry request's time is up
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

  /** Whether the calm version is on (the player's switch). @returns {boolean} true = reduced motion */
  const still = () => Boolean(save.settings.reducedMotion);
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
      Object.defineProperty(nav, 'vibrate', { configurable: true, value: (pattern) => (save.settings.vibration ? real(pattern) : false) });
    } catch { /* cannot wrap here: vibration then always follows the phone */ }
  }

  /**
   * Play the music that fits what is on show (app-logic.js musicMoodFor; the saved music switch decides first).
   * @param {{screen: string, request?: object|null, requestOpen?: boolean}} context what is on show
   * @returns {void}
   */
  function setMusic(context) {
    clearTimeout(hurryTimer);
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
      hurryTimer = setTimeout(() => setMusic({ screen: 'round', request, requestOpen: false }), request.timeLimit * 1000);
    }
  }

  /** Take the screen or the pop scene that is on show away. @returns {void} */
  function clear() {
    screen?.dispose();
    screen = null;
    pop?.dispose();
    pop = null;
  }

  /**
   * Show a screen (the old one goes).
   * @param {{node: HTMLElement, dispose: () => void}} next the screen
   * @returns {object} the same screen
   */
  function show(next) {
    clear();
    setMusic({ screen: 'menu' });
    screen = next;
    root.append(next.node);
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
    playComic(strip, {
      name: playerName(), reducedMotion: still() || undefined, sound, arts: ARTS,
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
    b.addEventListener('click', onClick);
    pop?.node.querySelector('.pop-head')?.prepend(b);
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
    }));
  }

  /** The title screen. @returns {void} */
  function showTitle() {
    show(createTitleScreen({ t, reducedMotion: still(), onStart: () => { sound.unlock(); showMenu(); }, onAbout: () => showAbout(showTitle) }));
  }

  /** The main menu. @returns {void} */
  function showMenu() {
    show(createMenuScreen({
      t, reducedMotion: still(), playerName: save.playerName, chapterTitleKey: L.chapterTitleKey(save),
      onContinue: () => { sound.unlock(); continueStory(); }, onFreePlay: startFreePlay, onComics: showComics,
      onShop: () => showShop(showMenu), onSettings: showSettings, onAbout: () => showAbout(showMenu),
      showShop: L.shopOpen(save),
    }));
  }

  /**
   * The About screen.
   * @param {() => void} back where Back goes
   * @returns {void}
   */
  function showAbout(back) {
    show(createAboutScreen({ t, reducedMotion: still(), onBack: back }));
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
    if (step.type === 'strip' || step.type === 'teaser') playStrip(step.stripId, done);
    else if (step.type === 'scare') playStrip(L.SCARE_STRIP, done);
    else if (step.type === 'special' && getChapter(step.chapter)?.special === 'torchlight') playTorchlight(step, done);
    else if (step.type === 'special' && getChapter(step.chapter)?.special === 'phoneScroll') playPhoneScroll(done);
    else if (step.type === 'special') {
      // Fallback for a special mode with no screen yet (none in v1: torchlight T4.5, phoneScroll T4.6).
      show(createSpecialScreen({ t, reducedMotion: still(), titleKey: getChapter(step.chapter)?.titleKey, onContinue: done }));
    } else if (step.type === 'customer') showIntro(step);
    else {
      persist(L.finishStep(save, step)); // the end: v1 is finished (Continue shows this screen again)
      show(createEndScreen({ t, reducedMotion: still(), textKey: step.textKey, playerName: save.playerName, onMenu: showMenu }));
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
      popOptions: { storage: popStorage, ...squeezeOptions() }, onContinue: done, onMenu: showMenu,
    }));
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
    show(createPhoneScrollScreen({ t, sound, seed: flags.seed, reducedMotion: still(), onContinue: done, onMenu: showMenu }));
  }

  /**
   * A customer's intro: portrait, story line, request, the tweezers hint, Start.
   * @param {{chapter: number, n: number, total: number}} step the customer step
   * @returns {void}
   */
  function showIntro(step) {
    const args = L.roundArgs(save, step, flags.seed);
    if (!args) { persist(L.finishStep(save, step)); continueStory(); return; } // no such customer: never in v1 data
    show(createCustomerIntroScreen({
      t, reducedMotion: still(), customer: args.customer, playerName: playerName(), request: describeRequest(args.request),
      step: step.total > 1 ? { n: step.n, total: step.total } : null,
      portrait: facePortrait(args.customer.face, args.seed, t(args.customer.nameKey)),
      hintKey: L.introHintKey(save, step), onStart: () => playRound(step, args), onMenu: showMenu,
    }));
  }

  /**
   * Play one customer in the pop scene; when it ends, pay, save and show the result.
   * @param {{chapter: number, n: number}} step the customer step
   * @param {object} args the startRound arguments (app-logic.js roundArgs)
   * @returns {void}
   */
  function playRound(step, args) {
    clear();
    pop = createPopMode({ t, storage: popStorage, reducedMotion: still(), ...squeezeOptions() });
    pop.mount(root);
    addPopMenuButton(showMenu);
    sound.unlock();
    pop.unlock();
    /** Start (or start again) the round. @returns {void} */
    const start = () => { roundMusic(args.request); pop.startRound({ ...args, customerName: args.customerNameKey ? t(args.customerNameKey) : null, onFinish: (payload) => finishRound(step, payload, start) }); };
    start();
  }

  /**
   * A round ended: Try again starts it afresh; otherwise the result is applied, saved and shown.
   * @param {{chapter: number, n: number}} step the customer step
   * @param {object} payload the onFinish payload
   * @param {() => void} again starts the same round again
   * @returns {void}
   */
  function finishRound(step, payload, again) {
    const out = L.applyRound(save, payload, step);
    if (out.retry) { again(); return; }
    persist(out.save); // the save also lists the milestone strips still to play (B4), so closing the app now loses none
    /** Play the waiting milestone strips once, forget them, then go on. @param {() => void} then what comes after @returns {void} */
    const playWaiting = (then) => playStrips(L.pendingStrips(save), () => { persist(L.clearPendingStrips(save)); then(); });
    if (out.failed) { playWaiting(continueStory); return; } // "Next customer": on with the story
    show(createResultScreen({
      t, reducedMotion: still(), stars: out.stars, payout: out.payout, reputationChange: out.reputationChange,
      factKey: out.factKey, reactionKey: out.reactionKey, playerName: playerName(),
      onContinue: () => playWaiting(continueStory),
      onShop: L.shopOpen(save) ? () => playWaiting(() => showShop(continueStory)) : undefined,
    }));
  }

  /** Free play (SPEC section 6): random faces, the owned tools, never fails, changes no money or stats. @returns {void} */
  function startFreePlay() {
    clear();
    pop = createPopMode({ t, storage: popStorage, reducedMotion: still(), ...squeezeOptions() });
    pop.mount(root);
    addPopMenuButton(showMenu);
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
    }));
  }

  /**
   * The scrub job of a bought studio item (PLACEHOLDER screen until T5.1b). Required: the item shows and its strip
   * plays only after it. Gives +1 reputation.
   * @param {string} itemId the studio item
   * @param {() => void} then what comes after
   * @returns {void}
   */
  function runScrub(itemId, then) {
    show(createScrubScreen({
      t, reducedMotion: still(), itemNameKey: `ui.item.${itemId}.name`,
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
    }));
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
      t, reducedMotion: still(), playerName: save.playerName, settings: save.settings,
      onName: (name) => persist(L.setName(save, name)),
      onToggle: (key, value) => {
        persist(L.setSetting(save, key, value));
        if (key === 'sound') sound.setOn(value);
        if (key === 'music') { sound.setMusicOn(value); sound.unlock(); setMusic({ screen: 'menu' }); }
        if (key === 'reducedMotion') s.node.classList.toggle('app-still', value);
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
      onReset: () => { save = store.reset(); sound.setVolume(save.settings.sfxVolume); music.setVolume(save.settings.musicVolume); boot(); },
      onBack: showMenu,
    }));
  }

  /** The first screen: the name screen on a first start, the title otherwise. @returns {void} */
  function boot() {
    if (!save.playerName) showName();
    else showTitle();
  }

  boot();
  return { get save() { return save; }, store };
}
