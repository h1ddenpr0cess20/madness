import { createEffects } from './effects.js';
import { RACES } from './levels.js';
import { createMarble } from './marble.js';
import { rollSpin, turn } from './physics.js';
import { createRace, putBack, STEP, stepRace, toGround } from './race.js';
import { createCourseMeshes, createGoalGate } from './scenery.js';

/**
 * The game: races one after another against one clock. Whatever time is left
 * at a goal carries over, with the next race's own time added; run out and
 * it's over. Lose the marble — off an edge, a drop too far, a hammer, the
 * acid — and it's put back on the last safe ground it crossed while the
 * clock runs on.
 */

/** Score: so much a race, so much a second left at the goal, and a little for every tile further down. */
export const SCORE = Object.freeze({ race: 1000, second: 50, depth: 10 });

const BANNERS = {
  fell: 'OOPS!',
  broke: 'SHATTERED!',
  crushed: 'SQUASHED!',
  slimed: 'DISSOLVED!',
};

/** How close the camera comes for the title: near enough to see the spark in the glass. */
const TITLE_ZOOM = 0.42;

export function createGame({ stage, hud, input, audio, storage }) {
  const { GFX, scene } = stage;
  const effects = createEffects(GFX, scene);
  const { marble: marbleMesh, spin: marbleSpin } = createMarble(GFX);
  scene.add(marbleMesh);

  const q = [0, 0, 0, 1];
  const spin = [0, 0, 0];

  let race = null;
  let group = null;
  let state = 'title';  // title · ready · play · lost · finish · over · won
  let paused = false;
  let clock = 0;
  let score = 0;
  let timer = 0;        // seconds into the current state
  let accumulator = 0;
  let lastTick = 0;
  let lostHow = null;
  let zoom = 1;
  let saved = storage.load();

  function setRace(index) {
    if (group) scene.remove(group);
    race = createRace(GFX, index, race ? { ball: race.ball } : {});
    group = new GFX.Group();
    group.add(createCourseMeshes(GFX, race.built));
    const gate = createGoalGate(GFX, race.course);
    if (gate) group.add(gate);
    group.add(race.actors.group);
    scene.add(group);
    effects.setCourse(race.course);
    accumulator = 0;
    showMarble();
    const b = race.ball;
    stage.target.set(b.x, b.y, b.z);
  }

  function showMarble() {
    spin[0] = spin[1] = spin[2] = 0;
    marbleMesh.visible = true;
    marbleMesh.scale.setScalar(1);
  }

  function enter(next) {
    state = next;
    timer = 0;
  }

  function showTitle() {
    setRace(0);
    enter('title');
    paused = false;
    hud.paused(false);
    stage.zoom = TITLE_ZOOM;
    audio.stopMusic();
    hud.title(saved);
    hud.clock(null);
  }

  function startRun(index) {
    score = 0;
    clock = 0;
    beginRace(index);
  }

  function beginRace(index) {
    setRace(index);
    clock += race.course.time;
    lastTick = 0;
    saved = storage.reached(index);
    stage.zoom = zoom;
    enter('ready');
    hud.play();
    hud.banner(race.course.name.toUpperCase(), 'big');
    hud.race(race.course.name);
    hud.score(score);
    hud.clock(clock);
    audio.wake();
    audio.beep();
    audio.startMusic();
  }

  function lose(how) {
    const b = race.ball;
    lostHow = how;
    enter('lost');
    hud.banner(BANNERS[how]);
    if (how === 'broke' || how === 'crushed') {
      effects.shatter(b.x, b.y, b.z, b.vx, b.vz);
      marbleMesh.visible = false;
      audio.shatter();
    } else if (how === 'slimed') {
      effects.dissolve(b.x, b.y, b.z);
      audio.fizz();
    } else {
      audio.fall();
    }
  }

  function finish() {
    const b = race.ball;
    enter(race.index === RACES.length - 1 ? 'won' : 'finish');
    const bonus = SCORE.race * (race.index + 1) + Math.ceil(clock) * SCORE.second;
    score += bonus;
    hud.score(score);
    hud.banner(state === 'won' ? `YOU WIN!\n+${bonus}` : `RACE COMPLETE\n+${bonus}`, 'big');
    effects.confetti(b.x, b.y + 0.3, b.z);
    audio.stopMusic();
    audio.goal();
    if (state === 'won') saved = storage.record(score);
  }

  function timeOut() {
    enter('over');
    clock = 0;
    hud.clock(0);
    hud.banner('TIME OUT\nGAME OVER', 'big');
    audio.stopMusic();
    audio.over();
    saved = storage.record(score);
  }

  function physics(push) {
    const live = state === 'play';
    // In pieces or in the acid, the marble stays put; off an edge, it keeps falling.
    const moving = marbleMesh.visible && !(state === 'lost' && lostHow !== 'fell');
    const out = stepRace(race, push, STEP, { live, moving });
    if (out.impact > 2.5) audio.knock(out.impact);
    if (out.bump > 0.5) audio.clack(out.bump);
    if (out.deeper) {
      score += out.deeper * SCORE.depth;
      hud.score(score);
    }
    if (out.outcome === 'goal') finish();
    else if (out.outcome) lose(out.outcome);
  }

  function update(dt, presses) {
    for (const p of presses) {
      if (p === 'mute') hud.muted(audio.toggleMute());
      if (p === 'zoom' && state !== 'title') stage.zoom = zoom = zoom === 1 ? 0.6 : 1;
      if (p === 'pause' && (state === 'play' || state === 'ready' || state === 'lost')) {
        paused = !paused;
        hud.paused(paused);
        if (paused) audio.stopMusic(); else audio.startMusic();
      }
      if ((p === 'start' || p === 'tap') && (state === 'over' || state === 'won') && timer > 1.2) showTitle();
      else if (p === 'start' && state === 'title') startRun(0);
    }
    if (paused) {
      audio.rolling(0, false);
      return;
    }

    timer += dt;
    const push = state === 'play' ? toGround(input.stick()) : [0, 0];
    accumulator = Math.min(accumulator + dt, STEP * 12);
    while (accumulator >= STEP) {
      accumulator -= STEP;
      physics(state === 'play' ? push : [0, 0]);
    }

    const b = race.ball;
    switch (state) {
      case 'ready':
        if (timer > 1.1) {
          enter('play');
          hud.banner('GO!', 'big');
          audio.beep(true);
        }
        break;
      case 'play':
        clock -= dt;
        if (clock <= 10 && clock > 0 && Math.ceil(clock) !== lastTick) {
          lastTick = Math.ceil(clock);
          audio.tick();
        }
        if (clock <= 0) timeOut();
        else if (timer > 0.8 && hud.bannerShown) hud.banner(null);
        break;
      case 'lost':
        clock -= dt;
        if (clock <= 0) timeOut();
        else if (timer > 1.7) {
          putBack(race);
          showMarble();
          hud.banner(null);
          enter('play');
        }
        break;
      case 'finish':
        if (timer > 3) beginRace(race.index + 1);
        break;
      case 'over':
      case 'won':
        if (timer > 8) showTitle();
        break;
    }

    if (state === 'play' || state === 'lost') hud.clock(Math.max(0, clock));

    // The marble's look: where it is, and how it has turned.
    marbleMesh.position.set(b.x, b.y, b.z);
    if (state === 'lost' && lostHow === 'slimed') {
      const k = Math.max(0, 1 - timer / 0.7);
      marbleMesh.scale.setScalar(k);
      marbleMesh.position.y = b.y - (1 - k) * 0.3;
    }
    if (state === 'title') {
      spin[0] = 0.3; spin[1] = 0.55; spin[2] = 0.12;
    } else if (b.grounded) {
      rollSpin(b, spin);
    } else {
      for (let i = 0; i < 3; i++) spin[i] *= Math.max(0, 1 - 0.3 * dt);
    }
    turn(q, spin, dt);
    marbleSpin.quaternion.set(q[0], q[1], q[2], q[3]);

    race.actors.sync(dt, race.time);
    effects.update(dt);
    audio.rolling(state === 'play' && b.grounded ? Math.hypot(b.vx, b.vz) : 0, b.grounded);

    // The camera: after the marble, but not down into the dark after it.
    const target = stage.target;
    if (debug.look) {
      target.set(...debug.look.at);
      stage.zoom = debug.look.zoom;
      return;
    }
    const ty = Math.max(b.y, race.course.lowest - 1);
    const k = 1 - Math.exp(-(state === 'title' ? 2 : 5) * dt);
    target.x += (b.x - target.x) * k;
    target.y += (ty - target.y) * k;
    target.z += (b.z - target.z) * k;
  }

  /** For tests and the console: the race, the clock, and a camera override (`look`). */
  const debug = {
    stage, look: null,
    get race() { return race; },
    get ball() { return race.ball; },
    get clock() { return clock; },
    set clock(v) { clock = v; },
  };

  showTitle();

  return {
    update,
    startRun,
    get state() { return state; },
    get paused() { return paused; },
    /** Where the marble is on the screen, in CSS pixels, for the pointer controls. */
    marbleOnScreen(rect) {
      const b = race.ball;
      const v = new GFX.Vector3(b.x, b.y, b.z).project(stage.camera);
      return { x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height };
    },
    debug,
  };
}
