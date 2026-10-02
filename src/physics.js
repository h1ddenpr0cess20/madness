/**
 * Ball physics: spheres rolling over a triangle soup (the course) and a few
 * moving boxes (hammers, lifts). No engine — the marble is the only thing
 * that has to feel right, so it is done by hand: gravity and a push from the
 * controls, then the sphere is pushed out of whatever it sinks into and loses
 * the velocity it had into it.
 *
 * Units are course cells: one tile is 1 × 1, and heights are in the same unit.
 */

export const GRAVITY = 24;

/** How hard the controls push, on the ground and in the air. */
export const PUSH = 17;
export const AIR_PUSH = 5;

/** The controls stop adding speed past this; gravity doesn't. */
export const TOP_SPEED = 9;

/** No ball goes faster than this, whatever it falls off. */
export const MAX_SPEED = 26;

/** Rolling resistance on the ground, per second. */
export const ROLL_DRAG = 0.55;

/**
 * A marble dropped further than this onto level ground breaks. What it goes
 * by is how hard it lands — `BREAK_SPEED`, the speed a drop that high lands
 * at — so coming down a long way onto a slope it meets at a glance is
 * survivable, as it is in the arcade.
 */
export const FALL_LIMIT = 4.25;
export const BREAK_SPEED = Math.sqrt(2 * GRAVITY * FALL_LIMIT);

/** Impacts harder than this bounce; softer ones just stop. */
const BOUNCE_FROM = 4;
const BOUNCE = 0.32;

/** A contact this much "up" or more counts as standing on something. */
const FLOOR = 0.45;

const PASSES = 3;

/**
 * The point on triangle (a, b, c) nearest p, written to `out` as [x, y, z].
 * Ericson, Real-Time Collision Detection §5.1.5, unrolled for flat arrays.
 */
export function closestOnTriangle(px, py, pz, t, i, out) {
  const ax = t[i], ay = t[i + 1], az = t[i + 2];
  const bx = t[i + 3], by = t[i + 4], bz = t[i + 5];
  const cx = t[i + 6], cy = t[i + 7], cz = t[i + 8];
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) { out[0] = ax; out[1] = ay; out[2] = az; return; }

  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) { out[0] = bx; out[1] = by; out[2] = bz; return; }

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    out[0] = ax + abx * v; out[1] = ay + aby * v; out[2] = az + abz * v;
    return;
  }

  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) { out[0] = cx; out[1] = cy; out[2] = cz; return; }

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    out[0] = ax + acx * w; out[1] = ay + acy * w; out[2] = az + acz * w;
    return;
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    out[0] = bx + (cx - bx) * w; out[1] = by + (cy - by) * w; out[2] = bz + (cz - bz) * w;
    return;
  }

  const denom = 1 / (va + vb + vc);
  const v = vb * denom, w = vc * denom;
  out[0] = ax + abx * v + acx * w;
  out[1] = ay + aby * v + acy * w;
  out[2] = az + abz * v + acz * w;
}

/**
 * Everything a ball can hit that doesn't move — triangles, bucketed on a grid
 * of course cells so a ball only looks at the few under it — and the moving
 * boxes, which are few enough to check every time.
 */
export class World {
  constructor({ cols, rows }) {
    this.cols = cols;
    this.rows = rows;
    this._tris = [];
    this._buckets = Array.from({ length: cols * rows }, () => []);
    this.triangles = new Float32Array(0);
    this.normals = new Float32Array(0);
    this._seen = new Uint32Array(0);
    this._stamp = 0;
    this.boxes = [];
  }

