// The phone-scroll special mode (T4.6, chapter 4 "Rock bottom"; replaces the Coming soon screen for this chapter).
// 2:42 am on the sofa (as in strip 4): a close-up of her phone, its blue glow on her face, her tea going cold on the side table. A feed of
// cartoon face videos scrolls by on its own (game/phonescroll-logic.js says when); she can only flick slowly (or tap
// Next) and tap the tiny bumps on each video, pop-it style: tiny pops, soft sounds, no score, no money, no failing.
// Likes tick up on the other people's videos, the "videos watched" counter and the phone clock creep up. After the
// last video the idea card ("I could do this for a living") shows, and its Continue calls onContinue (on to strip 4b, the idea at 2:51 am).
// Calm music only: the app plays the calm loop for every screen, and this one never asks for the hectic one.
// Keyboard: the arrow keys move the focus over the bumps and Next, Space or Enter pops the bump or goes to the next
// video. Reduced motion: no auto scroll, no sliding, no steam or pop puffs; the cards change only by Next.
// All text comes from t() (special.phoneScroll.*).

import { el, svg, button, icon, screenShell, INK } from './dom.js';
import { drawCharacter, SKIN, HAIR, tint } from '../game/comic-art.js';
import {
  PHONE, makeFeed, createScroll, currentCard, isIdea, popBump, isPopped, allPopped, advanceDue, canFlick, nextCard,
  watchedCount, clockAt, likesAt, likeText, teaWarmth, teaLine, herMood, moveFocus,
} from '../game/phonescroll-logic.js';

/** How often the screen checks the clock (likes, auto scroll), in ms. */
const TICK_MS = 250;
/** How long the tea's speech bubble stays up (ms). */
const TEA_MS = 3800;
/** How far a finger must flick up (px) to go to the next video. */
const FLICK_PX = 40;
const K = 'special.phoneScroll.';

/**
 * Whether the phone or computer asked for less motion.
 * @returns {boolean} true = calm version
 */
