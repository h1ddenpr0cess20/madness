import { createEffects as createEngineEffects, outward, shardGeometry } from 'madness-engine/effects';
import { createSparkGeometry, RADIUS, SPARK } from 'madness-engine/heroes/marble';

/**
 * Bits that fly, on the engine's (`madness-engine/effects`): the glass and
 * the spark when the marble breaks, bubbles when the acid gets it, confetti
 * at the goal. Each bit is ballistic, bounces off the course once or twice,
 * and shrinks away.
 */

export function createEffects(GFX, scene) {
  const effects = createEngineEffects(GFX, scene);
  const { spawn } = effects;

  const glass = new GFX.MeshPhysicalMaterial({
    name: 'shard', color: new GFX.Color('#ffffff'), roughness: 0.05, transmission: 1, thickness: 0.05, ior: 1.5,
    clearcoat: 0.5, specularIntensity: 1, side: GFX.DoubleSide,
  });
  const shard = shardGeometry(GFX);
  const sparkGeometry = createSparkGeometry(GFX, RADIUS * 0.82);
  const sparkMaterial = new GFX.MeshStandardMaterial({
    name: 'spark-bit', color: new GFX.Color('#ffffff'), vertexColors: true, emissive: new GFX.Color(SPARK.glow), emissiveIntensity: 0.22, roughness: 0.38,
  });
  const bubble = new GFX.SphereGeometry(0.07, 12, 8);
  const acid = new GFX.MeshStandardMaterial({ name: 'bubble', color: new GFX.Color('#8dff52'), emissive: new GFX.Color('#2fa000'), emissiveIntensity: 0.8, roughness: 0.2 });
  const paper = new GFX.PlaneGeometry(0.16, 0.1);
  const confettiColours = ['#d97757', '#f4f1ea', '#e8b04a', '#6a9bcc', '#bcd1a0'].map((c) => new GFX.MeshBasicMaterial({ color: new GFX.Color(c), side: GFX.DoubleSide }));

  return {
    setCourse(c) {
      effects.setGround(c);
      effects.clear();
    },

    /** The marble in pieces: glass everywhere, and the spark's rays scattered with it. */
    shatter(x, y, z, vx = 0, vz = 0) {
      for (let i = 0; i < 34; i++) {
        const m = new GFX.Mesh(shard, glass);
        m.scale.setScalar(0.6 + Math.random() * 1.1);
        const [ox, oy, oz] = outward(4.5, 5);
        spawn(m, { x: x + ox * 0.04, y: y + oy * 0.03, z: z + oz * 0.04, vx: ox + vx * 0.3, vy: oy, vz: oz + vz * 0.3, life: 1.6 + Math.random() * 0.8, spin: 18 });
      }
      // The spark comes out whole, and tumbles away.
      const m = new GFX.Mesh(sparkGeometry, sparkMaterial);
      m.castShadow = true;
      spawn(m, { x, y, z, vx: vx * 0.4, vy: 5, vz: vz * 0.4, life: 2.4, spin: 9, bounce: 0.45 });
    },

    /** Eaten by acid: green bubbles where it was. */
    dissolve(x, y, z) {
      for (let i = 0; i < 26; i++) {
        const m = new GFX.Mesh(bubble, acid);
        m.scale.setScalar(0.5 + Math.random() * 1.4);
        const [ox, , oz] = outward(0.6, 0);
        spawn(m, { x: x + ox * 0.3, y: y - 0.2, z: z + oz * 0.3, vx: ox, vy: 1 + Math.random() * 1.5, vz: oz, life: 0.8 + Math.random() * 0.9, floaty: -0.15, spin: 0 });
      }
    },

    confetti(x, y, z) {
      for (let i = 0; i < 80; i++) {
        const m = new GFX.Mesh(paper, confettiColours[i % confettiColours.length]);
        const [ox, oy, oz] = outward(3, 7);
        spawn(m, { x, y, z, vx: ox, vy: oy, vz: oz, life: 2.6 + Math.random(), spin: 14, drag: 1.6, floaty: 0.35, bounce: 0 });
      }
    },

    update: effects.update,
  };
}