  addTriangle(ax, ay, az, bx, by, bz, cx, cy, cz) {
    const index = this._tris.length / 9;
    this._tris.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx) - 1e-4));
    const x1 = Math.min(this.cols - 1, Math.floor(Math.max(ax, bx, cx) + 1e-4));
    const z0 = Math.max(0, Math.floor(Math.min(az, bz, cz) - 1e-4));
    const z1 = Math.min(this.rows - 1, Math.floor(Math.max(az, bz, cz) + 1e-4));
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) this._buckets[z * this.cols + x].push(index);
    }
  }

  /** Freeze the triangles into flat arrays and work out their normals. */
  finish() {
    const t = this.triangles = Float32Array.from(this._tris);
    this._tris = [];
    const n = this.normals = new Float32Array(t.length / 3);
    for (let i = 0, j = 0; i < t.length; i += 9, j += 3) {
      const ux = t[i + 3] - t[i], uy = t[i + 4] - t[i + 1], uz = t[i + 5] - t[i + 2];
      const vx = t[i + 6] - t[i], vy = t[i + 7] - t[i + 1], vz = t[i + 8] - t[i + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      n[j] = nx; n[j + 1] = ny; n[j + 2] = nz;
    }
    this._seen = new Uint32Array(t.length / 9);
    return this;
  }

  /** Calls `visit(i)` once for each triangle near the footprint of a sphere at (x, z). */
  near(x, z, r, visit) {
    const stamp = ++this._stamp;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(this.cols - 1, Math.floor(x + r));
    const z0 = Math.max(0, Math.floor(z - r)), z1 = Math.min(this.rows - 1, Math.floor(z + r));
    for (let gz = z0; gz <= z1; gz++) {
      for (let gx = x0; gx <= x1; gx++) {
        const bucket = this._buckets[gz * this.cols + gx];
        for (let k = 0; k < bucket.length; k++) {
          const i = bucket[k];
          if (this._seen[i] === stamp) continue;
          this._seen[i] = stamp;
          visit(i);
        }
      }
    }
  }
}

/** A ball: where it is, how fast it goes, and what it was last standing on. */
export function createBall({ x = 0, y = 0, z = 0, r = 0.35, mass = 1 } = {}) {
  return {
    x, y, z, vx: 0, vy: 0, vz: 0, r, mass,
    grounded: false,
    /** The normal of what it stands on (meaningful while grounded). */
    nx: 0, ny: 1, nz: 0,
    /** The box it stands on, if it is one: it is carried along with it. */
    on: null,
    /** The highest it has been since it last stood on something. */
    peak: y,
  };
}

export function placeBall(ball, x, y, z) {
  ball.x = x; ball.y = y; ball.z = z;
  ball.vx = ball.vy = ball.vz = 0;
  ball.grounded = false;
  ball.on = null;
  ball.peak = y;
}

const _q = [0, 0, 0];
const _hits = [];
const _order = [];

/**
 * One step of a ball: `ax`, `az` is the push from the controls (or the AI),
 * as a fraction of full push on each ground axis. Returns what happened:
 * the hardest hit along a surface normal, and how far it had fallen if it
 * landed this step.
 */
