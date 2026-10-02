import assert from 'node:assert/strict';
import { test } from 'node:test';

import { toGround } from '../src/race.js';
import { createView, groundAxes, HOME, LIMITS } from '../src/view.js';

const near = (a, b, e = 1e-9) => a.every((v, i) => Math.abs(v - b[i]) < e);

test('it starts at the arcade corner: looking down the diagonal from about forty degrees up', () => {
  const d = createView().direction();
  assert.ok(near(d, [1, 1.15, 1].map((v) => v / Math.hypot(1, 1.15, 1))));
});

test('up the screen is away from the camera along the ground, and right is across it — however the board is turned', () => {
  for (const yaw of [HOME.yaw, 0, 1, 2.5, -2, 7]) {
    const view = createView({ ...HOME, yaw });
    const [dx, , dz] = view.direction();
    const flat = Math.hypot(dx, dz);
    const { right, up } = groundAxes(yaw);
    assert.ok(near(up, [-dx / flat, -dz / flat]), `up at ${yaw}`);
    // Right is up turned a quarter clockwise, seen from above.
    assert.ok(near(right, [-up[1], up[0]]), `right at ${yaw}`);
  }
  // At the start, the courses' diagonals: up the screen is −x −z, right is +x −z.
  assert.ok(near(toGround({ x: 0, y: 1 }, HOME.yaw), [-Math.SQRT1_2, -Math.SQRT1_2]));
  assert.ok(near(toGround({ x: 1, y: 0 }, HOME.yaw), [Math.SQRT1_2, -Math.SQRT1_2]));
  // The camera a quarter of the way round one way, up the screen is what left was; the other way, what right was.
  assert.ok(near(toGround({ x: 0, y: 1 }, HOME.yaw + Math.PI / 2), toGround({ x: -1, y: 0 }, HOME.yaw)));
  assert.ok(near(toGround({ x: 0, y: 1 }, HOME.yaw - Math.PI / 2), toGround({ x: 1, y: 0 }, HOME.yaw)));
});

test('tilt and zoom stay within their limits; turning goes round and round', () => {
  const view = createView();
  view.turn(10, 10);
  view.zoomBy(100);
  assert.equal(view.aim.pitch, LIMITS.pitch[1]);
  assert.equal(view.aim.zoom, LIMITS.zoom[1]);
  assert.equal(view.aim.yaw, HOME.yaw + 10);
  view.turn(0, -10);
  view.zoomBy(0.0001);
  assert.equal(view.aim.pitch, LIMITS.pitch[0]);
  assert.equal(view.aim.zoom, LIMITS.zoom[0]);
});

test('the view eases after its aim, and lands on it', () => {
  const view = createView();
  view.turn(1, 0.2);
  view.zoomBy(2);
  view.step(1 / 60);
  assert.ok(view.yaw > HOME.yaw && view.yaw < HOME.yaw + 1);
  assert.ok(view.zoom > 1 && view.zoom < 2);
  for (let i = 0; i < 120; i++) view.step(1 / 60);
  assert.ok(Math.abs(view.yaw - (HOME.yaw + 1)) < 1e-4);
  assert.ok(Math.abs(view.zoom - 2) < 1e-4);
});

test('reset goes back to the start the short way round', () => {
  const view = createView();
  view.turn(Math.PI * 6 + 0.5, 0.3);
  view.zoomBy(2);
  view.reset();
  assert.ok(Math.abs(view.aim.yaw - (HOME.yaw + Math.PI * 6)) < 1e-9);
  assert.equal(view.aim.pitch, HOME.pitch);
  assert.equal(view.aim.zoom, 1);
});
