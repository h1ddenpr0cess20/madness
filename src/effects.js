import { createSparkGeometry, RADIUS, SPARK } from './marble.js';

/**
 * Bits that fly: the glass and the spark when the marble breaks, bubbles when
 * the acid gets it, confetti at the goal. Each bit is ballistic, bounces off
 * the course once or twice, and shrinks away.
 */

const GRAVITY = 18;

function shardGeometry(GFX) {
  // A thin, irregular sliver: four points, four faces.
  const p = [[0, 0.09, 0], [-0.07, -0.04, 0.02], [0.08, -0.05, -0.01], [0.01, -0.02, 0.05]];
  const faces = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]];
  const position = new Float32Array(faces.flatMap((f) => f.flatMap((i) => p[i])));
  const g = new GFX.BufferGeometry();
  g.setAttribute('position', new GFX.BufferAttribute(position, 3));
  g.computeVertexNormals();
  return g;
}

export function createEffects(GFX, scene) {
  const group = new GFX.Group();
  group.name = 'effects';
  scene.add(group);
  let course = null;
  const bits = [];

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

  function spawn(mesh, { x, y, z, vx, vy, vz, life, spin = 6, drag = 0, floaty = 1, bounce = 0.35 }) {
    mesh.position.set(x, y, z);
    mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    group.add(mesh);
    bits.push({
      mesh, vx, vy, vz, life, age: 0, drag, floaty, bounce,
      spin: [(Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin],
      scale: mesh.scale.x,
    });
  }

  const outward = (speed, up) => {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.6);
    return [Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s];
  };

  return {
    setCourse(c) {
      course = c;
      for (const b of bits) group.remove(b.mesh);
      bits.length = 0;
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

    update(dt) {
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.age += dt;
        if (b.age >= b.life) {
          group.remove(b.mesh);
          bits.splice(i, 1);
          continue;
        }
        const m = b.mesh;
        b.vy -= GRAVITY * b.floaty * dt;
        const k = Math.max(0, 1 - b.drag * dt);
        b.vx *= k; b.vy *= b.drag ? Math.max(0, 1 - b.drag * 0.5 * dt) : 1; b.vz *= k;
        m.position.x += b.vx * dt;
        m.position.y += b.vy * dt;
        m.position.z += b.vz * dt;
        const ground = course?.heightAt(m.position.x, m.position.z);
        if (ground != null && b.bounce > 0 && m.position.y < ground + 0.03 && m.position.y > ground - 0.4 && b.vy < 0) {
          m.position.y = ground + 0.03;
          b.vy *= -b.bounce;
          b.vx *= 0.55; b.vz *= 0.55;
          b.spin = b.spin.map((s) => s * 0.5);
        } else if (ground != null && b.bounce === 0 && m.position.y < ground + 0.02 && m.position.y > ground - 0.4) {
          m.position.y = ground + 0.02;
          b.vx = b.vy = b.vz = 0;
          b.spin = [0, 0, 0];
        }
        m.rotation.x += b.spin[0] * dt;
        m.rotation.y += b.spin[1] * dt;
        m.rotation.z += b.spin[2] * dt;
        const fade = Math.min(1, (b.life - b.age) / 0.4);
        m.scale.setScalar(b.scale * fade);
      }
    },
  };
}
