/**
 * An autopilot for the races: it steers the marble from waypoint to
 * waypoint with the same push the controls give, waits for hammers and lifts
 * where a waypoint says to, and shies away from slimes. If it can finish a
 * race in the time the race gives, a person can — the tests hold every race
 * to that.
 */

import * as GFX from '../../src/vendor/gfx/index.js';
import { hammerAt, liftAt } from '../../src/actors.js';
import { createRace, putBack, STEP, stepRace } from '../../src/race.js';

/** A hammer's place in its cycle, 0 to 1. */
const cycle = (race, i) => {
  const h = race.actors.hammers[i];
  return ((((race.time + h.phase) / h.period) % 1) + 1) % 1;
};

/** Clear to go under hammer `i`: it has just gone up and is a good while off coming down. */
export const hammerUp = (i) => (race) => {
  const u = cycle(race, i);
  return u > 0.2 && u < 0.42 && hammerAt(race.time, race.actors.hammers[i].period, race.actors.hammers[i].phase) > 0.35;
};

/** Lift `i` waiting at its start (0) or its far end (1). */
export const liftAtEnd = (i, end) => (race) => {
  const l = race.actors.lifts[i];
  const s = liftAt(race.time, l.period, l.phase, l.pause);
  const u = ((((race.time + l.phase) / l.period) % 1) + 1) % 1;
  // Early enough in the pause to get on or off before it moves.
  return end === 0 ? s === 0 && u < l.pause * 0.45 : s === 1 && u > 0.5 && u < 0.5 + l.pause * 0.45;
};

/**
 * Drive race `index` along `route`: waypoints `{ at: [x, z], speed, until,
 * on }` in tile coordinates — `until(race)` holds the marble at the point
 * until it's true; `on` makes the point ride with that lift.
 */
export function drive(index, route, { limit = 200 } = {}) {
  const race = createRace(GFX, index);
  const b = race.ball;
  const losses = [];
  let wp = 0;
  let down = 0;
  let t = 0;
  let held = 0;

  const target = (w) => {
    if (w.on === undefined) return w.at;
    const box = race.actors.lifts[w.on].box;
    return [box.min[0] + w.at[0], box.min[2] + w.at[1]];
  };

  while (t < limit) {
    t += STEP;
    if (down > 0) {
      down -= STEP;
      stepRace(race, [0, 0], STEP, { live: false, moving: false });
      if (down <= 0) {
        putBack(race);
        // Back to the waypoint nearest where it was put back, at or before where it got to.
        let best = 0, bestD = Infinity;
        for (let i = 0; i <= wp; i++) {
          const [x, z] = target(route[i]);
          const d = Math.hypot(x - b.x, z - b.z);
          if (d < bestD) { bestD = d; best = i; }
        }
        wp = best;
      }
      continue;
    }

    const w = route[wp];
    const [tx, tz] = target(w);
    const dx = tx - b.x, dz = tz - b.z;
    const d = Math.hypot(dx, dz);
    const waiting = w.until && !w.until(race);
    const last = wp === route.length - 1;

    if (!waiting && d < (w.radius ?? 0.55) && !last) {
      wp++;
      held = 0;
      continue;
    }
    if (waiting) held += STEP;

    // Where it wants to be going: at the waypoint's speed, easing in if it has to stop there.
    const speed = w.speed ?? 4.5;
    const stop = waiting || w.stop;
    const want = stop ? Math.min(speed, d * 2.5) : speed;
    let vx = d > 1e-3 ? (dx / d) * want : 0;
    let vz = d > 1e-3 ? (dz / d) * want : 0;

    // Keep clear of the acid.
    for (const s of race.actors.slimes) {
      const sx = b.x - s.x, sz = b.z - s.z;
      const sd = Math.hypot(sx, sz);
      if (sd < 1.7 && sd > 1e-3) {
        const k = (1.7 - sd) * 4;
        vx += (sx / sd) * k;
        vz += (sz / sd) * k;
      }
    }

    // And out of the steelies' way.
    for (const s of race.actors.steelies) {
      const sx = b.x - s.ball.x, sz = b.z - s.ball.z;
      const sd = Math.hypot(sx, sz);
      if (s.gone <= 0 && sd < 1.6 && sd > 1e-3) {
        const k = (1.6 - sd) * 3;
        vx += (sx / sd) * k;
        vz += (sz / sd) * k;
      }
    }

    // On a lift, its velocity is already its roll across the lift; the lift's
    // movement only matters for where the target is.
    let px = (vx - b.vx) * 0.9;
    let pz = (vz - b.vz) * 0.9;
    const l = Math.hypot(px, pz);
    if (l > 1) { px /= l; pz /= l; }

    const out = stepRace(race, [px, pz], STEP);
    if (out.outcome === 'goal') return { finished: true, time: t, losses };
    if (out.outcome) {
      losses.push({ how: out.outcome, at: [b.x.toFixed(1), b.y.toFixed(1), b.z.toFixed(1)], wp, time: t.toFixed(1) });
      down = 1.7;
    }
  }
  return { finished: false, time: t, losses, stuckAt: { wp, x: b.x, y: b.y, z: b.z, held } };
}

