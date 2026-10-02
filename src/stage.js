/**
 * The screen, on Alan's engine (`vendor/gfx`): WebGPU where the browser has
 * it and WebGL 2 where it does not, the same physically based shading, glass
 * and shadows the eye is drawn with. A perspective camera that starts at the
 * isometric corner — the arcade's view — and can be turned, tilted and
 * zoomed round wherever the marble is (`view.js`).
 *
 * The lighting is Alan's stage rig: a soft wash, a key light that casts the
 * shadows (here it follows the play), and a dim fill. What the glass, steel
 * and polished tiles reflect is a studio painted at startup.
 */

import * as GFX from './vendor/gfx/index.js';
import { Renderer } from './vendor/gfx/renderer.js';
import { WebGLBackend } from './vendor/gfx/webgl.js';
import { WebGPUBackend } from './vendor/gfx/webgpu.js';
import { createView } from './view.js';

/** How far back the camera sits at zoom 1, and its lens. Where round the marble it is, is the view's (`view.js`). */
export const LENS = Object.freeze({ distance: 12, fov: 36 });

/** Where the key light comes from: high, behind the camera's left shoulder. */
const KEY = new GFX.Vector3(-0.3, 1, 0.6).normalize();

async function createRenderer(preference) {
  if (preference !== 'webgl' && typeof navigator !== 'undefined' && navigator.gpu) {
    const canvas = document.createElement('canvas');
    try {
      return new Renderer(await WebGPUBackend.create(canvas), canvas);
    } catch (err) {
      if (preference === 'webgpu') throw err;
      console.warn('madness: WebGPU unavailable, falling back to WebGL 2.', err);
    }
  }
  const canvas = document.createElement('canvas');
  return new Renderer(new WebGLBackend(canvas), canvas);
}

/**
 * The studio, as an equirectangular canvas: a dark room, lighter overhead,
 * with a broad softbox above, a warm strip on one side and a cool one on the
 * other. It is only ever seen in reflections.
 */
function paintStudio(width = 1024) {
  const height = width / 2;
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const wall = ctx.createLinearGradient(0, 0, 0, height);
  wall.addColorStop(0, '#5b6274');
  wall.addColorStop(0.35, '#272a36');
  wall.addColorStop(0.55, '#121319');
  wall.addColorStop(1, '#060608');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, width, height);

  const box = (x, y, w, h, colour, glow) => {
    ctx.save();
    ctx.shadowColor = colour;
    ctx.shadowBlur = glow;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, Math.min(w, h) * 0.2);
    ctx.fill();
    ctx.restore();
  };
  ctx.globalCompositeOperation = 'lighter';
  // Overhead: the top rows of the map are all round the zenith.
  ctx.fillStyle = 'rgba(255, 248, 238, 0.85)';
  ctx.fillRect(0, 0, width, height * 0.05);
  box(width * 0.3, height * 0.17, width * 0.2, height * 0.1, '#fff7ee', 40);
  box(width * 0.62, height * 0.42, width * 0.035, height * 0.34, '#ffc9a6', 30);
  box(width * 0.93, height * 0.4, width * 0.03, height * 0.3, '#b9d2ff', 26);
  box(width * 0.08, height * 0.45, width * 0.12, height * 0.035, '#ffffff', 20);
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

/** The sky round the scene: a deep blue haze at the horizon, dark above and below. */
function paintBackdrop(width = 1024) {
  const height = width / 2;
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#020205');
  g.addColorStop(0.38, '#0b0e1d');
  g.addColorStop(0.52, '#1a1f38');
  g.addColorStop(0.62, '#0c0f1e');
  g.addColorStop(1, '#010103');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  return c;
}

