// Short timers that stand still while the round is paused (B106(2)). The pop scene (pop-mode.js) uses them for the
// "Ow!" and giggle bubbles, the wince and giggle faces and the last-moment end-of-round timers, so that while the Field
// guide (or a hidden page) pauses the round, each keeps the time it had left and goes on from there afterwards.
// No DOM, so it can be tested in Node (tests/pause.test.mjs).

/**
 * A set of one-shot timers that can all be paused and resumed together.
 * @param {{now?: () => number, set?: (f: () => void, ms: number) => unknown, clear?: (id: unknown) => void}} [o] the
 *   clock in ms and the timer functions (left out = performance.now, setTimeout and clearTimeout; stand-ins in tests)
 * @returns {{later: (fn: () => void, ms: number) => object, cancel: (timer: unknown) => void,
 *   setPaused: (on: boolean) => void, paused: () => boolean, size: () => number, clear: () => void}} later = run fn
 *   after ms (paused time not counted), returns the timer; cancel = stop one (anything else is ignored, so an old 0 is
 *   fine); setPaused = stand still or go on; size = how many are waiting; clear = stop them all
 */
export function createPauseTimers({
  now = () => performance.now(), set = (f, ms) => setTimeout(f, ms), clear = (id) => clearTimeout(id),
} = {}) {
  const live = new Set();
  let paused = false;

  /** Start (or restart) a timer's wait for the time it has left. @param {object} timer @returns {void} */
  function arm(timer) {
    timer.at = now();
    timer.id = set(() => fire(timer), Math.max(0, timer.left));
  }

  /** A timer's wait is over: forget it and run its job. @param {object} timer @returns {void} */
  function fire(timer) {
    if (!live.has(timer)) return;
    live.delete(timer);
    timer.id = 0;
    timer.fn();
  }

  return {
    /** Run fn after ms (time spent paused is not counted). @param {() => void} fn @param {number} ms @returns {object} the timer */
    later(fn, ms) {
      const timer = { fn, left: Math.max(0, Number(ms) || 0), at: 0, id: 0 };
      live.add(timer);
      if (!paused) arm(timer);
      return timer;
    },
    /** Stop one timer before it runs (anything that is not a waiting timer is ignored). @param {unknown} timer @returns {void} */
    cancel(timer) {
      if (!live.has(timer)) return;
      live.delete(timer);
      if (timer.id) clear(timer.id);
      timer.id = 0;
    },
    /** Stand still (each timer keeps the time it has left) or go on. @param {boolean} on @returns {void} */
    setPaused(on) {
      if (Boolean(on) === paused) return;
      paused = Boolean(on);
      const t = now();
      for (const timer of live) {
        if (paused) {
          if (timer.id) clear(timer.id);
          timer.id = 0;
          timer.left = Math.max(0, timer.left - (t - timer.at));
        } else arm(timer);
      }
    },
    /** Whether the timers stand still now. @returns {boolean} */
    paused: () => paused,
    /** How many timers are waiting. @returns {number} */
    size: () => live.size,
    /** Stop every timer (the scene goes away). @returns {void} */
    clear() {
      for (const timer of live) if (timer.id) clear(timer.id);
      live.clear();
    },
  };
}
