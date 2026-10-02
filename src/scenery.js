/**
 * The course as it is drawn: bevelled glossy tiles, walls that fall away
 * into the dark, a gate over the goal.
 */

const textures = new Map();

/**
 * A tile's face, `w` by `d` tiles of it: a colour map and a height map for
 * the bump. Each tile is a slab with softly bevelled edges, set in a narrow
 * dark joint. The colour map is near white because the colour comes from the
 * tile underneath — the course's own colours, chequered — and it only
 * multiplies it.
 */
export function tileTexture(GFX, w = 1, d = 1) {
  if (typeof document === 'undefined') return { map: null, bump: null };
  const key = `${w}x${d}`;
  if (textures.has(key)) return textures.get(key);
  const cell = 256;
  const joint = 5, bevel = 16;
  const paint = (face, edge, groove) => {
    const c = document.createElement('canvas');
    c.width = cell * w;
    c.height = cell * d;
    const ctx = c.getContext('2d');
    ctx.fillStyle = groove;
    ctx.fillRect(0, 0, c.width, c.height);
    for (let j = 0; j < d; j++) {
      for (let i = 0; i < w; i++) {
        const x = i * cell, y = j * cell;
        // The bevel as nested rounded squares, from the joint up to the face.
        for (let k = 0; k <= bevel; k++) {
          const t = k / bevel;
          const e = Math.sin(t * Math.PI / 2);
          ctx.fillStyle = mix(edge, face, e);
          const inset = joint + k;
          ctx.beginPath();
          ctx.roundRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2, 22 - k);
          ctx.fill();
        }
      }
    }
    const texture = new GFX.CanvasTexture(c);
    texture.anisotropy = 8;
    return texture;
  };
  const map = paint('#ffffff', '#c9c6d2', '#3a3644');
  map.colorSpace = GFX.SRGBColorSpace;
  const bump = paint('#ffffff', '#5a5a5a', '#000000');
  const pair = { map, bump };
  textures.set(key, pair);
  return pair;
}

function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
}

/** The meshes for a built course (see `buildCourse`). */
export function createCourseMeshes(GFX, built) {
  const group = new GFX.Group();
  group.name = 'course';

  const geometry = (parts) => {
    const g = new GFX.BufferGeometry();
    g.setAttribute('position', new GFX.BufferAttribute(parts.position, 3));
    g.setAttribute('normal', new GFX.BufferAttribute(parts.normal, 3));
    g.setAttribute('color', new GFX.BufferAttribute(parts.color, 3));
    if (parts.uv) g.setAttribute('uv', new GFX.BufferAttribute(parts.uv, 2));
    g.computeBoundingSphere();
    return g;
  };

  const { map, bump } = tileTexture(GFX);
  const tops = new GFX.Mesh(geometry(built.tops), new GFX.MeshPhysicalMaterial({
    name: 'tiles', vertexColors: true, map, bumpMap: bump, bumpScale: 1.5,
    roughness: 0.34, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.12,
  }));
  const walls = new GFX.Mesh(geometry(built.walls), new GFX.MeshPhysicalMaterial({
    name: 'walls', vertexColors: true, roughness: 0.5, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.3,
  }));
  for (const m of [tops, walls]) {
    m.receiveShadow = true;
    m.castShadow = true;
    m.frustumCulled = false;
    group.add(m);
  }
  return group;
}

/**
 * The finish gate: two posts and a crossbar with GOAL on it, standing across
 * the side of the chequered goal the course comes in from.
 */
export function createGoalGate(GFX, course) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y = -Infinity;
  for (let z = 0; z < course.rows; z++) {
    for (let x = 0; x < course.cols; x++) {
      const c = course.cell(x, z);
      if (c?.kind !== 'goal') continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1);
      z0 = Math.min(z0, z); z1 = Math.max(z1, z + 1);
      y = Math.max(y, ...c.h);
    }
  }
  if (!Number.isFinite(y)) return null;

  // Which side the course comes in from: the one with the most course next to it.
  const count = (cells) => cells.filter(([x, z]) => {
    const c = course.cell(x, z);
    return c && c.kind !== 'goal';
  }).length;
  const span = (a, b, f) => Array.from({ length: b - a }, (_, i) => f(a + i));
  const sides = [
    { n: count(span(x0, x1, (x) => [x, z0 - 1])), along: 'x', at: z0 },
    { n: count(span(x0, x1, (x) => [x, z1])), along: 'x', at: z1 },
    { n: count(span(z0, z1, (z) => [x0 - 1, z])), along: 'z', at: x0 },
    { n: count(span(z0, z1, (z) => [x1, z])), along: 'z', at: x1 },
  ].sort((a, b) => b.n - a.n);
  const side = sides[0];
  const [from, to] = side.along === 'x' ? [x0, x1] : [z0, z1];
  const width = to - from;
  const height = 2.3;

  const gate = new GFX.Group();
  gate.name = 'goal-gate';
  const steel = new GFX.MeshPhysicalMaterial({ name: 'gate', color: new GFX.Color('#e8e4dc'), metalness: 0.9, roughness: 0.18, clearcoat: 0.6 });
  const glow = new GFX.MeshStandardMaterial({ name: 'gate-light', color: new GFX.Color('#d97757'), emissive: new GFX.Color('#d97757'), emissiveIntensity: 1.4 });

  const sign = goalSign(GFX, width);
  const face = new GFX.MeshStandardMaterial({ name: 'goal-sign', color: new GFX.Color('#ffffff'), map: sign, roughness: 0.45, emissive: new GFX.Color('#ffffff'), emissiveIntensity: 0.15 });
  const board = new GFX.MeshStandardMaterial({ name: 'goal-board', color: new GFX.Color('#d97757'), roughness: 0.45 });
  const bar = side.along === 'x'
    ? new GFX.Mesh(new GFX.BoxGeometry(width, 0.55, 0.16), [board, board, board, board, face, face])
    : new GFX.Mesh(new GFX.BoxGeometry(0.16, 0.55, width), [face, face, board, board, board, board]);
  const place = (mesh, a, up, b = side.at) => {
    if (side.along === 'x') mesh.position.set(a, up, b);
    else mesh.position.set(b, up, a);
  };
  place(bar, from + width / 2, y + height);
  gate.add(bar);
  for (const a of [from + 0.12, to - 0.12]) {
    const post = new GFX.Mesh(new GFX.CylinderGeometry(0.07, 0.09, height + 0.3, 20), steel);
    place(post, a, y + (height + 0.3) / 2);
    const lamp = new GFX.Mesh(new GFX.SphereGeometry(0.13, 20, 14), glow);
    place(lamp, a, y + height + 0.42);
    gate.add(post, lamp);
  }
  gate.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return gate;
}

/** The sign on the gate: GOAL between chequered ends, sized to the bar. */
function goalSign(GFX, width) {
  if (typeof document === 'undefined') return null;
  const h = 128, w = Math.round(h * width / 0.55);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, w, h);
  const sq = h / 4;
  for (const x0 of [0, w - sq * 3]) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#f4f1ea' : '#1c1b1a';
        ctx.fillRect(x0 + i * sq, j * sq, sq, sq);
      }
    }
  }
  ctx.fillStyle = '#1c1b1a';
  ctx.font = `800 ${Math.round(h * 0.72)}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GOAL', w / 2, h * 0.54);
  const t = new GFX.CanvasTexture(c);
  t.colorSpace = GFX.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
