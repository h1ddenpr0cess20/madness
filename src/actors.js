import { createBall, collideBalls, placeBall, PUSH, rollSpin, stepBall, turn } from './physics.js';
import { tileTexture } from './scenery.js';

/**
 * Everything on a course that moves and isn't the marble: steelies (black
 * marbles that come for you), acid slimes (touch one and the marble is gone),
 * hammers (they slam down on the path), and lifts (platforms that carry the
 * marble over a gap or down a shaft).
 */

const STEELIE_RADIUS = 0.36;
const STEELIE_MASS = 1.8;
const HAMMER_HEIGHT = 0.9;
const LIFT_THICKNESS = 0.5;

const smooth = (t) => t * t * (3 - 2 * t);

/**
 * How far up a hammer is, from 0 (down on the path) to 1 (all the way up):
 * a slow climb, a wait at the top, a slam, and a wait at the bottom.
 */
export function hammerAt(time, period, phase = 0) {
  const u = ((((time + phase) / period) % 1) + 1) % 1;
  if (u < 0.5) return smooth(u / 0.5);
  if (u < 0.78) return 1;
  if (u < 0.84) {
    const t = (u - 0.78) / 0.06;
    return 1 - t * t;
  }
  return 0;
}

/** How far along its run a lift is, 0 to 1 and back, waiting `pause` (of a period) at each end. */
export function liftAt(time, period, phase = 0, pause = 0.18) {
  const u = ((((time + phase) / period) % 1) + 1) % 1;
  const run = 0.5 - pause;
  if (u < pause) return 0;
  if (u < 0.5) return smooth((u - pause) / run);
  if (u < 0.5 + pause) return 1;
  return 1 - smooth((u - 0.5 - pause) / run);
}

/** Where along a closed loop of points something is, `distance` round it. */
export function alongLoop(points, distance) {
  const legs = points.map((p, i) => {
    const q = points[(i + 1) % points.length];
    return { p, q, length: Math.hypot(q[0] - p[0], q[1] - p[1]) };
  });
  const total = legs.reduce((sum, l) => sum + l.length, 0) || 1;
  let d = ((distance % total) + total) % total;
  for (const leg of legs) {
    if (d <= leg.length) {
      const t = leg.length ? d / leg.length : 0;
      return [leg.p[0] + (leg.q[0] - leg.p[0]) * t, leg.p[1] + (leg.q[1] - leg.p[1]) * t];
    }
    d -= leg.length;
  }
  return points[0];
}

/** Black-and-yellow, for the sides of the hammers. */
function hazardTexture(GFX) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1d1d22';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#f2c230';
  for (let i = -128; i < 256; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i + 20, 0); ctx.lineTo(i + 20 + 128, 128); ctx.lineTo(i + 128, 128);
    ctx.fill();
  }
  const t = new GFX.CanvasTexture(c);
  t.colorSpace = GFX.SRGBColorSpace;
  return t;
}

