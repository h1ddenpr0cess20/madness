import { createActors } from './actors.js';
import { buildCourse, DEPTH } from './course.js';
import { loadRace } from './levels.js';
import { RADIUS } from './marble.js';
import { BREAK_SPEED, createBall, placeBall, stepBall } from './physics.js';

/**
 * One race as it runs, without anything drawn or heard: the course, the
 * things that move on it, the marble, and the rules — what loses the marble,
 * what counts as reaching the goal, where it goes back to. The game draws
 * and plays it; the tests drive it with an autopilot.
 */

/** The physics runs at a fixed rate, whatever the frame rate. */
export const STEP = 1 / 120;

/** Screen directions on the ground: right is +x −z, up is −x −z. */
export const RIGHT = Object.freeze([Math.SQRT1_2, -Math.SQRT1_2]);
export const UP = Object.freeze([-Math.SQRT1_2, -Math.SQRT1_2]);

/** A push on the screen (x right, y up) as a push along the ground. */
export const toGround = ({ x, y }) => [x * RIGHT[0] + y * UP[0], x * RIGHT[1] + y * UP[1]];

export function createRace(GFX, index, { ball = createBall({ r: RADIUS }) } = {}) {
  const course = loadRace(index);
  const built = buildCourse(course);
  const killY = course.lowest - DEPTH - 2;
  const actors = createActors(GFX, course, built.world, { killY });
  const { x, z } = course.start;
  const safe = [x + 0.5, course.heightAt(x + 0.5, z + 0.5) + ball.r, z + 0.5];
  const race = { index, course, built, world: built.world, actors, killY, ball, time: 0, safe, deepest: safe[1] };
  actors.place(0);
  placeBall(ball, ...safe);
  return race;
}

/** The marble back on the last safe ground it rolled over, and the steelies back where they live. */
export function putBack(race) {
  placeBall(race.ball, ...race.safe);
  for (const s of race.actors.steelies) {
    s.gone = 0;
    placeBall(s.ball, ...s.home);
  }
}

/**
 * One step of everything. `push` is along the ground ([x, z]). While `live`,
 * the rules apply and the steelies chase; while `moving` is false, the marble
 * stays where it is (in pieces, or in the acid). Returns how hard the marble
 * hit anything, and `outcome` — null, 'goal', or how it was lost: 'fell',
 * 'broke', 'crushed' or 'slimed' — and how many whole tiles further down the
 * course it has got than ever before.
 */
export function stepRace(race, push, dt = STEP, { live = true, moving = true } = {}) {
  const ball = race.ball;
  race.time += dt;
  race.actors.place(race.time, dt);
  const events = race.actors.step(dt, race.time, live && moving ? ball : null);
  const out = { impact: 0, bump: events.bump, outcome: null, deeper: 0 };
  if (!moving) return out;

  const result = stepBall(ball, race.world, push[0], push[1], dt);
  out.impact = result.impact;
  if (!live) return out;

  if (result.crushed) out.outcome = 'crushed';
  else if (result.landed && result.impact > BREAK_SPEED) out.outcome = 'broke';
  else if (events.slimed) out.outcome = 'slimed';
  else if (ball.y < race.killY) out.outcome = 'fell';
  else if (ball.grounded && !ball.on) {
    const cx = Math.floor(ball.x), cz = Math.floor(ball.z);
    const cell = race.course.cell(cx, cz);
    if (cell?.kind === 'goal') out.outcome = 'goal';
    else if (cell && race.course.isSafe(cx, cz)) race.safe = [cx + 0.5, cell.h[0] + ball.r, cz + 0.5];
    if (ball.y < race.deepest - 1) {
      out.deeper = Math.floor(race.deepest - ball.y);
      race.deepest -= out.deeper;
    }
  }
  return out;
}
