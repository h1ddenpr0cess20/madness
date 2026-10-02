import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as GFX from '../src/vendor/gfx/index.js';
import { createMarble, createSparkGeometry, RADIUS, RAYS, sparkShape } from '../src/marble.js';

test('the spark: twelve rays all the way round, some longer than others', () => {
  assert.equal(RAYS.length, 12);
  const angles = RAYS.map((r) => r.angle).sort((a, b) => a - b);
  for (let i = 1; i < angles.length; i++) {
    const gap = angles[i] - angles[i - 1];
    assert.ok(gap > 0.4 && gap < 0.65, `rays ${gap} apart`);
  }
  assert.ok(Math.max(...RAYS.map((r) => r.length)) === 1);
  assert.ok(Math.min(...RAYS.map((r) => r.length)) < 0.85);
});

test('its outline is one closed loop, out to the tips and back to the hub', () => {
  const points = sparkShape(GFX, 1).getPoints(6);
  const far = Math.max(...points.map((p) => Math.hypot(p.x, p.y)));
  const near = Math.min(...points.map((p) => Math.hypot(p.x, p.y)));
  assert.ok(Math.abs(far - 1) < 0.02, `tips reach ${far}`);
  assert.ok(near > 0.15 && near < 0.25, `hub at ${near}`);
});

test('the spark sits wholly inside the glass, and fills it', () => {
  const { spark, glass } = createMarble(GFX);
  const p = spark.geometry.attributes.position;
  let far = 0;
  for (let i = 0; i < p.count; i++) far = Math.max(far, Math.hypot(p.getX(i), p.getY(i), p.getZ(i)));
  assert.ok(far < RADIUS * 0.95, `reaches ${far} of ${RADIUS}`);
  assert.ok(far > RADIUS * 0.7, 'and fills it');
  assert.equal(glass.material.transmission, 1);
});

test('the spark is solid, centred front to back', () => {
  const g = createSparkGeometry(GFX, 1);
  const p = g.attributes.position;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < p.count; i++) { lo = Math.min(lo, p.getZ(i)); hi = Math.max(hi, p.getZ(i)); }
  assert.ok(Math.abs(lo + hi) < 1e-6, 'centred');
  assert.ok(hi - lo > 0.15, 'with depth');
  for (const v of p.array) assert.ok(Number.isFinite(v));
});
