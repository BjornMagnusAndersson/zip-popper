// Pop effects test page, variant C: Slow-mo close-up. A look-and-feel test only (see popfx/shared.js for the hooks).
import { INK, KIND, CALM, smooth, clamp, backOut, later, buzz, tone, hiss, W, H, sc, face, bp, holdId, T, realT, popReal, drops, squirt, drawWorld, drawRing } from './shared.js';

/** The slow-motion pop (C): a deep, stretched-out wet "bloop" with a slow splash. @param {boolean} big the big bump @returns {void} */
function slowPop(big) {
  tone(big ? 175 : 235, big ? 44 : 60, 0, 0.55, 0.42);
  tone(big ? 120 : 150, big ? 52 : 70, 0.03, 0.4, 0.16, 'triangle');
  hiss(0, 0.5, { type: 'lowpass', f0: 760, f1: 160, vol: 0.2 });
}

/** The soft "whoom" as the close-up bubble opens (C). @returns {void} */
function whoom() {
  hiss(0, 0.38, { type: 'bandpass', f0: 1100, f1: 260, q: 0.9, vol: 0.07, attack: 0.14 });
}

/** C: slow-mo close-up. A round magnifier bubble opens above the finger, the pop plays big and slow in it, then it shrinks away. @returns {object} the variant */
function makeC() {
  const big = KIND === 'big';
  const Z = big ? 2.1 : 2.7; // how much the bubble magnifies
  let open = 0; // the bubble, 0 = shut, 1 = open
  let place = null;
  let whoomed = false;
  let popAt = -1;
  return {
    /** Slow motion for a second after the pop, then back to normal speed. @returns {number} time rate */
    rate() {
      if (popReal < 0) return 1;
      const t = realT - popReal;
      const slow = CALM ? 0.35 : 0.2;
      return t < 1 ? slow : t < 1.4 ? slow + (1 - slow) * smooth((t - 1) / 0.4) : 1;
    },
    /** Open the bubble while the squeeze gets serious, keep it for the slow pop, then shut it. @param {number} sdt scene seconds @param {number} dt real seconds @returns {void} */
    step(sdt, dt) {
      if (!place) place = bubblePlace();
      const want = bp.popped ? realT - popReal < 2.0 : holdId !== null && bp.pressure >= 0.5;
      if (want && !whoomed) { whoomed = true; whoom(); }
      open = want ? Math.min(1, open + dt / 0.2) : Math.max(0, open - dt / 0.25);
    },
    /** A juicy spurt (more and thicker goo than the game), a flash ring, a slowed-down sound and a buzz. @returns {void} */
    pop() {
      popAt = T;
      // the worms go out over the cheek and down, never up across her glasses and eyes
      const ang = bp.x >= face.cx ? 0.55 : Math.PI - 0.55;
      squirt(bp, { strands: big ? 3 : 2, reach: 1.4, width: 1.35, drops: big ? 22 : 14, speed: 1.15, size: 1.35, ang, spread: 0.9 });
      slowPop(big);
      later(0.6, 'squelch');
      buzz(big ? [40, 30, 90] : [20, 30, 45]);
    },
    /** The flash ring at the pop (seen in the bubble too). @param {CanvasRenderingContext2D} c context @param {object} p bump @returns {void} */
    over(c, p) {
      if (popAt >= 0) drawRing(c, p, T - popAt, 0.35, 2.2);
    },
    /** The magnifier bubble over the scene. @param {CanvasRenderingContext2D} c context @returns {void} */
    screen(c) {
      if (open > 0.01 && place) drawBubble(c, place, open, Z);
    },
  };
}

/** Where the close-up bubble goes: above the bump with a gap for the finger, or beside it when there is no room above. @returns {{x: number, y: number, R: number}} the spot */
function bubblePlace() {
  const R = Math.round(Math.min(W, H) * 0.3);
  const gap = 64; // keeps the bubble clear of a fingertip on the bump
  let x = clamp(bp.x - R * 0.3, R + 8, W - R - 8);
  let y = bp.y - gap - R;
  if (y - R < 6) { // no room above (a sideways phone): beside it, towards the middle of the screen
    const side = bp.x > W / 2 ? -1 : 1;
    x = clamp(bp.x + side * (gap + R), R + 8, W - R - 8);
    y = clamp(bp.y - R * 0.45, R + 6, H - R - 6);
  }
  return { x, y, R };
}

/**
 * The close-up bubble (C): callout lines from the bump, a soft shadow, the scene drawn again zoomed in, a glass glare and a cream rim with an ink edge.
 * @param {CanvasRenderingContext2D} c context (screen px)
 * @param {{x: number, y: number, R: number}} place where
 * @param {number} open 0..1 how far open
 * @param {number} Z zoom
 * @returns {void}
 */
function drawBubble(c, place, open, Z) {
  const k = CALM ? open : backOut(open);
  const R = place.R * k;
  if (R < 2) return;
  const { x, y } = place;
  const dx = x - bp.x;
  const dy = y - bp.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d;
  const ny = dx / d;
  const rr = bp.r * 1.9;
  c.save();
  c.globalAlpha = Math.min(1, open * 1.4);
  c.lineCap = 'round';
  for (const [col, lw] of [['rgba(255,253,240,0.9)', 5], [INK, 2]]) { // callout lines and the ring round the bump
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.beginPath();
    c.moveTo(bp.x + nx * rr, bp.y + ny * rr); c.lineTo(x + nx * R, y + ny * R);
    c.moveTo(bp.x - nx * rr, bp.y - ny * rr); c.lineTo(x - nx * R, y - ny * R);
    c.stroke();
    c.beginPath(); c.arc(bp.x, bp.y, rr, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
  c.fillStyle = 'rgba(30,20,10,0.25)';
  c.beginPath(); c.arc(x + 4, y + 7, R + 5, 0, Math.PI * 2); c.fill();
  c.save();
  c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.clip();
  c.fillStyle = '#bcdcd6';
  c.fillRect(x - R, y - R, R * 2, R * 2);
  c.translate(x, y);
  c.scale(Z, Z);
  c.translate(-bp.x, -bp.y);
  drawWorld(c);
  c.restore();
  c.save();
  c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.clip();
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.beginPath(); c.ellipse(x - R * 0.42, y - R * 0.5, R * 0.45, R * 0.18, -0.6, 0, Math.PI * 2); c.fill();
  c.restore();
  c.lineWidth = Math.max(5, 6 * sc);
  c.strokeStyle = '#fffaf0';
  c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 2.6;
  c.strokeStyle = INK;
  c.beginPath(); c.arc(x, y, R + c.lineWidth * 0 + Math.max(5, 6 * sc) / 2, 0, Math.PI * 2); c.stroke();
}

export default { id: 'C', name: 'Slow-mo close-up', make: makeC };
