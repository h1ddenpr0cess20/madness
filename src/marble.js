/**
 * The marble is Alan's eye (`alan/src/client/eye/model.js`): the same sphere
 * of clear glass — a transmissive physical material, index 1.5, all but
 * perfectly smooth, with a clearcoat — shrunk to a marble. Where Alan has an
 * iris, the marble has the Claude spark made three-dimensional: the
 * starburst's strokes sent out every way from the middle, a few dozen of
 * them — a Koosh ball, thinned out — fine at the heart and fuller toward
 * their rounded tips, as the strokes of the mark are. It turns with the
 * glass as the marble rolls.
 *
 * As with the iris, the spark is opaque: transmission only refracts what is
 * opaque, so that is what makes it show through the glass.
 */

/** In course tiles: a marble a little under three-quarters of a tile across. */
export const RADIUS = 0.36;

/** Claude's terracotta, with a little light of its own so it reads through the glass. */
export const SPARK = Object.freeze({ color: '#d97757', deep: '#a8452c', tip: '#f0a07c', glow: '#c96442' });

/**
 * The strands: a direction each — spread evenly over the sphere by the
 * golden angle, then nudged so it doesn't look machined — and a length as a
 * fraction of the spark's reach. Seeded, so every marble is the same marble.
 */
export function sparkRays({ count = 48, seed = 7 } = {}) {
  let s = seed;
  const random = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const rays = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const a = i * golden;
    const jitter = 0.16;
    let dx = Math.cos(a) * ring + (random() - 0.5) * jitter;
    let dy = y + (random() - 0.5) * jitter;
    let dz = Math.sin(a) * ring + (random() - 0.5) * jitter;
    const l = Math.hypot(dx, dy, dz);
    dx /= l; dy /= l; dz /= l;
    rays.push({ dir: [dx, dy, dz], length: 0.72 + random() * 0.28 });
  }
  return rays;
}

/**
 * One strand's profile, turned on a lathe round +y: from a fine root at the
 * middle, swelling a little along its length to a rounded tip `length` out.
 */
function strand(GFX, length, root, tip) {
  const points = [new GFX.Vector2(0, 0)];
  points.push(new GFX.Vector2(root, 0));
  const shaft = length - tip;
  for (let k = 1; k <= 4; k++) {
    const t = k / 4;
    points.push(new GFX.Vector2(root + (tip - root) * t * t, shaft * t));
  }
  for (let k = 1; k <= 4; k++) {
    const a = (k / 4) * (Math.PI / 2);
    points.push(new GFX.Vector2(Math.cos(a) * tip + 1e-5, shaft + Math.sin(a) * tip));
  }
  return new GFX.LatheGeometry(points, 10);
}

/** The spark's geometry, `reach` from the middle to the furthest tip, shaded deeper toward the heart. */
export function createSparkGeometry(GFX, reach, { rays = sparkRays() } = {}) {
  const up = new GFX.Vector3(0, 1, 0);
  const q = new GFX.Quaternion();
  const m = new GFX.Matrix4();
  const deep = new GFX.Color(SPARK.deep), mid = new GFX.Color(SPARK.color), bright = new GFX.Color(SPARK.tip);
  const positions = [], normals = [], colours = [];
  const add = (geometry, shade) => {
    const flat = geometry.toNonIndexed();
    const p = flat.attributes.position.array, n = flat.attributes.normal.array;
    for (let i = 0; i < p.length; i += 3) {
      positions.push(p[i], p[i + 1], p[i + 2]);
      normals.push(n[i], n[i + 1], n[i + 2]);
      const c = shade(Math.hypot(p[i], p[i + 1], p[i + 2]) / reach);
      colours.push(c.r, c.g, c.b);
    }
  };
  const c = new GFX.Color();
  const shade = (t) => (t < 0.6
    ? c.copy(deep).lerp(mid, t / 0.6)
    : c.copy(mid).lerp(bright, (t - 0.6) / 0.4));
  for (const ray of rays) {
    const g = strand(GFX, reach * ray.length, reach * 0.02, reach * 0.055);
    q.setFromUnitVectors(up, new GFX.Vector3(...ray.dir));
    m.makeRotationFromQuaternion(q);
    g.applyMatrix4(m);
    add(g, shade);
  }
  add(new GFX.SphereGeometry(reach * 0.13, 24, 16), shade);
  const out = new GFX.BufferGeometry();
  out.setAttribute('position', new GFX.BufferAttribute(new Float32Array(positions), 3));
  out.setAttribute('normal', new GFX.BufferAttribute(new Float32Array(normals), 3));
  out.setAttribute('color', new GFX.BufferAttribute(new Float32Array(colours), 3));
  return out;
}

/**
 * The marble as a group, centred on its middle: `spin` is the part that
 * turns as it rolls (glass and spark together).
 */
export function createMarble(GFX, { radius = RADIUS } = {}) {
  const R = radius;
  // Alan's glass, to the digit, scaled with the ball.
  const scale = R / 0.8;
  const glass = new GFX.Mesh(
    new GFX.SphereGeometry(R, 128, 96),
    new GFX.MeshPhysicalMaterial({
      name: 'glass',
      color: new GFX.Color('#ffffff'),
      metalness: 0,
      roughness: 0.02,
      transmission: 1,
      thickness: 0.4 * scale,
      ior: 1.5,
      attenuationColor: new GFX.Color('#e4f2ff'),
      attenuationDistance: 5 * scale,
      clearcoat: 0.6,
      clearcoatRoughness: 0.02,
      specularIntensity: 1,
    }),
  );
  glass.name = 'glass';
  // Clear glass casts next to no shadow; the spark inside casts its own.
  glass.castShadow = false;

  const spark = new GFX.Mesh(
    createSparkGeometry(GFX, R * 0.82),
    new GFX.MeshStandardMaterial({
      name: 'spark',
      color: new GFX.Color('#ffffff'),
      vertexColors: true,
      roughness: 0.38,
      metalness: 0,
      emissive: new GFX.Color(SPARK.glow),
      emissiveIntensity: 0.22,
    }),
  );
  spark.name = 'spark';
  spark.castShadow = true;

  const spin = new GFX.Group();
  spin.add(spark, glass);
  const marble = new GFX.Group();
  marble.name = 'marble';
  marble.add(spin);
  return { marble, spin, glass, spark };
}
