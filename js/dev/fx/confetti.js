// Effect 8 for the light test page (fx-test.html): confetti and petals, over everything (screen space). Fire, the
// 1st, 3rd, 5th time: a celebration burst from two party poppers at the bottom corners: paper rectangles and little
// ribbon curls that flutter as they fall (one side squashes while they turn, the back shows darker, a flash when one
// faces the light), long curly streamers, and a few cartoon stars with an ink outline. The 2nd, 4th time: a soft
// petal shower from the top (pink blossom petals tumbling and swaying). For 3-star results, Master diplomas, boss
// wins, strip endings. Idle: a light sprinkle from the top now and then (petals in the spa, tier 2).
// Still: nothing moves; Fire shows the pieces softly where they would hang and fades them away. Lite: half the pieces.
// See the README in core.js for the effect interface.
import { clamp, smooth, TAU } from './sprites.js';

const INK = '#2a211d';
const PAPER = ['255,92,170', '255,214,64', '64,214,200', '84,150,255', '170,110,255', '255,150,64', '120,220,110'];
const PETALS = [['255,214,228', '236,120,170'], ['255,196,216', '226,96,150'], ['255,238,244', '244,160,196']];

/** A colour "r,g,b" times k (darker below 1), as rgb(). @param {string} rgb colour @param {number} k factor @param {number} [white] 0..1 mixed toward white @returns {string} css colour */
function shade(rgb, k, white = 0) {
  const [r, g, b] = rgb.split(',').map((v) => clamp(Number(v) * k, 0, 255));
  return `rgb(${Math.round(r + (255 - r) * white)},${Math.round(g + (255 - g) * white)},${Math.round(b + (255 - b) * white)})`;
}

/**
 * Paint a five-point cartoon star (gold, a lighter top, an ink outline) into its sprite.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w size
 * @returns {void}
 */
function paintStar(c, w) {
  const m = w / 2;
  const R = w * 0.42;
  c.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? R * 0.48 : R;
    if (i) c.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r); else c.moveTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
  }
  c.closePath();
  const g = c.createLinearGradient(0, m - R, 0, m + R);
  g.addColorStop(0, '#fff2a0');
  g.addColorStop(0.5, '#ffd23f');
  g.addColorStop(1, '#f4a628');
  c.fillStyle = g;
  c.lineJoin = 'round';
  c.lineWidth = w * 0.07;
  c.strokeStyle = INK;
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.8)'; // a small shine
  c.beginPath(); c.ellipse(m - R * 0.18, m - R * 0.32, R * 0.12, R * 0.2, -0.5, 0, TAU); c.fill();
}

/**
 * Paint one blossom petal (a soft teardrop with a little notch at its round end), light at the tip, deeper at the base.
 * @param {CanvasRenderingContext2D} c the sprite's context
 * @param {number} w width
 * @param {number} h height
 * @param {string[]} pair [light, deep] colours "r,g,b"
 * @returns {void}
 */
