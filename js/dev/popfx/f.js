// Pop effects test page, variant F: Pressure gauge. A look-and-feel test only (see popfx/shared.js for the hooks).
import { INK, KIND, CALM, smooth, clamp, backOut, play, buzz, tone, hiss, W, H, sc, bp, T, realT, rand, face, squirt } from './shared.js';
import { drawPimple, gooLook } from '../../pop/art.js';

/**
 * F: pressure gauge. While held the bump fills like a balloon under tension: the skin puckers in round it, a little
 * pressure dial above it climbs into the red-orange, and pulse rings round the bump come faster and faster. The pop
 * lets it all go: a big cartoon shockwave ring, a "PSHHT!" word, a spray of fine glossy goo droplets that fans out
 * across the face past the finger and lands as little specks, and the bump deflating with a wrinkly wobble.
 * @returns {object} the variant
 */
function makeF() {
  const big = KIND === 'big';
  // Plain white goo looks like paper dots at this size, so the spray uses a warm cream for it.
  const look = bp.goo === 'white' || !bp.goo ? { body: '#fff1c8', shade: '#efcf86', edge: '#9a7438', hi: '#ffffff' } : gooLook(bp.goo);
  const spray = []; // droplets in the air: {x, y, z, vx, vy, vz, r}
  const specks = []; // droplets that landed on the skin: {x, y, r, age, sa}
  let popAt = -1;
  let phase = 0; // the pulse rings' phase (they speed up as the pressure climbs)
  let lastPhase = 0;
  const pulses = []; // {at}: scene time each pulse ring started
  /** Is this point on her face (so a drop sticks there)? @param {number} x scene x @param {number} y scene y @returns {boolean} on the face */
  const onFace = (x, y) => !face || ((x - face.cx) / face.rx) ** 2 + ((y - face.cy) / face.ry) ** 2 <= 1;
  /** Where the dial sits: above the bump and a little towards the middle, clear of a fingertip. @returns {{x: number, y: number, R: number}} the dial */
  const dial = () => {
    const R = 24 * sc * (big ? 1.1 : 1);
    return { x: clamp(bp.x - 46 * sc, R + 6, W - R - 6), y: Math.max(R + 6, bp.y - bp.r * 2.2 - 46 * sc), R };
  };
  return {
    /** Swells like a balloon, with a wobble that gets faster as the pressure climbs. @returns {object} look */
    look() {
      const pr = bp.pressure;
      const wob = CALM || bp.popped ? 0 : Math.sin(phase * Math.PI * 2) * 0.06 * pr;
      return { amt: pr * 1.7 + wob, warp: pr * 1.3 + wob, jx: 0, jy: 0 };
    },
    /** The pulse rings' clock; after the pop the spray flies, slows in the air, falls and lands as specks. @param {number} sdt scene seconds @returns {void} */
    step(sdt) {
      if (!bp.popped && bp.pressure > 0.15) {
        phase += sdt * (1.5 + 10 * bp.pressure ** 2); // 1.5 pulses a second at first, about 11 at the end
        if (Math.floor(phase) > Math.floor(lastPhase)) pulses.push({ at: T });
        lastPhase = phase;
      }
      while (pulses.length && T - pulses[0].at > 0.45) pulses.shift();
      const drag = Math.exp(-sdt * 2.4);
      for (let i = spray.length - 1; i >= 0; i -= 1) {
        const d = spray[i];
        if (d.fall !== undefined) { // missed the face: it drops away behind her and fades
          d.fall += sdt;
          d.vy += 900 * sc * sdt;
          d.y += d.vy * sdt;
          if (d.fall > 0.35) spray.splice(i, 1);
          continue;
        }
        d.vx *= drag;
        d.vy *= drag;
        d.x += d.vx * sdt;
        d.y += d.vy * sdt;
        d.vz -= 700 * sdt;
        d.z += d.vz * sdt;
        if (d.z > 0) continue;
        if (onFace(d.x, d.y)) { // landed: a small speck that squashes flat and settles
          spray.splice(i, 1);
          specks.push({ x: d.x, y: d.y, r: d.r, age: CALM ? 1 : 0, sa: Math.atan2(d.vy, d.vx) });
        } else { d.fall = 0; d.z = 0; d.vz = 0; d.vx *= 0.3; d.vy = 40 * sc; }
      }
      for (const s of specks) if (s.age < 0.4) s.age += sdt;
    },
    /** The landed specks of the spray, on the skin under the fingertips. @param {CanvasRenderingContext2D} c context @returns {void} */
    mid(c) {
      for (const s of specks) drawSpeck(c, s);
    },
    /** Pucker lines round the bump (the skin pulled in), the pulse rings, and after the pop the deflating bump. @param {CanvasRenderingContext2D} c context @param {object} p bump @param {object} lk look @returns {void} */
    afterBump(c, p, lk) {
      if (bp.popped) {
        const t = T - popAt;
        if (t > 0.42) return;
        const k = 1 - smooth(t / 0.42);
        const wob = CALM ? 1 : 1 + 0.12 * Math.sin(t * 46) * k;
        drawPimple(c, { ...p, r: p.r * wob }, -0.25, 1.15 * k, T); // flat and floppy, shrinking away
        c.save();
        c.globalAlpha = k;
        c.strokeStyle = 'rgba(120,50,40,0.55)';
        c.lineWidth = Math.max(1, 1.3 * sc);
        c.lineCap = 'round';
        for (const [dx, dy, a] of [[-0.35, -0.2, 0.4], [0.25, 0.05, -0.5], [-0.05, 0.35, 0.1]]) { // wrinkles of the empty skin
          c.beginPath();
          c.arc(p.x + dx * p.r * k, p.y + dy * p.r * k, p.r * 0.35 * k + 0.5, a, a + 1.6);
          c.stroke();
        }
        c.restore();
        return;
      }
      const pr = bp.pressure;
      if (pr < 0.12) return;
      const s = p.r * (1 + 0.45 * lk.amt);
      c.save();
      c.lineCap = 'round';
      for (let i = 0; i < 10; i += 1) { // pucker creases pulled in towards the bump
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const r0 = s * 1.15 + 2;
        const r1 = r0 + (4 + 12 * pr) * sc;
        const bend = 0.18 * pr;
        c.strokeStyle = `rgba(130,55,40,${0.35 * pr})`;
        c.lineWidth = Math.max(1.2, 1.6 * sc);
        c.beginPath();
        c.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0);
        c.quadraticCurveTo(p.x + Math.cos(a + bend) * (r0 + r1) / 2, p.y + Math.sin(a + bend) * (r0 + r1) / 2, p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1);
        c.stroke();
        c.strokeStyle = `rgba(255,232,218,${0.4 * pr})`;
        c.lineWidth = Math.max(1, 1.2 * sc);
        c.beginPath();
        c.moveTo(p.x + Math.cos(a + 0.12) * r0, p.y + Math.sin(a + 0.12) * r0);
        c.lineTo(p.x + Math.cos(a + 0.12) * r1, p.y + Math.sin(a + 0.12) * r1);
        c.stroke();
      }
      // A tight balloon shine across the top.
      c.fillStyle = `rgba(255,255,255,${0.35 + 0.5 * pr})`;
      c.beginPath(); c.ellipse(p.x - s * 0.18, p.y - s * 0.48, s * (0.22 + 0.25 * pr), s * 0.09, -0.35, 0, Math.PI * 2); c.fill();
      for (const q of pulses) { // pulse rings, faster as it fills
        const u = (T - q.at) / 0.45;
        c.globalAlpha = (1 - u) * 0.8 * pr;
        c.strokeStyle = pr > 0.8 ? '#ff9d6e' : '#fff6dc';
        c.lineWidth = Math.max(1.5, 2.6 * sc * (1 - u));
        c.beginPath(); c.arc(p.x, p.y, s * (1.1 + 1.6 * u), 0, Math.PI * 2); c.stroke();
      }
      c.restore();
    },
    /** The release: shockwave, the droplet spray, a few game drops, the hiss and the deflate sound, and a buzz. @returns {void} */
    pop() {
      popAt = T;
      squirt(bp, { strands: 0, drops: big ? 8 : 5, speed: 1.2 });
      // Most drops fan out up and in towards the middle of the face (over the top finger); the rest go all round.
      const fan = Math.atan2(-bp.r * 2, (face?.cx ?? W / 2) - bp.x);
      const n = CALM ? (big ? 40 : 30) : big ? 64 : 46;
      for (let i = 0; i < n; i += 1) {
        const inFan = i % 4 !== 3;
        const a = inFan ? fan + (rand() - 0.5) * 2.2 : rand() * Math.PI * 2;
        const v = (inFan ? 220 + rand() * 400 : 130 + rand() * 220) * sc * (big ? 1.15 : 1);
        const r = (i % 9 === 0 ? 3.4 + rand() * 1.2 : 1.3 + rand() * 1.9) * sc * (big ? 1.2 : 1);
        spray.push({ x: bp.x + Math.cos(a) * bp.r * 0.4, y: bp.y + Math.sin(a) * bp.r * 0.4, z: 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 110 + rand() * 170, r });
      }
      play(big ? 'pop_big' : 'pop_small');
      hiss(0.02, big ? 0.62 : 0.48, { type: 'bandpass', f0: big ? 1500 : 1800, f1: 420, q: 0.7, vol: 0.13, attack: 0.02 });
      tone(big ? 220 : 290, big ? 70 : 90, 0.08, 0.45, 0.09, 'triangle');
      buzz(big ? [50, 30, 110] : [30, 20, 50]);
    },
    /** The pressure dial above the bump: the needle climbs while held, whips past the top and the dial bounces away at the pop. @param {CanvasRenderingContext2D} c context @returns {void} */
    over(c) {
      const d = dial();
      const t = popAt >= 0 ? T - popAt : -1;
      if (t > 0.5) { drawRelease(c, t); return; }
      const show = popAt >= 0 ? 1 - smooth(t / 0.5) : smooth(bp.pressure / 0.15);
      if (show > 0.01) drawDial(c, d, popAt >= 0 ? 1.15 : bp.pressure, show, t);
      if (t >= 0) drawRelease(c, t);
    },
  };

  /**
   * The cartoon pressure dial: a cream face with green, yellow and orange bands, an ink needle, and a little tube down to the bump.
   * @param {CanvasRenderingContext2D} c context
   * @param {{x: number, y: number, R: number}} d where and how big
   * @param {number} pr 0..1 pressure (more = needle past the end)
   * @param {number} show 0..1 how much it is shown
   * @param {number} t seconds since the pop, or -1
   * @returns {void}
   */
  function drawDial(c, d, pr, show, t) {
    const hop = t >= 0 && !CALM ? -Math.sin(Math.min(1, t / 0.5) * Math.PI) * 14 * sc : 0;
    const jit = !CALM && t < 0 && pr > 0.8 ? Math.sin(realT * 60) * 0.05 : 0;
    const x = d.x;
    const y = d.y + hop;
    const R = d.R * (CALM ? 1 : 0.6 + 0.4 * backOut(show));
    c.save();
    c.globalAlpha = Math.min(1, show * 1.3);
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(x, y + R); c.lineTo(bp.x, bp.y - bp.r * 1.6); c.stroke();
    c.setLineDash([]);
    c.fillStyle = 'rgba(40,20,10,0.25)';
    c.beginPath(); c.arc(x + 2, y + 3, R + 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fffaf0';
    c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill();
    const a0 = Math.PI * 0.8;
    const sweep = Math.PI * 1.4;
    for (const [from, to, col] of [[0, 0.5, '#7fd68a'], [0.5, 0.8, '#ffd84a'], [0.8, 1, '#ff9d6e']]) {
      c.strokeStyle = col;
      c.lineWidth = R * 0.22;
      c.beginPath(); c.arc(x, y, R * 0.72, a0 + sweep * from, a0 + sweep * to); c.stroke();
    }
    c.lineWidth = 2.4;
    c.strokeStyle = INK;
    c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.stroke();
    const na = a0 + sweep * clamp(pr, 0, 1.15) + jit;
    c.lineCap = 'round';
    c.lineWidth = Math.max(2, R * 0.12);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(na) * R * 0.78, y + Math.sin(na) * R * 0.78); c.stroke();
    c.fillStyle = INK;
    c.beginPath(); c.arc(x, y, R * 0.14, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  /** The release after the pop: two shockwave rings, the flying goo droplets and the "PSHHT!" word. @param {CanvasRenderingContext2D} c context @param {number} t seconds since the pop @returns {void} */
  function drawRelease(c, t) {
    const far = Math.min(W, H) * (big ? 0.8 : 0.62);
    for (const [delay, k] of [[0, 1], [0.09, 0.7]]) { // a big ring and a smaller one just after
      const u = (t - delay) / 0.5;
      if (u < 0 || u > 1) continue;
      const rr = bp.r + (far * k - bp.r) * (1 - (1 - u) ** 3);
      const lw = Math.max(2, 11 * sc * k * (1 - u));
      c.save();
      c.globalAlpha = 1 - u * u;
      c.strokeStyle = INK;
      c.lineWidth = lw + 3;
      c.beginPath(); c.arc(bp.x, bp.y, rr, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#fffdf2';
      c.lineWidth = lw;
      c.stroke();
      c.restore();
    }
    for (const d of spray) drawDroplet(c, d);
    if (t < 0.85) { // the word, puffing up above the bump and drifting away
      const grow = CALM ? 1 : t < 0.12 ? backOut(t / 0.12) : 1 + (t - 0.12) * 0.15;
      const alpha = t > 0.55 ? Math.max(0, 1 - (t - 0.55) / 0.3) : 1;
      const word = big ? 'PSHHHT!' : 'PSHHT!';
      const font = (px) => `900 ${px}px "Arial Black", "Arial Rounded MT Bold", "Comic Sans MS", system-ui, sans-serif`; // the word's font at a size
      // Fit the word on screen: measured at its largest (the slow grow at the end), with its ink outline and tilt.
      const fs0 = (big ? 40 : 32) * sc;
      const peak = CALM ? 1 : 1.12;
      c.font = font(fs0 * peak);
      const wide = c.measureText(word).width + fs0 * peak * 0.3;
      const fit = Math.min(1, (W - 24) / wide);
      const fs = fs0 * fit * grow;
      const half = (wide * fit) / 2 + 10;
      const x = half * 2 >= W ? W / 2 : clamp(bp.x - 20 * sc, half, W - half);
      const y = Math.max(fs * 0.9 + half * 0.1, bp.y - bp.r - 62 * sc - t * 30 * sc);
      c.save();
      c.globalAlpha = alpha;
      c.translate(x, y);
      c.rotate(-0.1);
      c.font = font(fs);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineJoin = 'round';
      c.lineWidth = fs * 0.2;
      c.strokeStyle = INK;
      c.strokeText(word, 0, 0);
      c.fillStyle = '#9fe3ff';
      c.fillText(word, 0, 0);
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillText(word, -fs * 0.04, -fs * 0.05);
      c.fillStyle = '#9fe3ff';
      c.fillText(word, 0, fs * 0.02);
      c.restore();
    }
  }

  /**
   * One flying droplet of the spray: its shadow on the skin, and the drop lifted above it as a cartoon teardrop (round
   * head forward, a pointed tail that gets longer the faster it goes) with an ink-brown rim, round shading and a shine.
   * A drop that missed the face just falls and fades.
   * @param {CanvasRenderingContext2D} c context
   * @param {{x: number, y: number, z: number, vx: number, vy: number, vz: number, r: number, fall?: number}} d the droplet
   * @returns {void}
   */
  function drawDroplet(c, d) {
    const y = d.y - d.z * 0.6;
    const vx = d.vx;
    const vy = d.vy - d.vz * 0.6;
    const sp = Math.hypot(vx, vy);
    const a = Math.atan2(vy, vx);
    const r = d.r * (1 + d.z / 200);
    const tail = r * (1.1 + Math.min(1.6, (CALM ? 0.5 : 1) * sp / (220 * sc))); // how far the point trails behind
    c.save();
    if (d.fall !== undefined) c.globalAlpha = Math.max(0, 1 - d.fall / 0.35);
    else {
      c.fillStyle = 'rgba(110,60,30,0.15)';
      c.beginPath(); c.ellipse(d.x, d.y, d.r, d.r * 0.7, 0, 0, Math.PI * 2); c.fill();
    }
    c.translate(d.x, y);
    /** The teardrop path round the drop's middle, pointing back along its flight. @param {number} k scale @returns {void} */
    const drop = (k) => {
      const rr = r * k;
      const L = tail + (k - 1) * r * 1.5;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      /** A point in the drop's own frame (x forward, y sideways) turned to the scene. @param {number} fx forward @param {number} fy sideways @returns {number[]} [x, y] */
      const P = (fx, fy) => [fx * ca - fy * sa, fx * sa + fy * ca];
      c.beginPath();
      c.moveTo(...P(0, -rr));
      c.arc(0, 0, rr, a - Math.PI / 2, a + Math.PI / 2);
      c.quadraticCurveTo(...P(-rr * 0.7, rr * 0.85), ...P(-L, 0));
      c.quadraticCurveTo(...P(-rr * 0.7, -rr * 0.85), ...P(0, -rr));
      c.closePath();
    };
    c.fillStyle = look.edge;
    drop(1 + 0.9 / Math.max(1, r));
    c.fill();
    const g = c.createLinearGradient(0, -r, 0, r); // light on top, darker underneath, whichever way it flies
    g.addColorStop(0, look.body);
    g.addColorStop(0.55, look.body);
    g.addColorStop(1, look.shade);
    c.fillStyle = g;
    drop(1);
    c.fill();
    c.fillStyle = look.hi;
    c.beginPath(); c.ellipse(-r * 0.28, -r * 0.38, Math.max(0.6, r * 0.34), Math.max(0.45, r * 0.22), -0.5, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  /**
   * One landed speck of the spray on the skin: it squashes flat when it hits, wobbles back, then stays as a small
   * glossy dot with a tiny smear behind it.
   * @param {CanvasRenderingContext2D} c context
   * @param {{x: number, y: number, r: number, age: number, sa: number}} s the speck
   * @returns {void}
   */
  function drawSpeck(c, s) {
    const k = s.age < 0.35 ? Math.exp(-s.age * 9) * Math.cos(s.age * 30) : 0;
    const rx = s.r * (1 + 0.5 * k);
    const ry = s.r * 0.82 * (1 - 0.4 * k);
    c.strokeStyle = look.shade;
    c.lineCap = 'round';
    c.lineWidth = s.r * 1.1;
    c.beginPath(); c.moveTo(s.x - Math.cos(s.sa) * s.r * 1.6, s.y - Math.sin(s.sa) * s.r * 1.6); c.lineTo(s.x, s.y); c.stroke();
    c.fillStyle = look.edge;
    c.beginPath(); c.ellipse(s.x, s.y, rx + 0.8, ry + 0.8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = look.shade;
    c.beginPath(); c.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = look.body;
    c.beginPath(); c.ellipse(s.x - rx * 0.1, s.y - ry * 0.15, rx * 0.72, ry * 0.66, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = look.hi;
    c.beginPath(); c.ellipse(s.x - rx * 0.34, s.y - ry * 0.36, Math.max(0.5, rx * 0.3), Math.max(0.4, ry * 0.22), -0.5, 0, Math.PI * 2); c.fill();
  }
}

export default { id: 'F', name: 'Pressure gauge', make: makeF };
