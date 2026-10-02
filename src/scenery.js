/**
 * The course as it is drawn: tiles with grid lines, walls that fall away into
 * the dark, a banner over the goal.
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

/** "GOAL" on a banner over the finish, as the arcade had it. */
export function createGoalBanner(GFX, course) {
  if (typeof document === 'undefined') return null;
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
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d97757';
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(10, 10, 492, 140);
  ctx.fillStyle = '#1c1b1a';
  ctx.font = '900 112px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GOAL', 256, 86);
  const texture = new GFX.CanvasTexture(c);
  texture.colorSpace = GFX.SRGBColorSpace;
  const sprite = new GFX.Sprite(new GFX.SpriteMaterial({ map: texture, transparent: false }));
  sprite.scale.set(3.2, 1, 1);
  sprite.position.set((x0 + x1) / 2, y + 2.2, (z0 + z1) / 2);
  sprite.name = 'goal-banner';
  return sprite;
}
