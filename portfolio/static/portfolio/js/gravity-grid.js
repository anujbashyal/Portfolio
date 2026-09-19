/**
 * gravity-grid.js
 *
 * Cursor-reactive dot-grid background. Framework-agnostic, zero dependencies.
 * Creates its own DOM layers and injects its own styles, so it can be dropped
 * into any project without touching existing markup or CSS.
 *
 *   import { initGravityGrid } from './gravity-grid.js';
 *   const grid = initGravityGrid();          // full options below
 *   grid.destroy();                          // removes layers + listeners
 *
 * The layers are appended to document.body and sit at z-index 0 (canvas) and
 * 1 (spotlight + vignette). Give your page wrapper `position: relative` and a
 * z-index of 2 or higher so content stays on top.
 */

const DEFAULTS = {
  spacing: 30,          // px between dots
  radius: 230,          // cursor influence radius in px
  pull: 0.34,           // displacement strength. negative = repel instead
  dot: 1.1,             // dot radius at rest
  dotMax: 2.6,          // dot radius at the centre of the field
  baseAlpha: 0.16,      // dot opacity at rest
  peakAlpha: 0.9,       // dot opacity at the centre of the field
  ease: 0.12,           // cursor follow smoothing, 0-1. lower = laggier
  color: [120, 170, 255],   // dot + spotlight rgb
  bg: '#08090b',        // page background, used by the vignette
  spotlight: true,      // the soft radial glow above the dots
  vignette: true,       // fade the grid out at the viewport edges
  minWidth: 860,        // below this viewport width, don't initialise at all
  container: null,      // defaults to document.body
  zIndex: 0,
};

const STYLE_ID = 'gravity-grid-styles';

const CSS = `
.gg-canvas,
.gg-spotlight,
.gg-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.gg-canvas { display: block; width: 100%; height: 100%; }
.gg-spotlight { transition: opacity .4s ease; }
@media (prefers-reduced-motion: reduce) {
  .gg-spotlight { display: none; }
}
`;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function initGravityGrid(options = {}) {
  const o = { ...DEFAULTS, ...options };
  const noop = { destroy() {}, setOptions() {} };

  // Touch devices get nothing: pointermove is useless there and the repaint
  // costs battery. Same for narrow viewports.
  if (typeof window === 'undefined') return noop;
  if (window.innerWidth < o.minWidth) return noop;
  if (window.matchMedia('(pointer: coarse)').matches) return noop;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const host = o.container || document.body;

  injectStyles();

  // ---- layers -------------------------------------------------------------

  const canvas = document.createElement('canvas');
  canvas.className = 'gg-canvas';
  canvas.style.zIndex = String(o.zIndex);
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const [r, g, b] = o.color;
  let spotlight = null;
  if (o.spotlight) {
    spotlight = document.createElement('div');
    spotlight.className = 'gg-spotlight';
    spotlight.style.zIndex = String(o.zIndex + 1);
    spotlight.style.background =
      `radial-gradient(420px circle at var(--gg-mx, 50vw) var(--gg-my, 40vh), ` +
      `rgba(${r},${g},${b},.13), rgba(${r},${g},${b},.05) 40%, transparent 70%)`;
    host.appendChild(spotlight);
  }

  let vignette = null;
  if (o.vignette) {
    vignette = document.createElement('div');
    vignette.className = 'gg-vignette';
    vignette.style.zIndex = String(o.zIndex + 1);
    vignette.style.background =
      `radial-gradient(120% 90% at 50% 40%, transparent 35%, ${o.bg} 100%)`;
    host.appendChild(vignette);
  }

  const ctx = canvas.getContext('2d');

  // ---- state --------------------------------------------------------------

  let w = 0, h = 0, cols = 0, rows = 0;
  let raf = 0;
  const OFF = -99999;

  // `target` is the raw pointer, `cur` is the smoothed position the field
  // actually reacts to. Reading the pointer directly looks twitchy.
  const target = { x: OFF, y: OFF };
  const cur = { x: OFF, y: OFF };

  // ---- drawing ------------------------------------------------------------

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / o.spacing) + 1;
    rows = Math.ceil(h / o.spacing) + 1;
    if (reduceMotion) draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    const r2 = o.radius * o.radius;
    const alphaSpan = o.peakAlpha - o.baseAlpha;
    const dotSpan = o.dotMax - o.dot;
    const rgb = `${o.color[0]},${o.color[1]},${o.color[2]}`;

    for (let i = 0; i < cols; i++) {
      const x = i * o.spacing;
      for (let j = 0; j < rows; j++) {
        const y = j * o.spacing;

        const dx = cur.x - x;
        const dy = cur.y - y;
        const d2 = dx * dx + dy * dy;

        let px = x, py = y;
        let alpha = o.baseAlpha;
        let size = o.dot;

        if (d2 < r2) {
          const d = Math.sqrt(d2) || 0.001;
          // Eased falloff: 1 at the cursor, 0 at the edge of the radius.
          // Squaring is what makes this read as a gravity well rather than
          // a flashlight — the effect stays tight around the pointer.
          const f = 1 - d / o.radius;
          const e = f * f;
          px += dx * o.pull * e;
          py += dy * o.pull * e;
          alpha = o.baseAlpha + e * alphaSpan;
          size = o.dot + e * dotSpan;
        }

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.fill();
      }
    }
  }

  function loop() {
    cur.x += (target.x - cur.x) * o.ease;
    cur.y += (target.y - cur.y) * o.ease;
    draw();
    raf = requestAnimationFrame(loop);
  }

  // ---- events -------------------------------------------------------------

  function onPointerMove(e) {
    target.x = e.clientX;
    target.y = e.clientY;
    const root = document.documentElement.style;
    root.setProperty('--gg-mx', e.clientX + 'px');
    root.setProperty('--gg-my', e.clientY + 'px');
  }

  function onPointerLeave() {
    target.x = OFF;
    target.y = OFF;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);

  resize();
  if (!reduceMotion) {
    cur.x = w / 2;
    cur.y = h / 2;
    loop();
  }

  // ---- public API ---------------------------------------------------------

  return {
    /** Live-tune any option, e.g. grid.setOptions({ pull: -0.4 }) */
    setOptions(next) {
      Object.assign(o, next);
      resize();
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      canvas.remove();
      spotlight?.remove();
      vignette?.remove();
    },
  };
}

export default initGravityGrid;
