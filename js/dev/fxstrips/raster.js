// Turns a comic panel's SVG art into a plain picture (a canvas) for the effect strips page (fx-strips.html, developer
// only), so the light effects can be painted on one canvas together with the art: the room picture, then the effects
// behind the people, then the people picture, then the effects in front. That way added light really brightens the
// art and the darkness really darkens it (with the SVG and a see-through canvas on top it would only tint it).
import { svgEl } from '../../game/comic.js';

/**
 * Paint some SVG art into a canvas at a given size in device pixels.
 * @param {SVGElement[]} nodes the art (groups in the panel's drawing units)
 * @param {{w: number, h: number}} L the panel's drawing size (the viewBox)
 * @param {number} pw width in device pixels
 * @param {number} ph height in device pixels
 * @returns {Promise<HTMLCanvasElement>} the picture (see-through where nothing is drawn)
 */
export function rasterize(nodes, L, pw, ph) {
  const svg = svgEl('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${L.w} ${L.h}`, width: pw, height: ph, preserveAspectRatio: 'none' });
  for (const n of nodes) if (n) svg.appendChild(n);
  const text = new XMLSerializer().serializeToString(svg);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  return new Promise((resolve) => {
    const img = new Image();
    /** The picture has loaded: copy it into a canvas once (drawing a canvas each frame is cheap, an SVG is not). @returns {void} */
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = pw;
      c.height = ph;
      c.getContext('2d').drawImage(img, 0, 0, pw, ph);
      resolve(c);
    };
    /** The picture could not be made: give an empty one (the page still works, only without that art). @returns {void} */
    img.onerror = () => {
      console.error('fx-strips: could not paint the panel art');
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      resolve(c);
    };
    img.src = url;
  });
}
