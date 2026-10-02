import { Course } from './course.js';

/**
 * The races, in order. Each is a course that starts at the back, high up,
 * and works its way down toward the camera to a chequered goal. The time
 * each one gives is added to whatever is left over from the last.
 */

const PRACTICE = { tiles: ['#6f9be0', '#4a78c8', '#a8c4f0'], walls: ['#22407a', '#1b3468', '#2c4f8c'] };
const BEGINNER = { tiles: ['#6cc77a', '#e8c95a', '#9bdc8a'], walls: ['#1f6a3c', '#8a6a1a', '#2a7a48'] };
const INTERMEDIATE = { tiles: ['#f0a85a', '#e07a50', '#f5cc8a'], walls: ['#8a4018', '#7a2c1e', '#9a5426'] };
const AERIAL = { tiles: ['#a68af0', '#62c0f0', '#c8b8fa'], walls: ['#4a34a0', '#1f6a9c', '#5c46b0'] };
const ULTIMATE = { tiles: ['#f07888', '#f0b060', '#b08af0', '#80c8f0'], walls: ['#8a2a40', '#9a5a1e', '#5a3aa0', '#2a6a90'] };

function practice() {
  const c = new Course({ name: 'Practice Race', cols: 38, rows: 40, time: 60, palette: PRACTICE });
  c.start = { x: 3, z: 3 };
  c.flat(1, 1, 6, 6, 14);
  c.slope(7, 2, 9, 4, 14, 10, 'x', { color: 1 });
  c.flat(16, 1, 6, 6, 10);
  c.slope(17, 7, 4, 7, 10, 7, 'z', { color: 1 });
  c.flat(14, 14, 9, 5, 7);
  // Rollers: a long dip and rise, twice, on the way down.
  c.surface(23, 14, 8, 5, (X) => 7 - (X - 23) * 0.25 + 0.45 * Math.sin(Math.PI * (X - 23) / 4), { color: 2 });
  c.flat(31, 13, 6, 7, 5);
  c.flat(31, 20, 6, 6, 3);
  c.flat(33, 26, 2, 6, 3, { color: 2 });
  c.slope(31, 32, 6, 4, 3, 1, 'z', { color: 1 });
  c.goal(31, 36, 6, 3, 1);
  return c;
}

function beginner() {
  const c = new Course({ name: 'Beginner Race', cols: 40, rows: 40, time: 45, palette: BEGINNER });
  c.start = { x: 3, z: 3 };
  c.flat(1, 1, 6, 6, 16);
  // A half-pipe on the way down: lips that rise in from nothing and fall away again.
  const lip = [1.4, 0.35, 0, 0.35, 1.4];
  c.surface(7, 2, 12, 4, (X, Z) => {
    const fade = Math.min(1, (X - 7) / 2, (19 - X) / 2);
    return 16 - (X - 7) * (5 / 12) + lip[Z - 2] * Math.max(0, fade);
  }, { color: 1 });
  // The steelies' yard.
  c.flat(19, 0, 9, 9, 11);
  c.steelie(26, 1).steelie(20, 7);
  // Zig-zag ramps, two tiles wide, nothing either side.
  c.slope(22, 9, 2, 6, 11, 9, 'z', { color: 1 });
  c.flat(22, 15, 6, 2, 9);
  c.slope(28, 15, 6, 2, 9, 7, 'x', { color: 1 });
  c.flat(34, 15, 3, 3, 7);
  c.slope(34, 18, 3, 6, 7, 5, 'z', { color: 1 });
  // Steps down.
  c.flat(33, 24, 4, 2, 4, { color: 2 });
  c.flat(33, 26, 4, 2, 3, { color: 2 });
  c.flat(33, 28, 4, 2, 2, { color: 2 });
  c.slope(33, 30, 4, 4, 2, 0, 'z', { color: 1 });
  c.goal(31, 34, 8, 4, 0);
  return c;
}

function intermediate() {
  const c = new Course({ name: 'Intermediate Race', cols: 30, rows: 42, time: 45, palette: INTERMEDIATE });
  c.start = { x: 3, z: 3 };
  c.flat(1, 1, 5, 5, 16);
  // A wide ramp with posts sticking up out of it.
  c.slope(6, 0, 10, 7, 16, 12, 'x', { color: 1 });
  for (const [x, z] of [[8, 1], [9, 4], [11, 2], [12, 5], [14, 1], [14, 4]]) {
    c.flat(x, z, 1, 1, 16 - (x + 1 - 6) * 0.4 + 1.2, { color: 2 });
  }
  // The slimes' yard.
  c.flat(16, 0, 10, 10, 12);
  c.slime([[18, 2], [24, 2], [24, 7], [18, 7]], { speed: 1.5 });
  c.slime([[23, 8], [18, 8], [18, 4], [23, 4]], { speed: 1.2 });
  // A narrow way out and a steep one down.
  c.flat(20, 10, 2, 8, 12, { color: 2 });
  c.slope(18, 18, 6, 5, 12, 7, 'z', { color: 1 });
  // A field of bumps, with a slime working across it.
  c.surface(16, 23, 10, 8, (X, Z) => 7 - 0.25 * (Z - 23)
    + 0.4 * Math.sin(Math.PI * (X - 16) / 2) * Math.sin(Math.PI * (Z - 23) / 2), { color: 2 });
  c.slime([[17, 27], [24, 27]], { speed: 1.4 });
  c.flat(16, 31, 10, 4, 5);
  c.slope(20, 35, 4, 3, 5, 3, 'z', { color: 1 });
  c.goal(18, 38, 8, 3, 3);
  return c;
}

