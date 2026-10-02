/**
 * The controls, all of them reduced to one stick: which way on the screen to
 * push, as `x` (right) and `y` (up), each -1 to 1.
 *
 * - Keys: arrows or WASD. Two at once for the diagonals the courses run along.
 * - Mouse or touch: hold anywhere, and the marble is pushed toward the
 *   pointer — harder the further it is from the marble.
 * - Gamepad: left stick or d-pad.
 *
 * Buttons come out as one-shot presses: `start` (Enter, Space, A or a tap),
 * `pause` (P, Escape, Start), `mute` (M), `zoom` (Z).
 */

const KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};
const PRESSES = {
  Enter: 'start', Space: 'start',
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute', KeyZ: 'zoom',
};

/** How far from the marble, in CSS pixels, the pointer has to be for a full push. */
const REACH = 110;

export function createInput(surface, { anchor }) {
  const held = new Set();
  const presses = [];
  let pointer = null;

  addEventListener('keydown', (e) => {
    // A focused button takes its own Enter and Space.
    if (e.target instanceof HTMLButtonElement && (e.code === 'Space' || e.code === 'Enter')) return;
    if (KEYS[e.code]) {
      held.add(KEYS[e.code]);
      e.preventDefault();
    }
    if (PRESSES[e.code] && !e.repeat) {
      presses.push(PRESSES[e.code]);
      if (e.code === 'Space') e.preventDefault();
    }
  });
  addEventListener('keyup', (e) => {
    if (KEYS[e.code]) held.delete(KEYS[e.code]);
  });
  addEventListener('blur', () => { held.clear(); pointer = null; });

  surface.addEventListener('pointerdown', (e) => {
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    surface.setPointerCapture?.(e.pointerId);
    presses.push('tap');
    e.preventDefault();
  });
  surface.addEventListener('pointermove', (e) => {
    if (pointer && pointer.id === e.pointerId) { pointer.x = e.clientX; pointer.y = e.clientY; }
  });
  const release = (e) => { if (pointer && pointer.id === e.pointerId) pointer = null; };
  surface.addEventListener('pointerup', release);
  surface.addEventListener('pointercancel', release);
  surface.addEventListener('contextmenu', (e) => e.preventDefault());

  let padWas = {};

  return {
    /** The push this frame. */
    stick() {
      let x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      let y = (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0);

      if (pointer) {
        const at = anchor();
        if (at) {
          const dx = pointer.x - at.x, dy = at.y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d > 6) {
            const k = Math.min(1, d / REACH) / d;
            x += dx * k; y += dy * k;
          }
        }
      }

      const pad = navigator.getGamepads?.().find((p) => p && p.connected);
      if (pad) {
        const [sx = 0, sy = 0] = pad.axes;
        const dead = (v) => (Math.abs(v) < 0.18 ? 0 : v);
        x += dead(sx); y -= dead(sy);
        const b = (i) => pad.buttons[i]?.pressed;
        if (b(12)) y += 1;
        if (b(13)) y -= 1;
        if (b(14)) x -= 1;
        if (b(15)) x += 1;
        const now = { start: b(0), pause: b(9) };
        for (const name of Object.keys(now)) if (now[name] && !padWas[name]) presses.push(name);
        padWas = now;
      }

      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x, y };
    },

    /** The one-shot presses since last asked. */
    take() {
      return presses.splice(0);
    },

    get pointing() { return pointer !== null; },
  };
}
