/**
 * liquid-glass.js
 *
 * A real-time water/glass ripple simulation over a photo, driven by the
 * cursor or a finger. Not a filter or a canned CSS animation — it runs an
 * actual height-field wave simulation on the GPU each frame, then refracts
 * the photo through it and adds a specular highlight, so it genuinely looks
 * like glass or water sitting over the image and reacting to touch.
 *
 * WebGL2 required. No dependencies. If WebGL2 or floating-point render
 * targets aren't available, it quietly does nothing and leaves your <img>
 * exactly as it was.
 *
 * USAGE
 *   <div id="portrait" style="width:340px;aspect-ratio:1/1.05">
 *     <img src="/me.jpg" alt="Portrait" crossorigin="anonymous" />
 *   </div>
 *
 *   import { initLiquidGlass } from './liquid-glass.js';
 *   const fx = initLiquidGlass(document.getElementById('portrait'));
 *   fx.destroy();
 *
 * If the image is served from another origin, it must allow CORS and the
 * <img> needs crossorigin="anonymous", or WebGL will refuse to read it.
 */

const DEFAULTS = {
  simSize: 256,          // simulation grid resolution (perf/quality tradeoff)
  damping: 0.992,         // wave energy loss per step, <1. closer to 1 = longer ripples
  splatRadius: 0.045,     // uv-space radius of a touch disturbance
  splatStrength: 1.1,     // how hard a touch pushes the surface
  refraction: 0.055,      // how strongly the surface bends the image
  specular: 0.55,         // brightness of the glass highlight
  shininess: 28.0,
  tint: [0.65, 0.8, 1.0], // faint cool tint on highlights, rgb 0-1
  idleRipple: true,       // a very small ambient ripple so the surface never looks static
  idleStrength: 0.06,
};

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const SPLAT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uPoint;
uniform float uRadius;
uniform float uStrength;
void main() {
  float d = distance(vUv, uPoint);
  float bump = smoothstep(uRadius, 0.0, d) * uStrength;
  outColor = vec4(bump, 0.0, 0.0, 1.0);
}`;

const PROPAGATE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uCurrent;
uniform sampler2D uPrevious;
uniform vec2 uTexel;
uniform float uDamping;
void main() {
  float n = texture(uCurrent, vUv + vec2(0.0, uTexel.y)).r;
  float s = texture(uCurrent, vUv - vec2(0.0, uTexel.y)).r;
  float e = texture(uCurrent, vUv + vec2(uTexel.x, 0.0)).r;
  float w = texture(uCurrent, vUv - vec2(uTexel.x, 0.0)).r;
  float old = texture(uPrevious, vUv).r;
  float h = (n + s + e + w) * 0.5 - old;
  h *= uDamping;
  outColor = vec4(h, 0.0, 0.0, 1.0);
}`;

const RENDER_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uHeight;
uniform sampler2D uImage;
uniform vec2 uTexel;
uniform float uRefraction;
uniform float uSpecular;
uniform float uShininess;
uniform vec3 uTint;
void main() {
  float hl = texture(uHeight, vUv - vec2(uTexel.x, 0.0)).r;
  float hr = texture(uHeight, vUv + vec2(uTexel.x, 0.0)).r;
  float hd = texture(uHeight, vUv - vec2(0.0, uTexel.y)).r;
  float hu = texture(uHeight, vUv + vec2(0.0, uTexel.y)).r;

  vec3 normal = normalize(vec3((hl - hr), (hd - hu), 0.55));

  vec2 refractedUv = clamp(vUv + normal.xy * uRefraction, 0.001, 0.999);
  vec3 base = texture(uImage, refractedUv).rgb;

  vec3 lightDir = normalize(vec3(0.35, 0.5, 0.8));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfVec = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfVec), 0.0), uShininess) * uSpecular;

  vec3 color = base + spec * uTint;
  outColor = vec4(color, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('[liquid-glass] shader compile error: ' + log);
  }
  return sh;
}

function link(gl, vsSrc, fsSrc) {
  const prog = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error('[liquid-glass] program link error: ' + log);
  }
  return prog;
}

function makeHeightTarget(gl, size) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, size, size, 0, gl.RED, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo, ok };
}

