// Developer page: short test comic strips that show the light, smoke and particle effects (js/dev/fx/*.js, see
// fx-test.html) in story moments: a boss entrance, Prom Penny's party day, the Unicorn zit teaser, the scrub job payoff
// and a great day. Look only; the game is not changed. The strips are in js/dev/fxstrips/strips-*.js, the player in
// js/dev/fxstrips/player.js. The bubbles' English text lives in those strip files (a developer page, B25).
// Address options: ?strip=<id> (horn, prom, unicorn, scrub, great), &still (reduced motion: nothing moves; a phone set
// to reduce motion starts still, &motion ignores that), &lite (half the particles, pixel ratio 1), &step=<n> (jump
// ahead n taps), &shot (a pretend clock for screenshots: window.__fx.run(ms) moves time on).
// Tap, Space, Enter or the Right arrow: next beat. Replay starts the strip again.
import { loadStrings } from '../core/strings.js';
import disco from './fx/disco.js';
import smoke from './fx/smoke.js';
import dust from './fx/dust.js';
import shine from './fx/shine.js';
import lamps from './fx/lamps.js';
import mood from './fx/mood.js';
import spotlight from './fx/spotlight.js';
import bokeh from './fx/bokeh.js';
import confetti from './fx/confetti.js';
import steam from './fx/steam.js';
import reveal from './fx/reveal.js';
import coins from './fx/coins.js';
import { STRIP_EFFECTS } from './fxstrips/effects.js';
import { createPlayer } from './fxstrips/player.js';
import { makeKit } from './fxstrips/kit.js';
import { STRIPS } from './fxstrips/strips.js';

const params = new URLSearchParams(location.search);
const SHOT = params.has('shot');
const realNow = performance.now.bind(performance); // the real clock, kept for the frame cost even in shot mode
const fakeClock = SHOT ? installFakeClock() : null;

/**
 * Shot mode: a pretend clock. requestAnimationFrame and performance.now follow window.__fx.run(ms) instead of real
 * time, so a screenshot always shows the same moment (the same as the light test page's).
 * @returns {{run: (ms: number) => void}} the clock
 */
function installFakeClock() {
  let vt = 1000;
  let nextId = 1;
  const queue = new Map();
  performance.now = () => vt;
  window.requestAnimationFrame = (cb) => { const id = nextId; nextId += 1; queue.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { queue.delete(id); };
  return {
    /** Move the pretend time on by ms, one 16 ms frame at a time. @param {number} ms milliseconds @returns {void} */
    run(ms) {
      for (let done = 0; done < ms; done += 16) {
        vt += 16;
        const due = [...queue.values()];
        queue.clear();
        for (const cb of due) { try { cb(vt); } catch (e) { console.error(e); } }
      }
    },
  };
}

let still = params.has('still');
try { still = still || (!params.has('motion') && Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)); } catch { /* no setting */ }
const lite = params.has('lite');
if (still) document.body.classList.add('comic--still');
if (SHOT) document.body.classList.add('shot');

const EFFECTS = Object.fromEntries([disco, smoke, dust, shine, lamps, mood, spotlight, bokeh, confetti, steam, reveal, coins, ...STRIP_EFFECTS].map((m) => [m.id, m]));
const stage = document.getElementById('stage');
const titleEl = document.getElementById('title');
const pickEl = document.getElementById('pick');
const endEl = document.getElementById('end');
const endText = document.getElementById('end-text');
const msEl = document.getElementById('ms');
let current = STRIPS.find((s) => s.id === params.get('strip')) ?? STRIPS[0];

await loadStrings('en'); // the studio sign's painted word comes from the string table
const player = createPlayer({ stage, kit: makeKit(), effects: EFFECTS, still, lite, now: realNow, onEnd: showEnd });

/** Show the end card: the strip's last line, Replay and the next strip. @returns {void} */
function showEnd() {
  endText.textContent = current.endText ?? 'The end';
  endEl.hidden = false;
  document.getElementById('b-again').focus();
}

/** Play a strip from the start and mark its button. @param {object} s the strip @returns {void} */
function play(s) {
  current = s;
  endEl.hidden = true;
  titleEl.textContent = s.title;
  for (const b of pickEl.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.strip === s.id));
  const q = new URLSearchParams(location.search);
  q.set('strip', s.id);
  q.delete('step');
  try { history.replaceState(null, '', `?${q.toString().replace(/=(&|$)/g, '$1')}`); } catch { /* not allowed: fine */ }
  player.play(s);
}

/** One tap further (ignored while the end card shows). @returns {void} */
function next() {
  if (!endEl.hidden) return;
  player.next();
}

// The strip picker: one button per strip.
for (const s of STRIPS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.strip = s.id;
  b.textContent = s.short;
  b.title = s.title;
  b.addEventListener('click', () => play(s));
  pickEl.append(b);
}
document.getElementById('b-replay').addEventListener('click', () => play(current));
document.getElementById('b-again').addEventListener('click', () => play(current));
document.getElementById('b-next').addEventListener('click', () => play(STRIPS[(STRIPS.indexOf(current) + 1) % STRIPS.length]));
stage.addEventListener('click', (e) => { if (!e.target.closest('button')) next(); });
document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('button') && (e.key === 'Enter' || e.key === ' ')) return; // the button handles it
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); next(); }
});
let resizeTimer = 0;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => player.relayout(), 150); });

let last = -1;
let fpsFrames = 0;
let fpsSince = realNow();
/** One animation frame: the player's current panel moves on and is painted; the cost readout once a second. @param {number} ms time stamp @returns {void} */
function frame(ms) {
  requestAnimationFrame(frame);
  const now = ms / 1000;
  const dt = last < 0 ? 0 : Math.min(0.05, Math.max(0, now - last));
  last = now;
  player.tick(dt);
  fpsFrames += 1;
  const rn = realNow();
  if (rn - fpsSince >= 1000) {
    msEl.textContent = `${Math.round((fpsFrames * 1000) / (rn - fpsSince))} fps ${player.state().ms.toFixed(1)} ms`;
    fpsFrames = 0;
    fpsSince = rn;
  }
}

play(current);
for (let i = 0; i < Number(params.get('step') ?? 0); i += 1) player.next();
requestAnimationFrame(frame);

window.__fx = {
  /** Move the pretend clock on (shot mode only). @param {number} ms milliseconds @returns {void} */
  run(ms) { fakeClock?.run(ms); },
  /** What is shown and how fast it runs. @returns {object} state */
  state: () => ({ ...player.state(), end: !endEl.hidden, still, lite }),
  /** One tap further. @returns {void} */
  next,
  /** Play a strip by id. @param {string} id strip id @returns {void} */
  play(id) { const s = STRIPS.find((x) => x.id === id); if (s) play(s); },
  /** The strips' ids and beat counts. @returns {object[]} list */
  strips: () => STRIPS.map((s) => ({ id: s.id, beats: s.panels.reduce((n, p) => n + Math.max(1, p.beats?.length ?? 0), 0) })),
  /** Forget the frame costs so far (before a timing run). @returns {void} */
  resetCost() { player.resetCost(); },
  ready: true,
};