export async function createStage(host) {
  const preference = new URLSearchParams(globalThis.location?.search ?? '').get('renderer');
  const renderer = await createRenderer(preference);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = GFX.PCFShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new GFX.Scene();
  const camera = new GFX.PerspectiveCamera(LENS.fov, 1, 0.3, 400);

  if (renderer.isWebGPU && preference !== 'webgpu') {
    renderer.backend.onLost = () => {
      const old = renderer.domElement;
      const canvas = document.createElement('canvas');
      try {
        renderer.setBackend(new WebGLBackend(canvas), canvas);
        old.replaceWith(canvas);
        console.warn('madness: the GPU went away; carrying on with WebGL 2.');
      } catch (err) {
        console.error('madness: the GPU went away and WebGL 2 is not available.', err);
      }
    };
  }

  // Alan's stage rig: a soft wash, a shadow-casting key, a dim fill from behind.
  scene.add(new GFX.HemisphereLight(0xdfe4ff, 0x2a2630, 0.9));
  const key = new GFX.DirectionalLight(0xfff4e8, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.02;
  // The shadows cover what's in view: further out, a wider square.
  let span = 0;
  const shadowSpan = (zoom) => {
    const want = Math.ceil(14 * Math.max(1, zoom));
    if (want === span) return;
    span = want;
    Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 100 + span * 2 });
    key.shadow.camera.updateProjectionMatrix();
  };
  shadowSpan(1);
  scene.add(key, key.target);
  const fill = new GFX.DirectionalLight(0xfff4e6, 0.5);
  scene.add(fill, fill.target);

  // Opaque all round: the glass refracts whatever is behind it, and over
  // nothing at all it would bend the renderer's stand-in grey.
  const sky = paintBackdrop();
  const skyMap = sky ? new GFX.CanvasTexture(sky) : null;
  if (skyMap) skyMap.colorSpace = GFX.SRGBColorSpace;
  const backdrop = new GFX.Mesh(
    new GFX.SphereGeometry(300, 64, 32),
    new GFX.MeshBasicMaterial({ name: 'backdrop', map: skyMap, color: new GFX.Color(skyMap ? '#ffffff' : '#0b0e1d'), side: GFX.BackSide, depthWrite: false }),
  );
  backdrop.renderOrder = -1;
  backdrop.frustumCulled = false;
  backdrop.onBeforeRender = (r, s, cam) => {
    backdrop.position.copy(cam.position);
    backdrop.updateMatrixWorld();
  };
  scene.add(backdrop);

  const room = paintStudio();
  if (room) {
    const texture = new GFX.Texture(room);
    texture.mapping = GFX.EquirectangularReflectionMapping;
    texture.colorSpace = GFX.SRGBColorSpace;
    texture.needsUpdate = true;
    const pmrem = new GFX.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(texture).texture;
    pmrem.dispose();
  }

  const stage = {
    GFX, renderer, scene, camera, key,
    view: createView(),
    target: new GFX.Vector3(),
  };

  const direction = new GFX.Vector3();

  /** Point the camera and the lights at `stage.target`, from where the view is; called every frame. */
  stage.look = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    camera.aspect = w / h;
    // An upright phone sees as much course across as a wide screen does.
    camera.fov = LENS.fov * Math.max(1, Math.min(1.75, 0.8 * h / w));
    camera.updateProjectionMatrix();
    direction.set(...stage.view.direction());
    camera.position.copy(stage.target).addScaledVector(direction, LENS.distance * stage.view.zoom);
    shadowSpan(stage.view.zoom);
    camera.lookAt(stage.target);
    camera.updateMatrixWorld();
    key.position.copy(stage.target).addScaledVector(KEY, 45 + span);
    key.target.position.copy(stage.target);
    key.target.updateMatrixWorld();
    fill.position.copy(stage.target).add(new GFX.Vector3(6, 3, -5));
    fill.target.position.copy(stage.target);
    fill.target.updateMatrixWorld();
  };

  const fit = () => renderer.setSize(host.clientWidth || 1, host.clientHeight || 1);
  fit();
  new ResizeObserver(fit).observe(host);

  stage.render = () => renderer.render(scene, camera);
  return stage;
}