function aerial() {
  const c = new Course({ name: 'Aerial Race', cols: 34, rows: 46, time: 50, palette: AERIAL });
  c.start = { x: 3, z: 3 };
  c.flat(1, 1, 5, 5, 18);
  // A walkway under the hammers.
  c.flat(6, 2, 8, 2, 18, { color: 2 });
  c.hammer(8, 2, { d: 2, period: 2.4 });
  c.hammer(11, 2, { d: 2, period: 2.4, phase: 1.2 });
  c.flat(14, 0, 5, 6, 18);
  // Across the gap on a lift.
  c.lift(19, 2, 3, 3, 18, { to: [3, 0, 0], period: 5 });
  c.flat(25, 1, 5, 5, 18);
  c.slope(26, 6, 2, 8, 18, 13, 'z', { color: 1 });
  c.flat(23, 14, 8, 4, 13);
  // Down the shaft.
  c.lift(24, 18, 3, 3, 13, { to: [0, -5, 0], period: 7 });
  c.flat(23, 21, 8, 4, 8);
  // The narrowest bit of the whole game: one tile wide.
  c.flat(25, 25, 1, 5, 8, { color: 2 });
  c.flat(22, 30, 8, 4, 8);
  c.steelie(28, 32, { range: 7 });
  c.slope(22, 34, 3, 6, 8, 4, 'z', { color: 1 });
  c.flat(20, 40, 8, 2, 4);
  c.goal(20, 42, 8, 3, 4);
  return c;
}

function ultimate() {
  const c = new Course({ name: 'Ultimate Race', cols: 46, rows: 50, time: 60, palette: ULTIMATE });
  c.start = { x: 3, z: 3 };
  c.flat(1, 1, 5, 5, 24);
  // Steep and narrow, straight away.
  c.slope(6, 2, 8, 2, 24, 19, 'x', { color: 1 });
  c.flat(14, 0, 7, 7, 19);
  c.steelie(20, 0, { range: 6 });
  // A half-pipe with hammers over it.
  const lip = [1.5, 0.4, 0, 0.4, 1.5];
  c.surface(15, 7, 4, 12, (X, Z) => {
    const fade = Math.min(1, (Z - 7) / 2, (19 - Z) / 2);
    return 19 - (Z - 7) * (4 / 12) + lip[X - 15] * Math.max(0, fade);
  }, { color: 2 });
  c.hammer(16, 11, { w: 2, period: 2.2 });
  c.hammer(16, 15, { w: 2, period: 2.2, phase: 1.1 });
  c.flat(13, 19, 8, 6, 15);
  c.slime([[14, 20], [17, 20], [17, 23], [14, 23]], { speed: 1.8 });
  // Lifts over the dark, one after another.
  c.lift(21, 20, 2, 2, 15, { to: [4, 0, 0], period: 4.5 });
  c.flat(27, 19, 4, 4, 15);
  c.lift(27, 23, 2, 2, 15, { to: [0, 0, 4], period: 4.5, phase: 2.25 });
  c.flat(26, 29, 6, 5, 15);
  c.steelie(31, 33, { range: 6 });
  // Waves, and a slime riding them.
  c.surface(32, 29, 9, 5, (X) => 15 - (X - 32) * (3 / 9) + 0.5 * Math.sin(Math.PI * (X - 32) / 3), { color: 3 });
  c.slime([[33, 31], [40, 31]], { speed: 2 });
  c.flat(41, 28, 4, 7, 12);
  c.slope(42, 35, 2, 6, 12, 8, 'z', { color: 1 });
  c.flat(38, 41, 7, 4, 8);
  c.steelie(39, 43, { range: 6 });
  c.hammer(41, 41, { w: 1, d: 4, period: 1.9 });
  c.goal(38, 45, 7, 3, 8);
  return c;
}

export const RACES = [practice, beginner, intermediate, aerial, ultimate];

export function loadRace(index) {
  return RACES[index]();
}
