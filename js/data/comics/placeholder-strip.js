// A tiny 3-panel strip with plain shapes (no art kit), used to check the comic player: a wide panel with a slow
// push-in and a sound, then two small panels (stacked in portrait, side by side in landscape) with a shout, a shake,
// a thought bubble and the player's {name}. Format: docs/COMIC-FORMAT.md.

/** Two blob "people" made of plain shapes: a body and a head, centred at x. @param {number} x middle @param {number} y head middle @param {string} c colour @returns {object[]} layers */
function blob(x, y, c) {
  return [
    { shape: 'rect', x: x - 90, y: y + 70, w: 180, h: 260, rx: 70, fill: c, stroke: true },
    { shape: 'circle', x, y, r: 90, fill: '#f3caa9', stroke: true },
    { shape: 'circle', x: x - 30, y: y - 10, r: 10, fill: '#2a211d' },
    { shape: 'circle', x: x + 30, y: y - 10, r: 10, fill: '#2a211d' },
    { shape: 'path', d: `M${x - 30} ${y + 35} Q${x} ${y + 60} ${x + 30} ${y + 35}`, stroke: true, sw: 8 },
  ];
}

export const STRIP = {
  id: 'placeholder',
  title: 'comic.placeholder.title',
  panels: [
    {
      layout: 'wide',
      scene: {
        bg: ['#ffe8d6', '#f7c9b0'],
        layers: [
          { shape: 'rect', x: 0, y: 720, w: 1600, h: 180, fill: '#c98f6b' },
          { shape: 'rect', x: 860, y: 560, w: 560, h: 200, rx: 40, fill: '#6a7be6', stroke: true },
          ...blob(420, 380, '#e66a8f'),
          { id: 'her', shape: 'circle', x: 420, y: 380, r: 1, fill: 'none', mouth: [420, 430] },
          ...blob(1140, 420, '#3fae8c'),
          { id: 'him', shape: 'circle', x: 1140, y: 420, r: 1, fill: 'none', mouth: [1140, 470] },
        ],
      },
      camera: { move: 'pushIn', focus: [420, 400], amount: 0.1 },
      sound: 'ooh_happy',
      bubbles: [
        { kind: 'caption', key: 'comic.placeholder.p1.cap', at: [800, 60] },
        { kind: 'say', key: 'comic.placeholder.p1.her', at: [520, 170], to: 'her' },
        { kind: 'whisper', key: 'comic.placeholder.p1.him', at: [1330, 250], to: 'him', w: 420 },
      ],
    },
    {
      layout: 'small',
      scene: { bg: '#d8f3ec', layers: [...blob(400, 230, '#e66a8f'), { id: 'her', shape: 'circle', x: 400, y: 230, r: 1, mouth: [400, 280] }] },
      camera: { move: 'shake' },
      sound: 'pop_big',
      bubbles: [{ kind: 'shout', key: 'comic.placeholder.p2.her', at: [600, 110], to: 'her', sound: 'cheer' }],
    },
    {
      layout: 'small',
      scene: { bg: '#e7e2fb', layers: [...blob(250, 250, '#3fae8c'), { id: 'him', shape: 'circle', x: 250, y: 250, r: 1, mouth: [300, 190] }] },
      camera: { move: 'panRight', amount: 0.15 },
      bubbles: [{ kind: 'think', key: 'comic.placeholder.p3.him', at: [560, 150], to: 'him', sound: 'laugh_evil' }],
    },
  ],
};
