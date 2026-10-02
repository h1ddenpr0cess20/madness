import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCourse, Course, linearRGB } from '../src/course.js';

const palette = { tiles: ['#808080'] };

test('heights: on the corners, and in between on a slope', () => {
  const c = new Course({ name: 't', cols: 10, rows: 10, time: 0, palette });
  c.slope(2, 2, 4, 2, 8, 4, 'x');
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(near(c.heightAt(2, 3), 8));
  assert.ok(near(c.heightAt(5.999, 3), 4.001));
  assert.ok(near(c.heightAt(4, 2.5), 6));
  assert.ok(near(c.heightAt(3.25, 3.75), 6.75));
  assert.equal(c.heightAt(1.5, 3), null);
  assert.equal(c.heightAt(6.5, 3), null);
});

test('tiles off the grid are refused', () => {
  const c = new Course({ name: 't', cols: 4, rows: 4, time: 0, palette });
  assert.throws(() => c.flat(3, 3, 2, 1, 0), /off the grid/);
});

test('every face is a finite triangle; tops face up, walls face out', () => {
  const c = new Course({ name: 't', cols: 6, rows: 6, time: 0, palette });
  c.flat(2, 2, 1, 1, 3);
  const { tops, walls, world } = buildCourse(c);
  assert.equal(tops.position.length, 2 * 9);
  for (const v of [...tops.position, ...walls.position, ...tops.normal, ...walls.normal]) assert.ok(Number.isFinite(v));
  for (let i = 1; i < tops.normal.length; i += 3) assert.equal(tops.normal[i], 1);
  // One tile alone: four sides, two triangles each, each facing away from the middle of the tile.
  assert.equal(walls.position.length / 9, 8);
  for (let t = 0; t < walls.position.length / 9; t++) {
    const p = walls.position.slice(t * 9, t * 9 + 9);
    const cx = (p[0] + p[3] + p[6]) / 3 - 2.5, cz = (p[2] + p[5] + p[8]) / 3 - 2.5;
    const n = walls.normal.slice(t * 9, t * 9 + 3);
    assert.ok(cx * n[0] + cz * n[2] > 0, 'faces out');
    assert.ok(Math.abs(n[1]) < 1e-9, 'and is upright');
  }
  assert.equal(world.triangles.length / 9, 10);
});

test('a step down has one wall, on the high side, facing the low one', () => {
  const c = new Course({ name: 't', cols: 6, rows: 3, time: 0, palette });
  c.flat(1, 1, 2, 1, 2).flat(3, 1, 2, 1, 1);
  const { walls } = buildCourse(c);
  const between = [];
  for (let t = 0; t < walls.position.length / 9; t++) {
    const p = walls.position.slice(t * 9, t * 9 + 9);
    if ([p[0], p[3], p[6]].every((x) => x === 3)) between.push(walls.normal.slice(t * 9, t * 9 + 3));
  }
  assert.equal(between.length, 2);
  for (const n of between) assert.deepEqual([...n].map((v) => v + 0), [1, 0, 0]);
});

test('safe ground is level ground with level ground all round it', () => {
  const c = new Course({ name: 't', cols: 8, rows: 8, time: 0, palette });
  c.flat(1, 1, 5, 5, 0);
  c.flat(5, 3, 1, 1, 0.5);
  assert.ok(c.isSafe(2, 2));
  assert.ok(!c.isSafe(1, 1), 'at the edge');
  assert.ok(!c.isSafe(4, 3), 'next to a bump');
  assert.ok(!c.isSafe(0, 0), 'over nothing');
});

test('colours are linear', () => {
  assert.deepEqual(linearRGB('#ffffff'), [1, 1, 1]);
  assert.deepEqual(linearRGB('#000000'), [0, 0, 0]);
  assert.ok(Math.abs(linearRGB('#808080')[0] - 0.2158605) < 1e-6);
});
