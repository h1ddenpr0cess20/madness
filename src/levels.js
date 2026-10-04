import { Course } from './course.js';

/**
 * The races, in order. Each is a course that starts at the back, high up,
 * and works its way down toward the camera to a chequered goal — except the
 * Silly Race, which runs the other way, uphill. Crossroads and Odyssey split
 * in places into a short, risky way and a long, safe one that meet again
 * further down. The time each one gives is added to whatever is left over
 * from the last.
 */

const PRACTICE = { tiles: ['#6f9be0', '#4a78c8', '#a8c4f0'], walls: ['#22407a', '#1b3468', '#2c4f8c'] };
const BEGINNER = { tiles: ['#6cc77a', '#e8c95a', '#9bdc8a'], walls: ['#1f6a3c', '#8a6a1a', '#2a7a48'] };
const INTERMEDIATE = { tiles: ['#f0a85a', '#e07a50', '#f5cc8a'], walls: ['#8a4018', '#7a2c1e', '#9a5426'] };
const AERIAL = { tiles: ['#a68af0', '#62c0f0', '#c8b8fa'], walls: ['#4a34a0', '#1f6a9c', '#5c46b0'] };
const TWISTER = { tiles: ['#5fd0c0', '#3a9ec8', '#a8eadc'], walls: ['#1a6a62', '#1a4a7a', '#2a7e72'] };
const SILLY = { tiles: ['#f5e070', '#f08cc8', '#8ae0f0'], walls: ['#8a7a1a', '#8a2a6a', '#1f6a7a'] };
const GAUNTLET = { tiles: ['#c0c4cc', '#e05a4a', '#8a92a0'], walls: ['#4a4e58', '#7a1e1a', '#363a44'] };
const CROSSROADS = { tiles: ['#e0d070', '#7ab8e0', '#f0e6a8'], walls: ['#7a6a1a', '#1f5a8a', '#8a7a2a'] };
const MARATHON = { tiles: ['#e88a6a', '#c8d070', '#f0bca0'], walls: ['#8a3a26', '#6a701e', '#9a5038'] };
const ODYSSEY = { tiles: ['#8ad0a0', '#c090e0', '#f0d890', '#e09090'], walls: ['#2a6a44', '#5a2a8a', '#8a7020', '#8a2a2a'] };
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

function crossroads() {
  // Two places where the course splits: one way safe and long, the other short and risky.
  const c = new Course({ name: 'Crossroads Race', cols: 40, rows: 48, time: 45, palette: CROSSROADS });
  c.start = { x: 3, z: 3 };
  c.flat(1, 1, 5, 5, 18);
  c.slope(6, 2, 4, 3, 18, 16, 'x', { color: 1 });
  c.flat(10, 0, 7, 7, 16);
  // The long way: a wide road east, a ramp, a yard with a steelie in it, another ramp.
  c.flat(17, 1, 12, 5, 16);
  c.slope(24, 6, 5, 6, 16, 13, 'z', { color: 1 });
  c.flat(23, 12, 8, 6, 13);
  c.steelie(29, 14, { range: 6 });
  c.slope(25, 18, 5, 8, 13, 8, 'z', { color: 1 });
  // The short way: straight down a steep, narrow ramp, off two ledges and over a bridge under a hammer.
  c.slope(12, 7, 2, 8, 16, 12, 'z', { color: 2 });
  c.flat(11, 15, 4, 3, 12);
  c.flat(11, 18, 4, 4, 10);
  c.flat(12, 22, 1, 4, 10, { color: 2 });
  c.hammer(12, 23, { period: 2.4 });
  // Where they meet, with a slime pacing across it.
  c.flat(11, 26, 21, 6, 8);
  c.slime([[14, 28], [28, 28]], { speed: 1.5 });
  // Split again: a lift over the gap, or round by the ramp at the side.
  c.lift(18, 32, 3, 3, 8, { to: [0, 0, 3], period: 5 });
  c.flat(16, 38, 7, 3, 8);
  c.slope(16, 41, 7, 3, 8, 5, 'z', { color: 1 });
  c.flat(32, 27, 4, 4, 8);
  c.slope(32, 31, 3, 10, 8, 5, 'z', { color: 1 });
  c.flat(24, 41, 11, 3, 5);
  c.steelie(27, 42, { range: 5 });
  c.goal(16, 44, 9, 3, 5);
  return c;
}