export function initLiquidGlass(root, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const noop = { destroy() {}, splat() {} };

  const img = root.querySelector('img');
  if (!img) {
    console.warn('[liquid-glass] target has no <img>, skipping.');
    return noop;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return noop; // static image, no ripple

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; display:block;';
  root.style.position = root.style.position || 'relative';

  const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, antialias: false });
  if (!gl) { console.warn('[liquid-glass] WebGL2 unavailable, skipping.'); return noop; }

  const floatExt = gl.getExtension('EXT_color_buffer_float');
  if (!floatExt) { console.warn('[liquid-glass] float render targets unavailable, skipping.'); return noop; }

  let destroyed = false;
  let programs, quadBuf, heightBufs;
  let imageTex = null;
  let raf = 0;
  let frame = 0;
  const size = o.simSize;
  const pending = []; // queued splats: {x,y,strength}

  function setupPrograms() {
    programs = {
      splat: link(gl, VERT, SPLAT_FRAG),
      propagate: link(gl, VERT, PROPAGATE_FRAG),
      render: link(gl, VERT, RENDER_FRAG),
    };
    quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  }

  function bindQuad(prog) {
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  function setupHeightBuffers() {
    heightBufs = [makeHeightTarget(gl, size), makeHeightTarget(gl, size), makeHeightTarget(gl, size)];
    if (!heightBufs.every(b => b.ok)) {
      console.warn('[liquid-glass] R16F render target not supported, skipping.');
      return false;
    }
    return true;
  }

  function loadImageTexture() {
    imageTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, imageTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const upload = () => {
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      try {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      } catch (err) {
        console.warn('[liquid-glass] could not read image into WebGL (CORS?). Skipping.', err);
      }
    };
    if (img.complete && img.naturalWidth) upload();
    else img.addEventListener('load', upload, { once: true });
  }

  function resize() {
    const rect = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
  }

  function addSplat(clientX, clientY, strength) {
    const rect = root.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    pending.push({ x, y, strength });
  }

  let lastPointer = null;
  function onPointerMove(e) {
    const rect = root.getBoundingClientRect();
    const speed = lastPointer
      ? Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y) / (rect.width || 1)
      : 0;
    lastPointer = { x: e.clientX, y: e.clientY };
    addSplat(e.clientX, e.clientY, o.splatStrength * Math.min(1, 0.35 + speed * 3));
  }
  function onPointerDown(e) {
    addSplat(e.clientX, e.clientY, o.splatStrength * 1.6);
  }
  function onPointerLeave() { lastPointer = null; }

  function runSplat(target, x, y, strength) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, size, size);
    gl.useProgram(programs.splat);
    bindQuad(programs.splat);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform2f(gl.getUniformLocation(programs.splat, 'uPoint'), x, y);
    gl.uniform1f(gl.getUniformLocation(programs.splat, 'uRadius'), o.splatRadius);
    gl.uniform1f(gl.getUniformLocation(programs.splat, 'uStrength'), strength);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);
  }

  function step() {
    // rotate roles: writeIdx gets the new frame; the other two are current/previous
    const writeIdx = frame % 3;
    const currentIdx = (frame + 2) % 3;
    const prevIdx = (frame + 1) % 3;
    const writeBuf = heightBufs[writeIdx];
    const currentBuf = heightBufs[currentIdx];
    const prevBuf = heightBufs[prevIdx];

    // apply any queued touch disturbances directly onto the "current" buffer
    while (pending.length) {
      const s = pending.shift();
      runSplat(currentBuf, s.x, s.y, s.strength);
    }
    if (o.idleRipple && frame % 37 === 0) {
      runSplat(currentBuf, 0.5 + (Math.random() - 0.5) * 0.6, 0.5 + (Math.random() - 0.5) * 0.6, o.idleStrength);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, writeBuf.fbo);
    gl.viewport(0, 0, size, size);
    gl.useProgram(programs.propagate);
    bindQuad(programs.propagate);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, currentBuf.tex);
    gl.uniform1i(gl.getUniformLocation(programs.propagate, 'uCurrent'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, prevBuf.tex);
    gl.uniform1i(gl.getUniformLocation(programs.propagate, 'uPrevious'), 1);
    gl.uniform2f(gl.getUniformLocation(programs.propagate, 'uTexel'), 1 / size, 1 / size);
    gl.uniform1f(gl.getUniformLocation(programs.propagate, 'uDamping'), o.damping);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // final composite to the visible canvas, reading the just-written height field
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(programs.render);
    bindQuad(programs.render);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, writeBuf.tex);
    gl.uniform1i(gl.getUniformLocation(programs.render, 'uHeight'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, imageTex);
    gl.uniform1i(gl.getUniformLocation(programs.render, 'uImage'), 1);
    gl.uniform2f(gl.getUniformLocation(programs.render, 'uTexel'), 1 / size, 1 / size);
    gl.uniform1f(gl.getUniformLocation(programs.render, 'uRefraction'), o.refraction);
    gl.uniform1f(gl.getUniformLocation(programs.render, 'uSpecular'), o.specular);
    gl.uniform1f(gl.getUniformLocation(programs.render, 'uShininess'), o.shininess);
    gl.uniform3f(gl.getUniformLocation(programs.render, 'uTint'), ...o.tint);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    frame++;
    if (!destroyed) raf = requestAnimationFrame(step);
  }

  // ---- boot -----------------------------------------------------------

  setupPrograms();
  if (!setupHeightBuffers()) return noop;
  loadImageTexture();
  resize();
  root.insertBefore(canvas, img);
  img.style.visibility = 'hidden'; // the WebGL canvas now renders the photo

  const ro = new ResizeObserver(resize);
  ro.observe(root);

  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointerleave', onPointerLeave);

  raf = requestAnimationFrame(step);

  return {
    splat: (x01, y01, strength = o.splatStrength) => pending.push({ x: x01, y: 1 - y01, strength }),
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointerleave', onPointerLeave);
      img.style.visibility = 'visible';
      canvas.remove();
    },
  };
}

export default initLiquidGlass;