export function stepBall(ball, world, ax, az, dt, { push = PUSH, airPush = AIR_PUSH, topSpeed = TOP_SPEED } = {}) {
  const result = { impact: 0, landed: false, drop: 0, crushed: false };
  const wasGrounded = ball.grounded;

  // Carried by whatever box it was standing on. Its own velocity is then
  // its roll across the box, and the box's movement is added on top.
  const carried = ball.on;
  if (carried) {
    ball.x += carried.vx * dt;
    ball.y += carried.vy * dt;
    ball.z += carried.vz * dt;
  }

  // The push, only as far as it doesn't take the ball past its top speed in
  // the direction pushed.
  const len = Math.hypot(ax, az);
  if (len > 1e-6) {
    const dx = ax / len, dz = az / len;
    if (ball.vx * dx + ball.vz * dz < topSpeed) {
      const k = (wasGrounded ? push : airPush) * Math.min(1, len) * dt;
      ball.vx += dx * k;
      ball.vz += dz * k;
    }
  }

  ball.vy -= GRAVITY * dt;

  if (wasGrounded) {
    const drag = Math.max(0, 1 - ROLL_DRAG * dt);
    ball.vx *= drag;
    ball.vz *= drag;
  }

  const speed = Math.hypot(ball.vx, ball.vy, ball.vz);
  if (speed > MAX_SPEED) {
    const s = MAX_SPEED / speed;
    ball.vx *= s; ball.vy *= s; ball.vz *= s;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;

  ball.grounded = false;
  ball.on = null;
  let gnx = 0, gny = 0, gnz = 0;

  const contact = (nx, ny, nz, depth, box) => {
    ball.x += nx * depth; ball.y += ny * depth; ball.z += nz * depth;
    const moving = box && box !== carried;
    const bvx = moving ? box.vx : 0, bvy = moving ? box.vy : 0, bvz = moving ? box.vz : 0;
    const rvx = ball.vx - bvx, rvy = ball.vy - bvy, rvz = ball.vz - bvz;
    const vn = rvx * nx + rvy * ny + rvz * nz;
    if (vn < 0) {
      const hit = -vn;
      if (hit > result.impact) result.impact = hit;
      const k = hit > BOUNCE_FROM ? 1 + BOUNCE : 1;
      ball.vx -= nx * vn * k; ball.vy -= ny * vn * k; ball.vz -= nz * vn * k;
    }
    if (ny > FLOOR) {
      ball.grounded = true;
      gnx += nx; gny += ny; gnz += nz;
      if (box) ball.on = box;
    }
    // Pushed down onto something by a box coming down: squashed.
    if (box && ny < -FLOOR && box.vy < -0.5) result.squeezedFrom = box;
  };

  const r = ball.r, r2 = r * r;
  const t = world.triangles, n = world.normals;
  for (let pass = 0; pass < PASSES; pass++) {
    let touched = false;
    // Nearest first: the face the ball sits on is always nearer than the
    // edge of the one beside it, and once the ball is out of the face it is
    // clear of the edge too. The other way round, the edge would nudge it
    // sideways at every seam.
    _hits.length = 0;
    world.near(ball.x, ball.z, r, (i) => {
      closestOnTriangle(ball.x, ball.y, ball.z, t, i * 9, _q);
      const dx = ball.x - _q[0], dy = ball.y - _q[1], dz = ball.z - _q[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < r2) _hits.push(d2, i);
    });
    _order.length = 0;
    for (let k = 0; k < _hits.length; k += 2) _order.push(k);
    _order.sort((a, b) => _hits[a] - _hits[b]);
    for (const k of _order) {
      const i = _hits[k + 1];
      closestOnTriangle(ball.x, ball.y, ball.z, t, i * 9, _q);
      const dx = ball.x - _q[0], dy = ball.y - _q[1], dz = ball.z - _q[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= r2) continue;
      const j = i * 3;
      // From behind a face, nothing: the other side of a wall isn't a floor.
      if (dx * n[j] + dy * n[j + 1] + dz * n[j + 2] < 0) continue;
      const d = Math.sqrt(d2);
      if (d < 1e-6) contact(n[j], n[j + 1], n[j + 2], r, null);
      else contact(dx / d, dy / d, dz / d, r - d, null);
      touched = true;
    }
    for (const box of world.boxes) {
      if (!box.solid) continue;
      const qx = Math.max(box.min[0], Math.min(ball.x, box.max[0]));
      const qy = Math.max(box.min[1], Math.min(ball.y, box.max[1]));
      const qz = Math.max(box.min[2], Math.min(ball.z, box.max[2]));
      const dx = ball.x - qx, dy = ball.y - qy, dz = ball.z - qz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= r2) continue;
      if (d2 > 1e-12) {
        const d = Math.sqrt(d2);
        contact(dx / d, dy / d, dz / d, r - d, box);
      } else {
        // The centre is inside: out by the nearest face.
        const faces = [
          [ball.x - box.min[0], -1, 0, 0], [box.max[0] - ball.x, 1, 0, 0],
          [ball.y - box.min[1], 0, -1, 0], [box.max[1] - ball.y, 0, 1, 0],
          [ball.z - box.min[2], 0, 0, -1], [box.max[2] - ball.z, 0, 0, 1],
        ].sort((a, b) => a[0] - b[0]);
        const [depth, fx, fy, fz] = faces[0];
        contact(fx, fy, fz, depth + r, box);
      }
      touched = true;
    }
    if (!touched) break;
  }

  if (ball.grounded) {
    const l = Math.hypot(gnx, gny, gnz) || 1;
    ball.nx = gnx / l; ball.ny = gny / l; ball.nz = gnz / l;
    if (!wasGrounded) {
      result.landed = true;
      result.drop = ball.peak - ball.y;
    }
    ball.peak = ball.y;
    if (result.squeezedFrom) result.crushed = true;
  } else {
    ball.peak = Math.max(ball.peak, ball.y);
  }
  return result;
}