function twister() {
  const c = new Course({ name: 'Twister Race', cols: 36, rows: 46, time: 40, palette: TWISTER });
  c.start = { x: 3, z: 3 };
  c.flat(1, 1, 5, 5, 20);
  // A bobsleigh run: banked chutes zig-zagging down, a banked bend at every turn.
  c.chute(6, 2, 10, 3, 20, 17, 'x', { color: 1 });
  c.bend(16, 2, 3, 17, [16, 5], { color: 2 });
  c.chute(16, 5, 3, 8, 17, 14, 'z', { color: 1 });
  c.bend(16, 13, 3, 14, [19, 13], { color: 2 });
  c.chute(19, 13, 8, 3, 14, 11, 'x', { color: 1 });
  c.hammer(23, 14, { period: 2.3 });
  c.bend(27, 13, 3, 11, [27, 16], { color: 2 });
  c.chute(27, 16, 3, 7, 11, 8, 'z', { color: 1 });
  // Out into a yard, and across the bowl with a slime going round in it.
  c.flat(25, 23, 7, 4, 8);
  c.steelie(30, 25, { range: 5 });
  c.bowl(25, 27, 7, 7, 8, 1.6, { color: 2 });
  c.slime([[26, 28], [30, 28], [30, 32], [26, 32]], { speed: 1.3 });
  c.flat(26, 34, 5, 2, 8);
  c.slope(27, 36, 3, 4, 8, 5, 'z', { color: 1 });
  c.goal(25, 40, 7, 3, 5);
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

function silly() {
  // Backwards and uphill: it starts down at the front and climbs away to a goal at the top.
  const c = new Course({ name: 'Silly Race', cols: 36, rows: 40, time: 50, palette: SILLY });
  c.start = { x: 30, z: 34 };
  c.flat(27, 32, 6, 5, 2);
  c.chute(28, 22, 3, 10, 6, 2, 'z', { color: 1 });
  c.flat(26, 17, 7, 5, 6);
  c.steelie(31, 18, { range: 5 });
  // Up the shaft.
  c.lift(28, 14, 3, 3, 6, { to: [0, 4, 0], period: 6 });
  c.flat(26, 9, 7, 5, 10);
  // Rollers, climbing.
  c.surface(14, 10, 12, 3, (X) => 10 + (26 - X) * 0.25 + 0.35 * Math.sin(Math.PI * (26 - X) / 3), { color: 2 });
  c.flat(10, 7, 4, 8, 13);
  c.slime([[10, 7], [12, 7], [12, 13], [10, 13]], { speed: 1.2 });
  // Up and across.
  c.lift(7, 9, 3, 3, 13, { to: [-4, 3, 0], period: 7 });
  c.flat(0, 8, 3, 7, 16);
  c.chute(0, 3, 3, 5, 18, 16, 'z', { color: 1 });
  c.bend(0, 0, 3, 18, [3, 3], { color: 2 });
  c.flat(3, 0, 9, 3, 18);
  c.steelie(8, 1, { range: 6 });
  c.goal(12, 0, 4, 3, 18);
  return c;
}

function marathon() {
  // The long one: back and forth across the whole board, a long way down.
  const c = new Course({ name: 'Marathon Race', cols: 52, rows: 62, time: 75, palette: MARATHON });
  c.start = { x: 3, z: 3 };
  c.flat(1, 1, 5, 5, 30);
  // Rollers out to the first yard.
  c.surface(6, 2, 12, 3, (X) => 30 - (X - 6) * 0.25 + 0.4 * Math.sin(Math.PI * (X - 6) / 3), { color: 2 });
  c.flat(18, 0, 6, 6, 27);
  c.steelie(22, 1, { range: 5 });
  // A bobsleigh run.
  c.chute(19, 6, 3, 8, 27, 24, 'z', { color: 1 });
  c.bend(19, 14, 3, 24, [22, 14], { color: 3 });
  c.chute(22, 14, 8, 3, 24, 21, 'x', { color: 1 });
  c.bend(30, 14, 3, 21, [30, 17], { color: 3 });
  c.chute(30, 17, 3, 7, 21, 18, 'z', { color: 1 });
  // A yard, then a bowl with a slime going round it.
  c.flat(28, 24, 8, 5, 18);
  c.bowl(28, 29, 8, 8, 18, 1.6, { color: 2 });
  c.slime([[29, 30], [34, 30], [34, 35], [29, 35]], { speed: 1.3 });
  // Back the other way, down a ramp two tiles wide.
  c.flat(30, 37, 4, 2, 18);
  c.slope(20, 37, 10, 2, 15, 18, 'x', { color: 1 });
  c.flat(15, 35, 5, 6, 15);
  c.steelie(16, 36, { range: 5 });
  // Down the shaft.
  c.lift(16, 41, 3, 3, 15, { to: [0, -4, 0], period: 6 });
  c.flat(14, 44, 8, 5, 11);
  // The hammer walk.
  c.flat(22, 45, 10, 2, 11, { color: 2 });
  c.hammer(24, 45, { d: 2, period: 2.4 });
  c.hammer(28, 45, { d: 2, period: 2.4, phase: 1.2 });
  c.flat(32, 43, 6, 6, 11);
  // Waves, all the way down.
  c.surface(33, 49, 4, 8, (X, Z) => 11 - (Z - 49) * 0.375 + 0.4 * Math.sin(Math.PI * (Z - 49) / 2), { color: 3 });
  c.flat(31, 57, 8, 3, 8);
  c.slope(39, 57, 6, 3, 8, 6, 'x', { color: 1 });
  c.goal(45, 56, 6, 5, 6);
  return c;
}

function gauntlet() {
  const c = new Course({ name: 'Gauntlet Race', cols: 44, rows: 48, time: 50, palette: GAUNTLET });
  c.start = { x: 3, z: 3 };
  c.flat(1, 1, 5, 5, 22);
  // A ramp with holes in it.
  c.slope(6, 0, 12, 7, 22, 17, 'x', { color: 2 });
  for (const [x, z] of [[8, 1], [8, 5], [9, 3], [11, 0], [11, 4], [12, 2], [13, 6], [14, 4], [15, 1], [16, 3], [16, 6]]) c.clear(x, z, 1, 1);
  c.flat(18, 0, 6, 7, 17);
  // The hammer walk.
  c.flat(24, 2, 11, 2, 17, { color: 1 });
  c.hammer(25, 2, { d: 2, period: 2.4 });
  c.hammer(28, 2, { d: 2, period: 2.4, phase: 0.6 });
  c.hammer(31, 2, { d: 2, period: 2.4, phase: 1.2 });
  c.flat(35, 0, 6, 7, 17);
  c.slope(36, 7, 4, 5, 17, 13, 'z', { color: 1 });
  // The sumo ring: a dish with steelies in it.
  c.bowl(32, 12, 10, 10, 13, 1.6, { color: 2 });
  c.steelie(34, 15, { range: 7 }).steelie(39, 15, { range: 7 }).steelie(36, 19, { range: 7 });
  // A bridge one tile wide, zig-zagging down.
  c.flat(36, 22, 1, 4, 13, { color: 1 });
  c.flat(36, 26, 5, 1, 13, { color: 1 });
  c.slope(40, 27, 1, 6, 13, 10, 'z', { color: 1 });
  // Slimes crossing the last yard.
  c.flat(35, 33, 8, 6, 10);
  c.slime([[36, 35], [41, 35]], { speed: 2 });
  c.slime([[41, 37], [36, 37]], { speed: 1.7 });
  c.slope(37, 39, 4, 4, 10, 7, 'z', { color: 1 });
  c.goal(35, 43, 8, 3, 7);
  return c;
}

function odyssey() {
  // Long, and three times over the course splits in two.
  const c = new Course({ name: 'Odyssey Race', cols: 52, rows: 54, time: 70, palette: ODYSSEY });
  c.start = { x: 3, z: 3 };
  c.flat(1, 1, 5, 5, 30);
  c.slope(6, 2, 3, 3, 30, 28, 'x', { color: 1 });
  c.flat(9, 0, 7, 7, 28);
  // Straight across a ramp full of holes...
  c.slope(16, 1, 12, 5, 28, 23, 'x', { color: 2 });
  for (const [x, z] of [[18, 2], [19, 4], [21, 1], [21, 3], [23, 5], [24, 2], [26, 4], [26, 1]]) c.clear(x, z, 1, 1);
  // ...or the long way round, past a steelie.
  c.slope(11, 7, 3, 6, 28, 26, 'z', { color: 1 });
  c.flat(11, 13, 17, 3, 26);
  c.steelie(20, 14, { range: 6 });
  c.flat(28, 13, 4, 4, 26);
  c.slope(29, 7, 3, 6, 23, 26, 'z', { color: 1 });
  c.flat(28, 0, 7, 7, 23);
  c.flat(35, 2, 3, 3, 23, { color: 3 });
  c.flat(38, 0, 7, 7, 23);
  // Down the shaft...
  c.lift(40, 7, 3, 3, 23, { to: [0, -5, 0], period: 7 });
  c.flat(38, 10, 7, 5, 18);
  // ...or round by the bobsleigh run.
  c.flat(45, 2, 4, 3, 23, { color: 3 });
  c.bend(48, 2, 3, 23, [48, 5], { color: 2 });
  c.chute(48, 5, 3, 10, 23, 18, 'z', { color: 1 });
  c.flat(38, 15, 13, 4, 18);
  c.slope(40, 19, 5, 6, 18, 14, 'z', { color: 1 });
  c.flat(36, 25, 12, 6, 14);
  c.slime([[38, 26], [45, 26], [45, 29], [38, 29]], { speed: 1.4 });
  // Down the steps under the hammers...
  c.flat(32, 26, 4, 3, 12, { color: 3 });
  c.flat(28, 26, 4, 3, 10, { color: 3 });
  c.hammer(29, 26, { w: 2, d: 3, period: 2.2 });
  c.flat(24, 26, 4, 3, 8, { color: 3 });
  c.slope(24, 29, 4, 9, 8, 6, 'z', { color: 1 });
  // ...or the long way down, with a steelie at the turn.
  c.slope(42, 31, 4, 8, 14, 10, 'z', { color: 1 });
  c.flat(40, 39, 6, 4, 10);
  c.steelie(45, 42, { range: 4 });
  c.slope(28, 39, 12, 3, 8, 10, 'x', { color: 2 });
  c.flat(20, 38, 8, 6, 6);
  c.slope(22, 44, 4, 6, 6, 3, 'z', { color: 1 });
  c.goal(20, 50, 8, 3, 3);
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

export const RACES = [practice, beginner, intermediate, crossroads, twister, aerial, silly, marathon, gauntlet, odyssey, ultimate];

export function loadRace(index) {
  return RACES[index]();
}
