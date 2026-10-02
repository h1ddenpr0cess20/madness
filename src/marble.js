/**
 * The marble is Alan's eye (`alan/src/client/eye/model.js`): the same sphere
 * of clear glass — a transmissive physical material, index 1.5, all but
 * perfectly smooth, with a clearcoat — shrunk to a marble. Where Alan has an
 * iris, the marble has the Claude spark: the starburst cut out and given
 * depth, bevelled, hanging in the middle of the ball like the vane of a
 * cat's-eye. It turns with the glass as the marble rolls, so you see it face
 * on, edge on and everything between.
 *
 * As with the iris, the spark is opaque: transmission only refracts what is
 * opaque, so that is what makes it show through the glass.
 */

/** In course tiles: a marble a little under three-quarters of a tile across. */
export const RADIUS = 0.36;

/** Claude's terracotta, with a little light of its own so it reads through the glass. */
export const SPARK = Object.freeze({ color: '#d97757', glow: '#c96442' });

/**
 * The spark's rays, as the mark draws them: twelve strokes out from the
 * middle at not-quite-even angles, some longer than others, each a little
 * fuller toward its blunt tip. Lengths are fractions of the spark's reach.
 */
export const RAYS = Object.freeze([
  [0, 1], [29, 0.8], [61, 0.97], [90, 0.84], [118, 1], [151, 0.78],
  [180, 0.95], [209, 0.86], [241, 1], [270, 0.8], [299, 0.93], [331, 0.85],
].map(([deg, length]) => Object.freeze({ angle: (deg + 8) * Math.PI / 180, length })));

/** The outline of the spark, `reach` from the middle to the furthest tip. */
export function sparkShape(GFX, reach, rays = RAYS) {
  const hub = reach * 0.2;
  const base = reach * 0.042;
  const tip = reach * 0.078;
  const shape = new GFX.Shape();
  const at = (d, p, along, across) => [d[0] * along + p[0] * across, d[1] * along + p[1] * across];
  rays.forEach((ray, i) => {
    const d = [Math.cos(ray.angle), Math.sin(ray.angle)];
    const p = [-d[1], d[0]];
    const end = reach * ray.length - tip;
    const start = at(d, p, hub, -base);
    if (i === 0) shape.moveTo(...start); else shape.lineTo(...start);
    shape.lineTo(...at(d, p, end, -tip));
    shape.quadraticCurveTo(...at(d, p, end + tip * 1.15, -tip), ...at(d, p, end + tip * 1.15, 0));
    shape.quadraticCurveTo(...at(d, p, end + tip * 1.15, tip), ...at(d, p, end, tip));
    shape.lineTo(...at(d, p, hub, base));
  });
  const first = rays[0];
  const d = [Math.cos(first.angle), Math.sin(first.angle)];
  shape.lineTo(...at(d, [-d[1], d[0]], hub, -base));
  return shape;
}

/** The spark as a solid: the outline pushed out to `depth` and bevelled, centred on the origin. */
export function createSparkGeometry(GFX, reach, { depth = reach * 0.16 } = {}) {
  const bevel = reach * 0.035;
  const geometry = new GFX.ExtrudeGeometry(sparkShape(GFX, reach), {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: reach * 0.022, bevelSegments: 3, curveSegments: 6,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
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
    createSparkGeometry(GFX, R * 0.8),
    new GFX.MeshStandardMaterial({
      name: 'spark',
      color: new GFX.Color(SPARK.color),
      roughness: 0.45,
      metalness: 0,
      emissive: new GFX.Color(SPARK.glow),
      emissiveIntensity: 0.3,
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