function prefersReducedMotion() {
  try { return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

/**
 * Whether the main pointer can hover (a mouse): then the keyboard line is shown too.
 * @returns {boolean} true on a computer
 */
function hasMouse() {
  try { return Boolean(globalThis.matchMedia?.('(hover: hover)').matches); } catch { return false; }
}

/**
 * A very short buzz on phones that can (the game's vibration switch wraps navigator.vibrate).
 * @param {number} ms how long
 * @returns {void}
 */
function buzz(ms) {
  try { globalThis.navigator?.vibrate?.(ms); } catch { /* not allowed */ }
}

/**
 * The hair of a video face, drawn behind or on top of the head (four simple cartoon shapes).
 * @param {number} style 0 bun, 1 curls, 2 tuft, 3 bob
 * @param {string} color the hair colour
 * @returns {{back: SVGElement|null, front: SVGElement}} the hair behind the face and on top of it
 */
function videoHair(style, color) {
  const ink = { stroke: INK, 'stroke-width': 2.4, 'stroke-linejoin': 'round' };
  if (style === 0) {
    return { back: svg('circle', { cx: 50, cy: 14, r: 11, fill: color, ...ink }),
      front: svg('path', { d: 'M19 46 C17 20 83 20 81 46 C74 30 26 30 19 46Z', fill: color, ...ink }) };
  }
  if (style === 1) {
    const curls = [[22, 36], [30, 24], [42, 18], [56, 17], [69, 22], [78, 34]];
    return { back: null, front: svg('g', {}, curls.map(([x, y]) => svg('circle', { cx: x, cy: y, r: 9, fill: color, ...ink }))) };
  }
  if (style === 2) {
    return { back: null, front: svg('path', { d: 'M24 34 C30 18 44 14 50 22 C52 10 62 12 60 22 C70 18 80 26 76 36 C62 28 40 28 24 34Z', fill: color, ...ink }) };
  }
  return { back: svg('path', { d: 'M14 62 C8 22 92 22 86 62 L80 64 L20 64Z', fill: color, ...ink }),
    front: svg('path', { d: 'M19 44 C20 16 80 16 81 44 C70 32 34 28 19 44Z', fill: color, ...ink }) };
}

/**
 * A cartoon face for one video card (eyes shut, a little smile: they enjoy their pop video). The bumps are buttons
 * laid over it by the screen.
 * @param {{skin: string, hairColor: string, hairStyle: number}} card the video card
 * @returns {SVGElement} the face picture (viewBox 0 0 100 100)
 */
function videoFace(card) {
  const skin = SKIN[card.skin] ?? SKIN.light;
  const hair = videoHair(card.hairStyle, HAIR[card.hairColor] ?? HAIR.brown);
  const ink = { stroke: INK, 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  return svg('svg', { viewBox: '0 0 100 100', class: 'ps-face__art', 'aria-hidden': 'true' }, [
    hair.back,
    svg('ellipse', { cx: 18, cy: 58, rx: 6, ry: 8, fill: tint(skin, -0.08), ...ink }),
    svg('ellipse', { cx: 82, cy: 58, rx: 6, ry: 8, fill: tint(skin, -0.08), ...ink }),
    svg('ellipse', { cx: 50, cy: 55, rx: 32, ry: 36, fill: skin, ...ink }),
    svg('ellipse', { cx: 40, cy: 40, rx: 9, ry: 5, fill: '#fff', opacity: 0.25 }),
    svg('path', { d: 'M33 50 Q38 46 43 50 M57 50 Q62 46 67 50', fill: 'none', ...ink }), // happy shut eyes
    svg('path', { d: 'M48 58 Q50 62 52 58', fill: 'none', ...ink, 'stroke-width': 1.8 }), // nose
    svg('path', { d: 'M42 70 Q50 76 58 70', fill: 'none', ...ink }), // smile
    svg('ellipse', { cx: 30, cy: 62, rx: 5, ry: 3, fill: '#ff8fa8', opacity: 0.45 }),
    svg('ellipse', { cx: 70, cy: 62, rx: 5, ry: 3, fill: '#ff8fa8', opacity: 0.45 }),
    hair.front,
  ]);
}

/**
 * Her cup of tea on the side table: the mug has a little face; it drops as the tea goes cold (steam only above 0.3
 * warmth; in chapter 4 the tea starts at 0.3, already cold, SPEC D32b).
 * @returns {{node: SVGElement, set: (warmth: number) => void}} the mug and how to show its warmth (1 hot .. 0 cold)
 */
function teaMug() {
  const ink = { stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const steam = svg('g', { class: 'ps-steam' }, [0, 1, 2].map((i) => svg('path', {
    d: `M${36 + i * 12} 30 c-6 -7 6 -11 0 -18 c-5 -6 4 -9 1 -14`, fill: 'none', stroke: '#e9eef8', 'stroke-width': 3.2,
    'stroke-linecap': 'round', class: `ps-steam__wisp ps-steam__wisp--${i}`,
  })));
  const body = svg('path', { d: 'M24 38 L28 88 Q30 94 36 94 L64 94 Q70 94 72 88 L76 38Z', fill: '#f2a0c0', ...ink });
  const surface = svg('ellipse', { cx: 50, cy: 38, rx: 26, ry: 6, fill: '#a8673a', ...ink });
  const mouth = svg('path', { d: '', fill: 'none', ...ink, 'stroke-width': 2.6 });
  const shiver = svg('path', { d: 'M14 52 l-6 -3 M14 62 l-7 0 M86 52 l6 -3 M86 62 l7 0', fill: 'none', ...ink, 'stroke-width': 2.2, opacity: 0 });
  const node = svg('svg', { viewBox: '0 0 100 100', class: 'ps-tea__mug', 'aria-hidden': 'true' }, [
    steam,
    svg('path', { d: 'M75 50 C94 48 94 78 72 76', fill: 'none', ...ink, 'stroke-width': 7 }),
    svg('path', { d: 'M75 50 C94 48 94 78 72 76', fill: 'none', stroke: '#f2a0c0', 'stroke-width': 2.6 }),
    body, surface,
    svg('circle', { cx: 42, cy: 62, r: 2.6, fill: INK }), svg('circle', { cx: 58, cy: 62, r: 2.6, fill: INK }),
    mouth, shiver,
  ]);
  return {
    node,
    /** Show how warm the tea is. @param {number} w warmth 1 (steaming) .. 0 (stone cold) @returns {void} */
    set(w) {
      steam.setAttribute('opacity', String(Math.max(0, w - 0.3).toFixed(2)));
      surface.setAttribute('fill', w > 0.5 ? '#a8673a' : w > 0.2 ? '#97735a' : '#8c8a86');
      body.setAttribute('fill', w > 0.2 ? '#f2a0c0' : '#c9d6f0');
      mouth.setAttribute('d', w > 0.6 ? 'M44 72 Q50 77 56 72' : w > 0.25 ? 'M44 74 L56 74' : 'M43 76 Q46 72 50 75 Q54 72 57 76');
      shiver.setAttribute('opacity', w <= 0.12 ? '1' : '0');
    },
  };
}

/**
 * A small phone battery icon (low, of course: it is late).
 * @returns {SVGElement} the icon
 */
function batteryIcon() {
  return svg('svg', { viewBox: '0 0 26 14', class: 'ps-battery', 'aria-hidden': 'true' }, [
    svg('rect', { x: 1, y: 1, width: 21, height: 12, rx: 3, fill: 'none', stroke: '#e9eef8', 'stroke-width': 2 }),
    svg('rect', { x: 23, y: 4.5, width: 2.5, height: 5, rx: 1, fill: '#e9eef8' }),
    svg('rect', { x: 3.5, y: 3.5, width: 4, height: 7, rx: 1.2, fill: '#ff6b6b' }),
  ]);
}

/**
 * Build the phone-scroll screen and start the feed.
 * @param {{t: (key: string, vars?: object) => string, sound?: {play: (name: string) => boolean}, seed?: number|null,
 *   reducedMotion?: boolean, onContinue?: () => void, onMenu?: () => void}} o t = string function; sound = the app's
 *   sound player (for the tiny pops); seed = the feed's seed (test runs; else random); reducedMotion = the player's
 *   calm switch; onContinue = Continue on the idea card; onMenu = the Menu button
 * @returns {{node: HTMLElement, dispose: () => void}} the screen
 */
export function createPhoneScrollScreen({ t, sound, seed = null, reducedMotion = false, onContinue, onMenu }) {
  /** Calm version: the player's switch or the phone's. @returns {boolean} true = less motion */
  const still = () => reducedMotion === true || prefersReducedMotion();
  const shell = screenShell('phonescroll', { label: t(`${K}region`), reducedMotion: still() });
  const { node, signal } = shell;
  node.classList.add('ps');
  if (still()) node.classList.add('ps--still');
  const feed = makeFeed(Number.isFinite(seed) ? seed : Math.floor(Math.random() * 1e9));
  /** The time now in seconds. @returns {number} seconds */
  const now = () => performance.now() / 1000;
  let s = createScroll(feed, now());
  let disposed = false;
  let continued = false;
  let teaTimer = 0;
  let mood = '';

  // The head: Menu, the title, the "videos watched" counter.
  const head = el('header', 'ps-head');
  if (onMenu) head.append(button('app-btn app-btn--small ps-menu', t('ui.pop.menu'), () => onMenu(), signal));
  const count = el('p', 'ps-count');
  count.setAttribute('aria-live', 'polite');
  head.append(el('h1', 'ps-title', t(`${K}title`)), count);

  // Her face in the phone's glow.
  const her = el('div', 'ps-her');
  const herArt = svg('svg', { class: 'ps-her__art', 'aria-hidden': 'true' });
  her.append(herArt, el('div', 'ps-her__glow'));

  // The phone: a status bar (clock, battery) and the feed (a track of cards that slides up).
  const phone = el('div', 'ps-phone');
  const status = el('div', 'ps-status');
  const clock = el('span', 'ps-clock');
  status.append(clock, batteryIcon());
  const screenEl = el('div', 'ps-screen');
  const track = el('div', 'ps-track');
  screenEl.append(track);
  phone.append(status, screenEl);

  // The side table with the tea, and the foot: the how-to line and Next.
  const side = el('div', 'ps-side');
  const tea = el('div', 'ps-tea');
  tea.setAttribute('role', 'img');
  tea.setAttribute('aria-label', t(`${K}tea`));
  const mug = teaMug();
  const teaBubble = el('p', 'ps-tea__bubble');
  teaBubble.setAttribute('aria-live', 'polite');
  teaBubble.hidden = true;
  tea.append(teaBubble, mug.node, el('div', 'ps-tea__stand'));
  const foot = el('div', 'ps-foot');
  const howto = el('p', 'ps-howto', t(still() ? `${K}howtoStill` : `${K}howto`));
  if (hasMouse()) howto.append(' ', el('span', 'ps-howto__keys', t(`${K}howtoKeys`)));
  const next = button('app-btn app-btn--small ps-next', t(`${K}next`), () => tryNext(), signal);
  foot.append(howto, next);
  side.append(tea, foot);

  const room = el('div', 'ps-room');
  room.append(her, phone, side);
  node.append(head, room);

  // The cards. Each video card: the face with its bump buttons, a progress line, the handle, caption and likes.
  const cards = feed.map((card, i) => {
    const c = el('article', `ps-card ps-card--${card.kind}`);
    c.inert = i !== 0;
    if (card.kind === 'idea') {
      const go = button('app-btn app-btn--main ps-idea__go', t(`${K}continue`), () => {
        if (continued) return;
        continued = true;
        onContinue?.();
      }, signal);
      const bulb = el('div', 'ps-idea__bulb');
      bulb.append(icon('bulb'));
      c.append(el('p', 'ps-idea__slot', t(`${K}ideaSlot`)), bulb, el('h2', 'ps-idea__title', t(`${K}ideaTitle`)),
        el('p', 'ps-idea__text', t(`${K}ideaText`)), go);
      return { node: c, bumps: [], likes: null, go };
    }
    const handle = t(`${K}handle${card.handle}`);
    const caption = t(`${K}caption${card.caption}`);
    c.setAttribute('aria-label', t(`${K}videoLabel`, { handle, caption }));
    const video = el('div', 'ps-video');
    const face = el('div', 'ps-face');
    face.append(videoFace(card));
    const bumps = card.bumps.map((b, n) => {
      const btn = button('ps-bump', '', () => pop(i, n, btn), signal);
      btn.style.left = `${b.x * 100}%`;
      btn.style.top = `${b.y * 100}%`;
      btn.style.setProperty('--ps-r', `${(b.r * 2 / 0.17) * 100}%`); // the dot's size inside a hit area 17% of the face wide
      btn.setAttribute('aria-label', t(`${K}bump`, { n: n + 1 }));
      btn.append(el('span', 'ps-bump__dot'));
      face.append(btn);
      return btn;
    });
    video.append(face, el('div', 'ps-progress'));
    const meta = el('div', 'ps-meta');
    const words = el('div', 'ps-meta__words');
    words.append(el('p', 'ps-handle', handle), el('p', 'ps-caption', caption));
    const like = el('p', 'ps-like');
    like.append(icon('heart'));
    const likes = el('span', 'ps-like__n');
    like.append(likes);
    meta.append(words, like);
    c.append(video, meta);
    return { node: c, bumps, likes, go: null };
  });
  for (const c of cards) track.append(c.node);

  /**
   * Pop one tiny bump on the card on show: a soft pop, the bump goes flat, a little puff.
   * @param {number} cardIndex the card the bump is on
   * @param {number} n the bump on that card
   * @param {HTMLButtonElement} btn its button
   * @returns {void}
   */
  function pop(cardIndex, n, btn) {
    if (cardIndex !== s.index || isPopped(s, n)) return;
    s = popBump(s, n, now());
    btn.classList.add('ps-bump--popped');
    btn.setAttribute('aria-label', t(`${K}bumpPopped`, { n: n + 1 }));
    if (!still()) {
      const puff = el('span', 'ps-bump__puff');
      btn.append(puff);
      setTimeout(() => puff.remove(), 600);
    }
    sound?.play?.('pop_small');
    buzz(8);
  }

  /** Show her face for the card on show (redrawn only when her mood changes). @returns {void} */
  function drawHer() {
    const want = herMood(s.index, feed.length);
    if (want === mood) return;
    mood = want;
    herArt.replaceChildren(drawCharacter('heroine', { x: 0, y: 0, scale: 1, pose: 'bust', outfit: 'pajamas', expr: want, look: 1 }).node);
    try { // fit the view round her head and shoulders (getBBox needs the picture on the page)
      const b = herArt.getBBox();
      if (b.width > 0) herArt.setAttribute('viewBox', `${b.x - 10} ${b.y - 10} ${b.width + 20} ${Math.min(b.height, b.width * 1.05) + 10}`);
      else mood = ''; // not laid out yet: try again later
    } catch { /* not on the page yet: drawn again on the next card */ mood = ''; }
  }

  /** Show the card on show: the slide, the counter and clock, the tea, her face. @returns {void} */
  function showCard() {
    track.style.transform = `translateY(${-s.index * 100}%)`;
    cards.forEach((c, i) => { c.node.inert = i !== s.index; });
    count.textContent = t(`${K}watched`, { n: watchedCount(s.index) });
    clock.textContent = t(`${K}clock`, clockAt(s.index));
    mug.set(teaWarmth(s.index, feed.length));
    const line = teaLine(s.index);
    if (line !== null) {
      teaBubble.textContent = t(`${K}tea${line}`);
      teaBubble.hidden = false;
      clearTimeout(teaTimer);
      teaTimer = setTimeout(() => { teaBubble.hidden = true; }, TEA_MS);
    }
    node.classList.toggle('ps--idea', isIdea(s));
    next.hidden = isIdea(s);
    drawHer();
    updateLikes();
  }

  /** Tick the likes on the video on show. @returns {void} */
  function updateLikes() {
    const card = currentCard(s);
    const likes = cards[s.index].likes;
    if (card.kind !== 'video' || !likes) return;
    const { key, n } = likeText(likesAt(card, now() - s.shownAt));
    likes.textContent = t(`${K}${key}`, { n });
  }

  /**
   * Go to the next card; the keyboard focus follows if it was in the phone or on Next.
   * @returns {void}
   */
  function advance() {
    const active = node.ownerDocument.activeElement;
    const hadFocus = phone.contains(active) || active === next;
    s = nextCard(s, now());
    showCard();
    if (hadFocus) {
      const c = cards[s.index];
      (c.go ?? c.bumps[0] ?? next).focus({ preventScroll: true });
    }
  }

  /** A flick up, a wheel turn or Next: the next video, but only slowly. @returns {void} */
  function tryNext() {
    if (canFlick(s, now())) advance();
  }

  /**
   * Keys: the arrows move the focus over the bumps on the card and Next (Space and Enter press the focused button).
   * @param {KeyboardEvent} e the key
   * @returns {void}
   */
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const c = cards[s.index];
    const list = c.go ? [c.go] : [...c.bumps, next];
    const to = moveFocus(list.indexOf(node.ownerDocument.activeElement), list.length, e.key);
    if (to === null) return;
    e.preventDefault();
    list[to].focus({ preventScroll: true });
  }

  let flickY = null; // where a finger came down on the phone screen (px), null when none
  screenEl.addEventListener('pointerdown', (e) => { flickY = e.clientY; }, { signal, passive: true });
  screenEl.addEventListener('pointerup', (e) => {
    if (flickY !== null && flickY - e.clientY > FLICK_PX) tryNext();
    flickY = null;
  }, { signal, passive: true });
  screenEl.addEventListener('pointercancel', () => { flickY = null; }, { signal, passive: true });
  screenEl.addEventListener('wheel', (e) => { if (e.deltaY > 20) tryNext(); }, { signal, passive: true });
  node.addEventListener('keydown', onKey, { signal });

  /** Every quarter second: the likes tick, and the feed moves on by itself when it is time (not in the calm version). @returns {void} */
  function tick() {
    if (disposed) return;
    updateLikes();
    if (!still() && advanceDue(s, now())) advance();
    if (isIdea(s)) clearInterval(timer);
  }
  const timer = setInterval(tick, TICK_MS);

  showCard();
  requestAnimationFrame(() => {
    if (disposed) return;
    if (!mood) drawHer();
    (cards[0].bumps[0] ?? next).focus({ preventScroll: true });
  });
  // Debug and smoke-test hook: where the feed is.
  node.phoneDebug = () => ({ index: s.index, watched: watchedCount(s.index), idea: isIdea(s), done: allPopped(s), cards: feed.length, dwell: PHONE.dwell });

  return {
    node,
    /** Stop the clock and take the screen away. @returns {void} */
    dispose() {
      disposed = true;
      clearInterval(timer);
      clearTimeout(teaTimer);
      shell.dispose();
    },
  };
}