export function createActors(GFX, course, world, { killY }) {
  const group = new GFX.Group();
  group.name = 'actors';

  // Steelies.
  const steelMaterial = new GFX.MeshPhysicalMaterial({
    name: 'steelie', color: new GFX.Color('#2b2d33'), metalness: 1, roughness: 0.16, clearcoat: 0.5, clearcoatRoughness: 0.1,
  });
  const steelGeometry = new GFX.SphereGeometry(STEELIE_RADIUS, 40, 28);
  const steelies = course.steelies.map((s) => {
    const y = (course.heightAt(s.x, s.z) ?? 0) + STEELIE_RADIUS;
    const mesh = new GFX.Mesh(steelGeometry, steelMaterial);
    mesh.castShadow = true;
    group.add(mesh);
    return {
      home: [s.x, y, s.z], range: s.range,
      ball: createBall({ x: s.x, y, z: s.z, r: STEELIE_RADIUS, mass: STEELIE_MASS }),
      mesh, q: [0, 0, 0, 1], spin: [0, 0, 0], gone: 0,
    };
  });

  // Slimes.
  const slimeMaterial = new GFX.MeshStandardMaterial({
    name: 'slime', color: new GFX.Color('#7dff3c'), roughness: 0.25, metalness: 0,
    emissive: new GFX.Color('#2fa000'), emissiveIntensity: 0.55,
  });
  const slimeGeometry = new GFX.SphereGeometry(0.5, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const slimes = course.slimes.map((s, i) => {
    const mesh = new GFX.Mesh(slimeGeometry, slimeMaterial);
    mesh.castShadow = true;
    group.add(mesh);
    return { ...s, mesh, x: s.points[0][0], y: 0, z: s.points[0][1], travelled: i * 1.7 };
  });

  // Hammers.
  const hazard = hazardTexture(GFX);
  const headMaterial = new GFX.MeshStandardMaterial({ name: 'hammer', color: new GFX.Color('#ffffff'), map: hazard, roughness: 0.5, metalness: 0.2 });
  const shaftMaterial = new GFX.MeshStandardMaterial({ name: 'shaft', color: new GFX.Color('#8a8d96'), roughness: 0.35, metalness: 0.8 });
  const hammers = course.hammers.map((h) => {
    let base = -Infinity;
    for (let j = h.z; j < h.z + h.d; j++) {
      for (let i = h.x; i < h.x + h.w; i++) {
        const c = course.cell(i, j);
        if (c) base = Math.max(base, ...c.h);
      }
    }
    const inset = 0.06;
    const box = {
      solid: true, kind: 'hammer', vx: 0, vy: 0, vz: 0,
      min: [h.x + inset, base, h.z + inset], max: [h.x + h.w - inset, base + HAMMER_HEIGHT, h.z + h.d - inset],
    };
    const head = new GFX.Mesh(new GFX.BoxGeometry(h.w - inset * 2, HAMMER_HEIGHT, h.d - inset * 2), headMaterial);
    const shaft = new GFX.Mesh(new GFX.CylinderGeometry(0.11, 0.11, 6, 12), shaftMaterial);
    shaft.position.y = HAMMER_HEIGHT / 2 + 3;
    head.add(shaft);
    head.castShadow = shaft.castShadow = true;
    head.receiveShadow = true;
    group.add(head);
    return { ...h, base, box, mesh: head };
  });

  // Lifts.
  const lifts = course.lifts.map((l) => {
    const material = new GFX.MeshStandardMaterial({
      name: 'lift', color: new GFX.Color(course.palette.tiles[2 % course.palette.tiles.length]),
      map: tileTexture(GFX, l.w, l.d).map, bumpMap: tileTexture(GFX, l.w, l.d).bump, bumpScale: 1.5, roughness: 0.34,
    });
    const mesh = new GFX.Mesh(new GFX.BoxGeometry(l.w, LIFT_THICKNESS, l.d), material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    const box = {
      solid: true, kind: 'lift', vx: 0, vy: 0, vz: 0,
      min: [l.x, l.h - LIFT_THICKNESS, l.z], max: [l.x + l.w, l.h, l.z + l.d],
    };
    return { ...l, box, mesh };
  });

  world.boxes = [...hammers.map((h) => h.box), ...lifts.map((l) => l.box)];

  const moveBox = (box, x, y, z, dt) => {
    if (dt > 0) {
      box.vx = (x - box.min[0]) / dt;
      box.vy = (y - box.min[1]) / dt;
      box.vz = (z - box.min[2]) / dt;
    }
    const sx = box.max[0] - box.min[0], sy = box.max[1] - box.min[1], sz = box.max[2] - box.min[2];
    box.min[0] = x; box.min[1] = y; box.min[2] = z;
    box.max[0] = x + sx; box.max[1] = y + sy; box.max[2] = z + sz;
  };

  /** Puts the kinematic things where they are at `time`. */
  function place(time, dt = 0) {
    for (const h of hammers) {
      moveBox(h.box, h.box.min[0], h.base + h.lift * hammerAt(time, h.period, h.phase), h.box.min[2], dt);
    }
    for (const l of lifts) {
      const s = liftAt(time, l.period, l.phase, l.pause);
      moveBox(l.box, l.x + l.to[0] * s, l.h - LIFT_THICKNESS + l.to[1] * s, l.z + l.to[2] * s, dt);
    }
  }
  place(0);

  return {
    group, steelies, slimes, hammers, lifts,
    place,

    /**
     * One physics step for everything that moves on its own. `marble` is the
     * player's ball, or null while there isn't one to chase. Returns what
     * happened to the marble: a hit from a steelie, or a slime touching it.
     */
    step(dt, time, marble) {
      const events = { bump: 0, slimed: false };
      for (const s of steelies) {
        const b = s.ball;
        if (s.gone > 0) {
          s.gone -= dt;
          if (s.gone <= 0) placeBall(b, ...s.home);
          continue;
        }
        let ax = 0, az = 0;
        const dx = marble ? marble.x - b.x : 0, dz = marble ? marble.z - b.z : 0;
        const dist = Math.hypot(dx, dz);
        if (marble && dist < s.range && Math.abs(marble.y - b.y) < 2.5 && dist > 1e-3) {
          ax = dx / dist; az = dz / dist;
        } else {
          const hx = s.home[0] - b.x, hz = s.home[2] - b.z, hd = Math.hypot(hx, hz);
          if (hd > 0.6) { ax = (hx / hd) * 0.5; az = (hz / hd) * 0.5; }
        }
        stepBall(b, world, ax, az, dt, { push: PUSH * 0.55, topSpeed: 4.8 });
        if (marble) events.bump = Math.max(events.bump, collideBalls(marble, b, 0.85));
        if (b.y < killY) s.gone = 3;
      }
      for (let i = 0; i < steelies.length; i++) {
        for (let j = i + 1; j < steelies.length; j++) collideBalls(steelies[i].ball, steelies[j].ball, 0.85);
      }

      for (const s of slimes) {
        s.travelled += s.speed * dt;
        const [x, z] = alongLoop(s.points, s.travelled);
        s.x = x; s.z = z;
        s.y = course.heightAt(x, z) ?? s.y;
        if (marble) {
          const d = Math.hypot(marble.x - x, marble.z - z);
          if (d < 0.42 + marble.r * 0.7 && Math.abs(marble.y - marble.r - s.y) < 0.6) events.slimed = true;
        }
      }
      return events;
    },

    /** Meshes to match the state, once a frame. */
    sync(dt, time) {
      for (const s of steelies) {
        const b = s.ball;
        s.mesh.visible = s.gone <= 0;
        s.mesh.position.set(b.x, b.y, b.z);
        if (b.grounded) rollSpin(b, s.spin);
        turn(s.q, s.spin, dt);
        s.mesh.quaternion.set(s.q[0], s.q[1], s.q[2], s.q[3]);
      }
      for (const [i, s] of slimes.entries()) {
        const wobble = Math.sin(time * 7 + i * 2);
        s.mesh.position.set(s.x, s.y + 0.01, s.z);
        s.mesh.scale.set(1 + wobble * 0.08, 0.55 - wobble * 0.08, 1 - wobble * 0.06);
        s.mesh.rotation.y = time * 0.8 + i;
      }
      for (const h of hammers) {
        h.mesh.position.set((h.box.min[0] + h.box.max[0]) / 2, (h.box.min[1] + h.box.max[1]) / 2, (h.box.min[2] + h.box.max[2]) / 2);
      }
      for (const l of lifts) {
        l.mesh.position.set((l.box.min[0] + l.box.max[0]) / 2, (l.box.min[1] + l.box.max[1]) / 2, (l.box.min[2] + l.box.max[2]) / 2);
      }
    },
  };
}
