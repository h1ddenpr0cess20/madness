import assert from 'node:assert/strict';
import { test } from 'node:test';

import { alongLoop, hammerAt, liftAt } from '../src/actors.js';

test('a hammer climbs slowly, waits, and slams down fast', () => {
  const at = (u) => hammerAt(u * 2, 2);
  assert.equal(at(0), 0);
  assert.equal(at(0.5), 1);
  assert.equal(at(0.7), 1);
  assert.ok(at(0.25) > 0.4 && at(0.25) < 0.6);
  assert.ok(at(0.8) > 0.5, 'still coming down');
  assert.equal(at(0.85), 0, 'down');
  for (let t = 0; t < 10; t += 0.01) {
    const h = hammerAt(t, 2.4, 0.3);
    assert.ok(h >= 0 && h <= 1);
  }
});

test('a lift waits at each end and glides between', () => {
  assert.equal(liftAt(0.1, 10, 0, 0.2), 0);
  assert.equal(liftAt(5.5, 10, 0, 0.2), 1);
  assert.ok(Math.abs(liftAt(3.5, 10, 0, 0.2) - 0.5) < 1e-9);
  assert.ok(liftAt(8.5, 10, 0, 0.2) < 0.5 && liftAt(8.5, 10, 0, 0.2) > 0);
  assert.equal(liftAt(10.1, 10, 0, 0.2), 0, 'and round again');
});

test('round a loop of points', () => {
  const square = [[0, 0], [2, 0], [2, 2], [0, 2]];
  assert.deepEqual(alongLoop(square, 1), [1, 0]);
  assert.deepEqual(alongLoop(square, 3), [2, 1]);
  assert.deepEqual(alongLoop(square, 7), [0, 1]);
  assert.deepEqual(alongLoop(square, 9), [1, 0]);
  // Two points: there and back.
  assert.deepEqual(alongLoop([[0, 0], [4, 0]], 6), [2, 0]);
});
