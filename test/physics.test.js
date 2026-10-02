import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Course, buildCourse } from '../src/course.js';
import {
  BREAK_SPEED, closestOnTriangle, collideBalls, createBall, GRAVITY, placeBall, rollSpin, stepBall, turn,
} from '../src/physics.js';

const STEP = 1 / 120;

function slab({ h = 0, w = 8, d = 8 } = {}) {
  const c = new Course({ name: 'slab', cols: w + 4, rows: d + 4, time: 0, palette: { tiles: ['#ffffff'] } });
  c.flat(2, 2, w, d, h);
  return c;
}

const run = (ball, world, seconds, push = [0, 0]) => {
  const results = [];
  for (let t = 0; t < seconds; t += STEP) results.push(stepBall(ball, world, push[0], push[1], STEP));
  return results;
};

test('the nearest point on a triangle: inside, past a corner, past an edge', () => {
  const tri = [0, 0, 0, 2, 0, 0, 0, 0, 2];
  const out = [0, 0, 0];
  closestOnTriangle(0.5, 3, 0.5, tri, 0, out);
  assert.deepEqual(out, [0.5, 0, 0.5]);
  closestOnTriangle(-1, 1, -1, tri, 0, out);
  assert.deepEqual(out, [0, 0, 0]);
  closestOnTriangle(1, 0, -3, tri, 0, out);
  assert.deepEqual(out, [1, 0, 0]);
  closestOnTriangle(2, 0, 2, tri, 0, out);
  assert.deepEqual(out.map((v) => +v.toFixed(6)), [1, 0, 1]);
});

test('a ball dropped onto a level course comes to rest on it, standing', () => {
  const { world } = buildCourse(slab({ h: 3 }));
  const ball = createBall({ x: 6, y: 4, z: 6, r: 0.36 });
  run(ball, world, 2);
  assert.ok(ball.grounded);
  assert.ok(Math.abs(ball.y - 3.36) < 0.01, `rests at ${ball.y}`);
  assert.ok(Math.hypot(ball.vx, ball.vy, ball.vz) < 0.05);
  assert.ok(ball.ny > 0.99);
});

test('a ball rolls down a slope, and faster the steeper it is', () => {
  const speedAfter = (drop) => {
    const c = new Course({ name: 'ramp', cols: 20, rows: 6, time: 0, palette: { tiles: ['#ffffff'] } });
    c.slope(1, 1, 18, 4, drop, 0, 'x');
    const { world } = buildCourse(c);
    const ball = createBall({ x: 3, y: drop, z: 3, r: 0.36 });
    run(ball, world, 0.8);
    assert.ok(ball.vx > 0, 'downhill is +x');
    assert.ok(Math.abs(ball.vz) < 1e-3 * ball.vx, 'and only +x');
    return ball.vx;
  };
  assert.ok(speedAfter(6) > speedAfter(2) * 1.5);
});

test('a wall stops a ball; it does not go through', () => {
  const c = slab({ h: 0 });
  c.flat(7, 2, 1, 8, 2); // a wall across the slab at x = 7
  const { world } = buildCourse(c);
  const ball = createBall({ x: 4, y: 0.36, z: 6, r: 0.36 });
  run(ball, world, 3, [1, 0]);
  assert.ok(ball.x < 7 - 0.3, `stopped at ${ball.x}`);
  assert.ok(ball.x > 6.5, 'against the wall');
});

test('the controls push no faster than top speed, but gravity can', () => {
  const { world } = buildCourse(slab({ w: 60 }));
  const ball = createBall({ x: 3, y: 0.36, z: 6, r: 0.36 });
  run(ball, world, 4, [1, 0]);
  assert.ok(ball.vx <= 9.3 && ball.vx > 8, `rolled at ${ball.vx}`);
});

test('a drop far enough lands hard enough to break; a short one does not', () => {
  const landing = (height) => {
    const { world } = buildCourse(slab());
    const ball = createBall({ x: 6, y: 0.36 + height, z: 6, r: 0.36 });
    const hit = run(ball, world, 2).find((r) => r.landed);
    return hit.impact;
  };
  assert.ok(landing(2) < BREAK_SPEED);
  assert.ok(landing(5) > BREAK_SPEED);
  assert.ok(Math.abs(BREAK_SPEED - Math.sqrt(2 * GRAVITY * 4.25)) < 1e-9);
});

test('off the edge, a ball falls into the dark', () => {
  const { world } = buildCourse(slab());
  const ball = createBall({ x: 8, y: 0.36, z: 6, r: 0.36 });
  run(ball, world, 2, [1, 0]);
  assert.ok(ball.y < -5);
  assert.ok(!ball.grounded);
});

test('a box coming down onto a grounded ball squashes it', () => {
  const { world } = buildCourse(slab());
  const box = { solid: true, vx: 0, vy: 0, vz: 0, min: [5.5, 1, 5.5], max: [6.5, 2, 6.5] };
  world.boxes = [box];
  const ball = createBall({ x: 6, y: 0.36, z: 6, r: 0.36 });
  placeBall(ball, 6, 0.36, 6);
  assert.ok(!run(ball, world, 0.2).some((r) => r.crushed), 'not while it hangs above');
  box.vy = -20;
  box.min[1] = 0.6; box.max[1] = 1.6;
  assert.ok(stepBall(ball, world, 0, 0, STEP).crushed);
});

test('a ball standing on a moving box goes with it', () => {
  const { world } = buildCourse(slab());
  const box = { solid: true, vx: 2, vy: 0, vz: 0, min: [4, 1, 4], max: [8, 1.5, 8] };
  world.boxes = [box];
  const ball = createBall({ x: 5, y: 1.86, z: 6, r: 0.36 });
  for (let t = 0; t < 1; t += STEP) {
    box.min[0] += 2 * STEP; box.max[0] += 2 * STEP;
    stepBall(ball, world, 0, 0, STEP);
  }
  assert.ok(Math.abs(ball.x - 7) < 0.15, `carried to ${ball.x}`);
});

test('two balls bounce apart, momentum kept', () => {
  const a = createBall({ x: 0, r: 0.36, mass: 1 });
  const b = createBall({ x: 0.7, r: 0.36, mass: 2 });
  a.vx = 4;
  const before = a.vx * a.mass + b.vx * b.mass;
  const hit = collideBalls(a, b, 1);
  assert.ok(hit > 0);
  assert.ok(Math.abs(a.vx * a.mass + b.vx * b.mass - before) < 1e-9);
  assert.ok(b.vx > a.vx);
  assert.ok(b.x - a.x >= 0.72 - 1e-9);
});

test('rolling spin: across the path, as fast as rolling without slipping', () => {
  const ball = createBall({ r: 0.5 });
  ball.vx = 2;
  const w = rollSpin(ball);
  assert.deepEqual(w.map((v) => +v.toFixed(9) || 0), [0, 0, -4]);
  // A quarter turn about y takes +x to −z.
  const q = turn([0, 0, 0, 1], [0, Math.PI / 2, 0], 1);
  const [x, y, z, s] = q;
  const v = [1, 0, 0];
  // Rotate v by q: v + 2s(q×v) + 2q×(q×v).
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const u = [x, y, z];
  const t = cross(u, v).map((c) => 2 * c);
  const r = v.map((c, i) => c + s * t[i] + cross(u, t)[i]);
  assert.deepEqual(r.map((c) => +c.toFixed(6) || 0), [0, 0, -1]);
});