const p = (x, z, more) => ({ at: [x, z], ...more });

/** The way round each race. */
export const ROUTES = [
  // Practice
  [p(7, 4), p(15.5, 4), p(19, 4, { speed: 3 }), p(19, 7.5), p(19, 14.5), p(19.5, 16.5, { speed: 3 }),
    p(23, 16.5), p(31, 16.5), p(34, 16.5, { speed: 3 }), p(34, 21), p(34, 26.5, { speed: 3 }), p(34, 32), p(34, 35), p(34, 37.5)],
  // Beginner
  [p(7, 4), p(19, 4), p(23, 5.5, { speed: 3 }), p(23, 9, { speed: 3 }), p(23, 15, { speed: 3 }), p(23.5, 16, { speed: 2.5 }),
    p(28, 16, { speed: 3 }), p(34.5, 16, { speed: 3 }), p(35.5, 17, { speed: 2.5 }), p(35.5, 24, { speed: 3 }), p(35, 26), p(35, 28),
    p(35, 30), p(35, 34), p(35, 36)],
  // Intermediate
  [p(6, 3.5, { speed: 3.5 }), p(16, 3.5, { speed: 3.5 }), p(21, 5.5, { speed: 3 }), p(21, 10, { speed: 3 }), p(21, 18, { speed: 3 }),
    p(21, 23, { speed: 3 }), p(21, 31, { speed: 3 }), p(22, 35), p(22, 39.5)],
  // Twister
  [p(6, 3.5, { speed: 3.5 }), p(15.5, 3.5, { speed: 4 }), p(17.1, 3.9, { speed: 3 }), p(17.5, 6, { speed: 3 }), p(17.5, 12.5, { speed: 4 }),
    p(18, 14, { speed: 3 }), p(21.6, 14.5, { until: hammerUp(0), stop: true, speed: 3.5 }), p(26.5, 14.5, { speed: 5 }), p(28.1, 14.9, { speed: 3 }),
    p(28.5, 17, { speed: 3 }), p(28.5, 23.5, { speed: 4 }), p(28.5, 26.5, { speed: 3 }), p(28.5, 30.5, { speed: 3 }), p(28.5, 35, { speed: 3 }),
    p(28.5, 41.5)],
  // Aerial
  [p(6, 3, { speed: 3 }), p(7.2, 3, { until: hammerUp(0), stop: true }), p(10.2, 3, { speed: 5, until: hammerUp(1), stop: true }),
    p(13.5, 3, { speed: 5 }), p(18.4, 3.5, { until: liftAtEnd(0, 0), stop: true, speed: 3 }), p(1.5, 1.5, { on: 0, until: liftAtEnd(0, 1), stop: true, speed: 2.5 }),
    p(26.5, 3.5, { speed: 3 }), p(27, 6, { speed: 2.5 }), p(27, 14, { speed: 3 }), p(25.5, 17.4, { until: liftAtEnd(1, 0), stop: true, speed: 2.5 }),
    p(1.5, 1.5, { on: 1, until: liftAtEnd(1, 1), stop: true, speed: 2 }), p(25.5, 22.5, { speed: 2.5 }), p(25.5, 24.6, { speed: 2, stop: true }),
    p(25.5, 30.5, { speed: 2.2 }), p(23.5, 31, { speed: 3 }), p(23.5, 34, { speed: 3 }), p(23.5, 40, { speed: 3 }), p(23.5, 43.5)],
  // Silly
  [p(29.5, 32, { speed: 3 }), p(29.5, 22.5, { speed: 5 }), p(29.5, 19, { speed: 3 }), p(29.5, 17.6, { until: liftAtEnd(0, 0), stop: true, speed: 2.5 }),
    p(1.5, 1.5, { on: 0, until: liftAtEnd(0, 1), stop: true, speed: 2 }), p(29.5, 12, { speed: 2.5 }), p(26, 11.5, { speed: 3 }), p(14, 11.5, { speed: 5 }),
    p(11, 10.5, { speed: 3 }), p(10.4, 10.5, { until: liftAtEnd(1, 0), stop: true, speed: 2.5 }), p(1.5, 1.5, { on: 1, until: liftAtEnd(1, 1), stop: true, speed: 2 }),
    p(1.5, 10.5, { speed: 2.5 }), p(1.5, 8, { speed: 3 }), p(1.5, 3.5, { speed: 5 }), p(1.9, 1.9, { speed: 3 }), p(4, 1.5, { speed: 3 }), p(11, 1.5), p(13.5, 1.5)],
  // Gauntlet
  [p(6, 3.5, { speed: 3 }), p(8.5, 3.5, { speed: 2.5 }), p(8.5, 2.5, { speed: 2 }), p(11.5, 2.5, { speed: 2.5 }), p(11.5, 3.5, { speed: 2 }),
    p(15.5, 3.5, { speed: 2.5 }), p(15.5, 2.5, { speed: 2 }), p(18.5, 2.5, { speed: 3 }), p(24.3, 3, { until: hammerUp(0), stop: true, speed: 3 }),
    p(27.2, 3, { until: hammerUp(1), stop: true, speed: 5 }), p(30.2, 3, { until: hammerUp(2), stop: true, speed: 5 }), p(34, 3, { speed: 5 }),
    p(38, 6, { speed: 3 }), p(38, 12, { speed: 3 }), p(37, 14, { speed: 3 }), p(36.5, 21.5, { speed: 3.5 }), p(36.5, 26.5, { speed: 2.5, radius: 0.3 }),
    p(40.5, 26.5, { speed: 2.5 }), p(40.5, 32.5, { speed: 2.5 }), p(40.5, 34, { speed: 3 }), p(39, 39, { speed: 3 }), p(39, 44)],
  // Ultimate
  [p(6, 3, { speed: 3 }), p(14, 3, { speed: 3 }), p(17, 6, { speed: 3 }), p(17, 9.8, { until: hammerUp(0), stop: true, speed: 3 }),
    p(17, 13.8, { until: hammerUp(1), stop: true, speed: 5 }), p(17, 19.5, { speed: 4 }), p(20.3, 21, { until: liftAtEnd(0, 0), stop: true, speed: 3 }),
    p(1, 1, { on: 0, until: liftAtEnd(0, 1), stop: true, speed: 2 }), p(28.5, 21, { speed: 2.5 }), p(28, 22.3, { until: liftAtEnd(1, 0), stop: true, speed: 2 }),
    p(1, 1, { on: 1, until: liftAtEnd(1, 1), stop: true, speed: 2 }), p(28, 30, { speed: 2.5 }), p(32, 30, { speed: 3 }), p(41, 30, { speed: 3.5 }),
    p(43, 33, { speed: 3 }), p(43, 35, { speed: 3 }), p(43, 41, { speed: 3 }), p(43, 42.5, { speed: 3 }), p(43, 46)],
];
