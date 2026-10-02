import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as GFX from '../src/vendor/gfx/index.js';
import { createMarble, createSparkGeometry, RADIUS, sparkRays } from '../src/marble.js';

test('the spark: the same strands every time, out every way', () => {
  const rays = sparkRays();
  assert.deepEqual(rays, sparkRays());
  assert.equal(rays.length, 48);
  for (const r of rays) {
    assert.ok(Math.abs(Math.hypot(...r.dir) - 1) < 1e-9);
    assert.ok(r.length >= 0.72 && r.length <= 1);
  }
  // Spread all round: every eighth of the sphere has strands in it.
  const octants = new Set(rays.map((r) => r.dir.map((v) => (v > 0 ? 1 : 0)).join('')));
  assert.equal(octants.size, 8);
});

test('the spark sits wholly inside the glass, and fills it', () => {
  const { spark, glass } = createMarble(GFX);
  const p = spark.geometry.attributes.position;
  let far = 0;
  for (let i = 0; i < p.count; i++) far = Math.max(far, Math.hypot(p.getX(i), p.getY(i), p.getZ(i)));
  assert.ok(far < RADIUS * 0.9, `reaches ${far} of ${RADIUS}`);
  assert.ok(far > RADIUS * 0.75, 'and fills it');
  assert.equal(glass.material.transmission, 1);
});

test('the spark is one mesh, shaded deeper toward the middle', () => {
  const g = createSparkGeometry(GFX, 1);
  const { position, normal, color } = g.attributes;
  assert.equal(position.count, normal.count);
  assert.equal(position.count, color.count);
  for (const v of position.array) assert.ok(Number.isFinite(v));
  let inner = 0, outer = 0, ni = 0, no = 0;
  for (let i = 0; i < position.count; i++) {
    const d = Math.hypot(position.getX(i), position.getY(i), position.getZ(i));
    if (d < 0.3) { inner += color.getX(i); ni++; }
    if (d > 0.8) { outer += color.getX(i); no++; }
  }
  assert.ok(inner / ni < outer / no);
});