/**
 * Two balls that touch push apart, sharing the impulse by mass, with a lively
 * bounce: a steelie knocks the marble about rather than stopping dead.
 */
export function collideBalls(a, b, restitution = 0.9) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const d2 = dx * dx + dy * dy + dz * dz;
  const reach = a.r + b.r;
  if (d2 >= reach * reach || d2 < 1e-12) return 0;
  const d = Math.sqrt(d2);
  const nx = dx / d, ny = dy / d, nz = dz / d;
  const wa = 1 / a.mass, wb = 1 / b.mass;
  const overlap = reach - d;
  a.x -= nx * overlap * wa / (wa + wb); a.y -= ny * overlap * wa / (wa + wb); a.z -= nz * overlap * wa / (wa + wb);
  b.x += nx * overlap * wb / (wa + wb); b.y += ny * overlap * wb / (wa + wb); b.z += nz * overlap * wb / (wa + wb);
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
  if (vn >= 0) return 0;
  const j = -(1 + restitution) * vn / (wa + wb);
  a.vx -= nx * j * wa; a.vy -= ny * j * wa; a.vz -= nz * j * wa;
  b.vx += nx * j * wb; b.vy += ny * j * wb; b.vz += nz * j * wb;
  return -vn;
}

/**
 * The spin rolling without slipping gives a ball on the ground, in radians a
 * second about each axis: about the line across its path, as fast as it rolls
 * (across whatever carries it, if anything does).
 */
export function rollSpin(ball, out = [0, 0, 0]) {
  const { vx, vy, vz } = ball;
  out[0] = (ball.ny * vz - ball.nz * vy) / ball.r;
  out[1] = (ball.nz * vx - ball.nx * vz) / ball.r;
  out[2] = (ball.nx * vy - ball.ny * vx) / ball.r;
  return out;
}

/** Turns an orientation quaternion `q` ([x, y, z, w], in place) by spin `w` for `dt` seconds. */
export function turn(q, w, dt) {
  const rate = Math.hypot(w[0], w[1], w[2]);
  if (rate < 1e-6) return q;
  const angle = rate * dt;
  const wx = w[0] / rate, wy = w[1] / rate, wz = w[2] / rate;
  const s = Math.sin(angle / 2), c = Math.cos(angle / 2);
  const [qx, qy, qz, qw] = q;
  // The turn first, then what it was: r = turn * q.
  const rx = c * qx + s * (wx * qw + wy * qz - wz * qy);
  const ry = c * qy + s * (wy * qw + wz * qx - wx * qz);
  const rz = c * qz + s * (wz * qw + wx * qy - wy * qx);
  const rw = c * qw - s * (wx * qx + wy * qy + wz * qz);
  const l = Math.hypot(rx, ry, rz, rw) || 1;
  q[0] = rx / l; q[1] = ry / l; q[2] = rz / l; q[3] = rw / l;
  return q;
}
