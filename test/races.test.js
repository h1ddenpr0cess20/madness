import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FALL_LIMIT } from '../src/physics.js';
import { loadRace, RACES } from '../src/levels.js';
import { drive, ROUTES } from './helpers/autopilot.js';

/**
 * Which tiles can be rolled to from the start without a lift: across to a
 * neighbour level with this one, or down onto one lower by less than a
 * breaking fall. Lifts join the tiles at either end of their run.
 */
function reachable(course) {
  const key = (x, z) => z * course.cols + x;
  const seen = new Set([key(course.start.x, course.start.z)]);
  const queue = [[course.start.x, course.start.z]];
  const edges = [
    [0, -1, (c) => [c.h[0], c.h[1]], (n) => [n.h[2], n.h[3]]],
    [0, 1, (c) => [c.h[2], c.h[3]], (n) => [n.h[0], n.h[1]]],
    [-1, 0, (c) => [c.h[0], c.h[2]], (n) => [n.h[1], n.h[3]]],
    [1, 0, (c) => [c.h[1], c.h[3]], (n) => [n.h[0], n.h[2]]],
  ];
  const lifts = course.lifts.map((l) => {
    // The tiles round the lift, level with its top, at one end of its run or the other.
    const cells = (end) => {
      const [ox, oy, oz] = l.to.map((v) => v * end);
      const out = [];
      for (let z = l.z - 1; z <= l.z + l.d; z++) {
        for (let x = l.x - 1; x <= l.x + l.w; x++) {
          const c = course.cell(x + ox, z + oz);
          if (c && Math.abs(Math.max(...c.h) - (l.h + oy)) < 0.01) out.push([x + ox, z + oz]);
        }
      }
      return out;
    };
    return [cells(0), cells(1)];
  });
  while (queue.length) {
    const [x, z] = queue.shift();
    const c = course.cell(x, z);
    const visit = (nx, nz) => {
      if (!seen.has(key(nx, nz))) { seen.add(key(nx, nz)); queue.push([nx, nz]); }
    };
    for (const [dx, dz, mine, theirs] of edges) {
      const n = course.cell(x + dx, z + dz);
      if (!n) continue;
      const [a0, a1] = mine(c), [b0, b1] = theirs(n);
      const up = Math.max(b0 - a0, b1 - a1);
      const down = Math.max(a0 - b0, a1 - b1);
      if (up < 0.01 && down < FALL_LIMIT * 0.6) visit(x + dx, z + dz);
    }
    for (const [from, to] of lifts) {
      if (from.some(([fx, fz]) => fx === x && fz === z)) to.forEach(([tx, tz]) => visit(tx, tz));
    }
  }
  return (x, z) => seen.has(key(x, z));
}

for (const [i, race] of RACES.entries()) {
  const course = race();

  test(`${course.name}: starts on safe ground and has a goal`, () => {
    assert.ok(course.isSafe(course.start.x, course.start.z));
    assert.ok(course.cells.some((c) => c?.kind === 'goal'));
    assert.ok(course.time > 0);
  });

  test(`${course.name}: the goal can be rolled to from the start`, () => {
    const can = reachable(course);
    const goals = [];
    for (let z = 0; z < course.rows; z++) {
      for (let x = 0; x < course.cols; x++) if (course.cell(x, z)?.kind === 'goal') goals.push([x, z]);
    }
    assert.ok(goals.some(([x, z]) => can(x, z)));
  });

  test(`${course.name}: everything that moves starts on the course`, () => {
    for (const s of course.steelies) assert.notEqual(course.heightAt(s.x, s.z), null);
    for (const s of course.slimes) for (const [x, z] of s.points) assert.notEqual(course.heightAt(x, z), null);
    for (const h of course.hammers) assert.ok(course.cell(h.x, h.z));
  });

  test(`${course.name}: the autopilot finishes in well under the time`, () => {
    const result = drive(i, ROUTES[i]);
    assert.ok(result.finished, `stuck: ${JSON.stringify(result)}`);
    assert.ok(result.time < loadRace(i).time * 0.75, `took ${result.time.toFixed(1)}s of ${loadRace(i).time}`);
    assert.equal(result.losses.length, 0, JSON.stringify(result.losses));
  });
}