function paintPetal(c, w, h, pair) {
  c.beginPath();
  c.moveTo(w * 0.5, h * 0.96);
  c.bezierCurveTo(w * 0.02, h * 0.72, w * 0.04, h * 0.14, w * 0.36, h * 0.06);
  c.quadraticCurveTo(w * 0.5, h * 0.2, w * 0.64, h * 0.06);
  c.bezierCurveTo(w * 0.96, h * 0.14, w * 0.98, h * 0.72, w * 0.5, h * 0.96);
  c.closePath();
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgb(${pair[0]})`);
  g.addColorStop(1, `rgb(${pair[1]})`);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = `rgba(${pair[1]},0.9)`;
  c.lineWidth = Math.max(0.8, w * 0.05);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.55)'; // a light vein down the middle
  c.beginPath(); c.moveTo(w * 0.5, h * 0.88); c.quadraticCurveTo(w * 0.44, h * 0.5, w * 0.5, h * 0.24); c.stroke();
}

/**
 * Make the confetti for this scene.
 * @param {object} env the page's env (see core.js README)
 * @returns {object} hooks
 */
function make(env) {
  const { W, H, sc, still, dpr } = env;
  const spa = env.tier === 2 && !env.party;
  const star = env.sprite('confetti-star', 32, 32, (c, w) => paintStar(c, w));
  const petals = PETALS.map((pair, i) => env.sprite(`petal:${i}`, 20, 24, (c, w, h) => paintPetal(c, w, h, pair)));
  const g = H * 0.62; // gravity, px/s²
  const pieces = [];
  const streamers = [];
  let fired = 0;
  let sprinkle = 0; // seconds to the next idle piece
  let stillFade = -1; // still mode: seconds since Fire (the pieces fade in and out)
  if (still) { // a calm still frame: a few pieces hanging in the air
    for (let i = 0, n = env.count(12); i < n; i += 1) {
      const p = piece(spa ? 'petal' : env.rand() < 0.25 ? 'curl' : 'rect', env.rand() * W, H * (0.04 + env.rand() * 0.85), 0, 0);
      p.calm = true;
      p.age = 1;
      pieces.push(p);
    }
  }
  /**
   * One paper piece (rect, curl or star) or petal, with its colours worked out once.
   * @param {string} kind 'rect' | 'curl' | 'star' | 'petal'
   * @param {number} x start x
   * @param {number} y start y
   * @param {number} vx speed x
   * @param {number} vy speed y
   * @returns {object} the piece
   */
  function piece(kind, x, y, vx, vy) {
    const rgb = PAPER[Math.floor(env.rand() * PAPER.length)];
    const petal = kind === 'petal';
    const size = (petal ? 12 + env.rand() * 6 : kind === 'star' ? 11 + env.rand() * 5 : kind === 'curl' ? 4.5 + env.rand() * 2 : 4 + env.rand() * 2.6) * sc;
    return {
      kind, x, y, vx, vy, age: 0,
      w: kind === 'rect' ? size * (1.6 + env.rand() * 0.8) : size, h: size,
      rot: env.rand() * TAU, vr: (env.rand() - 0.5) * (petal ? 2.5 : 7),
      flip: env.rand() * TAU, vf: (petal ? 2 : 6) + env.rand() * (petal ? 2.5 : 8),
      sway: (petal ? 34 : 22 + env.rand() * 26) * sc, sw: (petal ? 1.1 : 2.6) + env.rand() * 2, ph: env.rand() * TAU,
      drag: petal ? 3.6 : kind === 'star' ? 2.3 : 2.9, fall: petal ? 0.45 : 1,
      front: shade(rgb, 1), back: shade(rgb, 0.62), shine: shade(rgb, 1, 0.5),
      img: petal ? petals[Math.floor(env.rand() * petals.length)] : null,
      a: 1,
    };
  }

  /** Move a piece on: gravity, air drag, a side-to-side flutter that grows as it slows, turning. @param {object} p piece @param {number} dt seconds @returns {void} */
  function move(p, dt) {
    p.age += dt;
    const drag = Math.exp(-p.drag * dt);
    p.vx *= drag;
    p.vy = p.vy * drag + g * p.fall * dt;
    const calm = smooth(1 - Math.min(1, Math.hypot(p.vx, p.vy) / (H * 0.9))); // flutters once the burst has slowed
    p.x += (p.vx + Math.cos(p.age * p.sw + p.ph) * p.sway * calm) * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    p.flip += p.vf * dt;
  }

  /** A burst from the two bottom corners, up and inward: paper, curls, stars and streamers. @returns {void} */
  function burst() {
    const wide = clamp((W / H) * 0.9, 1, 2.6); // on a sideways screen the poppers throw further inward
    for (const side of [-1, 1]) {
      const ox = side < 0 ? W * 0.02 : W * 0.98;
      const oy = H * 1.01;
      for (let i = 0, n = env.count(62); i < n; i += 1) {
        const a = -Math.PI / 2 - side * (0.06 + env.rand() * 0.5); // radians from straight up, leaning inward
        const v = H * (2.4 + env.rand() * 1.3);
        const r = env.rand();
        const kind = r < 0.07 ? 'star' : r < 0.3 ? 'curl' : 'rect';
        const p = piece(kind, ox, oy, Math.cos(a) * v * wide, Math.sin(a) * v);
        p.age = -env.rand() * 0.12; // not all at once
        pieces.push(p);
      }
      for (let i = 0, n = env.count(4); i < n; i += 1) {
        const a = -Math.PI / 2 - side * (0.1 + env.rand() * 0.4);
        const v = H * (2.6 + env.rand() * 1);
        streamers.push({
          x: ox, y: oy, vx: Math.cos(a) * v * wide, vy: Math.sin(a) * v, age: -i * 0.04, pts: [],
          rgb: PAPER[Math.floor(env.rand() * PAPER.length)], ph: env.rand() * TAU, sway: (40 + env.rand() * 30) * sc, a: 1,
        });
      }
    }
  }

  /** A soft petal shower from above the top edge, staggered over a second and a half. @returns {void} */
  function petalShower() {
    for (let i = 0, n = env.count(44); i < n; i += 1) {
      const p = piece('petal', env.rand() * W * 1.1 - W * 0.05, -20 * sc - env.rand() * H * 0.15, (env.rand() - 0.5) * 40 * sc, 20 * sc + env.rand() * 50 * sc);
      p.age = -env.rand() * 1.5;
      pieces.push(p);
    }
  }

  /** Still mode: put Fire's pieces where they would hang mid-fall, without moving them (they fade in and out). @returns {void} */
  function settleAll() {
    for (const p of pieces) {
      if (p.calm) continue;
      p.soft = true;
      p.x = env.rand() * W;
      p.y = env.rand() * H * (p.kind === 'petal' ? 0.95 : 0.8) + H * 0.04;
      p.vx = 0;
      p.vy = 0;
      p.age = 1;
    }
    streamers.length = 0;
  }

  /** Draw one piece: turned, squashed on one axis as it flips (the back darker), stars and petals from sprites. @param {CanvasRenderingContext2D} c context @param {object} p piece @param {number} fade alpha @returns {void} */
  function drawPiece(c, p, fade) {
    const fy = Math.cos(p.flip);
    const co = Math.cos(p.rot);
    const si = Math.sin(p.rot);
    const k = Math.abs(fy) < 0.08 ? 0.08 * Math.sign(fy || 1) : fy; // edge-on it is a thin sliver, never nothing
    c.globalAlpha = clamp(fade * p.a, 0, 1);
    c.setTransform(dpr * co, dpr * si, -dpr * si * k, dpr * co * k, dpr * p.x, dpr * p.y);
    if (p.kind === 'rect') {
      c.fillStyle = fy > 0.9 ? p.shine : fy > 0 ? p.front : p.back;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else if (p.kind === 'curl') { // a short curly ribbon: a tight wave
      c.strokeStyle = fy > 0 ? p.front : p.back;
      c.lineWidth = p.h * 0.42;
      const L = p.h * 3.2;
      c.beginPath();
      for (let i = 0; i <= 8; i += 1) {
        const x = -L / 2 + (L * i) / 8;
        const y = Math.sin(i * 1.3) * p.h * 0.55;
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.stroke();
    } else {
      c.drawImage(p.img ?? star, -p.w / 2, -p.h * (p.img ? 0.6 : 0.5), p.w, p.h * (p.img ? 1.2 : 1));
    }
  }

  /** Draw one streamer: a long curly ribbon through its trail, front and back sides in two shades. @param {CanvasRenderingContext2D} c context @param {object} s streamer @returns {void} */
  function drawStreamer(c, s) {
    const raw = s.pts;
    if (raw.length < 3) return;
    // The ribbon curls: each point is pushed sideways by a wave that runs along it.
    const pts = raw.map((q, i) => {
      const n = raw[Math.min(raw.length - 1, i + 1)];
      const m = raw[Math.max(0, i - 1)];
      const dx = n.x - m.x;
      const dy = n.y - m.y;
      const l = Math.hypot(dx, dy) || 1;
      const w = Math.sin(i * 0.9 - s.age * 7 + s.ph) * 5 * sc * Math.min(1, i / 3);
      return { x: q.x - (dy / l) * w, y: q.y + (dx / l) * w };
    });
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalAlpha = clamp(s.a, 0, 1);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const side of [0, 1]) { // the twisting ribbon: segments facing us are wide and bright, the others thin and dark
      c.strokeStyle = side ? shade(s.rgb, 1) : shade(s.rgb, 0.6);
      c.lineWidth = (side ? 3.6 : 2) * sc;
      c.beginPath();
      for (let i = 1; i < pts.length; i += 1) {
        const face = Math.sin(i * 0.7 - s.age * 5 + s.ph) > -0.2 ? 1 : 0;
        if (face !== side) continue;
        c.moveTo(pts[i - 1].x, pts[i - 1].y);
        c.lineTo(pts[i].x, pts[i].y);
      }
      c.stroke();
    }
  }

  return {
    /** Move every piece and streamer on, drop the ones gone off the bottom, and sprinkle a few when idle. @param {number} dt seconds @returns {void} */
    step(dt) {
      if (still) {
        if (stillFade >= 0) {
          stillFade += dt;
          if (stillFade > 4.5) { stillFade = -1; for (let i = pieces.length - 1; i >= 0; i -= 1) if (pieces[i].soft) pieces.splice(i, 1); }
        }
        return;
      }
      for (const p of pieces) {
        if (p.age < 0) { p.age += dt; continue; }
        move(p, dt);
        if (p.age > 7) p.a = 1 - smooth((p.age - 7) / 1.5);
      }
      for (let i = pieces.length - 1; i >= 0; i -= 1) if (pieces[i].y > H + 30 || pieces[i].a <= 0) pieces.splice(i, 1);
      for (const s of streamers) {
        s.age += dt;
        if (s.age < 0) continue;
        const drag = Math.exp(-3 * dt);
        s.vx *= drag;
        s.vy = s.vy * drag + g * 0.75 * dt;
        s.x += (s.vx + Math.sin(s.age * 3.4 + s.ph) * s.sway) * dt;
        s.y += s.vy * dt;
        const prev = s.pts[1];
        if (s.pts.length < 2 || Math.hypot(s.x - prev.x, s.y - prev.y) > 6 * sc) { // a new point every few px: the ribbon keeps its length
          s.pts.unshift({ x: s.x, y: s.y });
          if (s.pts.length > 18) s.pts.pop();
        } else { s.pts[0].x = s.x; s.pts[0].y = s.y; } // the head follows the streamer's end
        if (s.age > 5) s.a = 1 - smooth((s.age - 5) / 1.5);
      }
      for (let i = streamers.length - 1; i >= 0; i -= 1) if (streamers[i].a <= 0 || streamers[i].pts.every((q) => q.y > H + 20)) streamers.splice(i, 1);
      sprinkle -= dt;
      if (sprinkle <= 0) { // the idle sprinkle: a piece or two from the top now and then
        sprinkle = 0.45 + env.rand() * 0.6;
        if (pieces.length < 30) pieces.push(piece(spa ? 'petal' : env.rand() < 0.25 ? 'curl' : 'rect', env.rand() * W, -12 * sc, 0, 30 * sc));
      }
    },
    /** Streamers first, then the pieces, over everything. @param {CanvasRenderingContext2D} c context @returns {void} */
    draw(c) {
      const fade = still ? (stillFade < 0 ? 1 : smooth(stillFade / 0.6) * (1 - smooth((stillFade - 3) / 1.5))) : 1;
      for (const s of streamers) if (s.age >= 0) drawStreamer(c, s);
      for (const p of pieces) if (p.age >= 0) drawPiece(c, p, p.soft ? fade : 1);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = 1;
    },
    /** Odd times a confetti burst, even times a petal shower. @returns {void} */
    trigger() {
      fired += 1;
      if (fired % 2) burst(); else petalShower();
      if (still) { settleAll(); stillFade = 0; }
    },
    /** Counts for checks. @returns {object} state */
    state: () => ({ pieces: pieces.length, streamers: streamers.length, fired, mode: fired % 2 ? 'confetti' : 'petals' }),
  };
}

export default { id: 'confetti', num: 8, name: 'Confetti', layer: 'glass', make };
