/**
 * Where the camera is, round the marble: turned (`yaw`, round the vertical,
 * from +z toward +x), tilted (`pitch`, up from level) and drawn in or out
 * (`zoom`, a multiple of the usual distance). The player moves the aim; the
 * view eases after it, so a flick of the wheel or a twist of two fingers
 * glides rather than jumps.
 *
 * It starts at the arcade's corner: looking down the diagonal the courses
 * run along, from about forty degrees up.
 */

export const HOME = Object.freeze({ yaw: Math.PI / 4, pitch: Math.atan2(1.15, Math.SQRT2), zoom: 1 });

/** No lower than a skim over the tiles, no higher than nearly straight down; no closer than the marble filling the view, no further than most of a course. */
export const LIMITS = Object.freeze({ pitch: [0.26, 1.4], zoom: [0.3, 2.6] });

/** How quickly the view catches up with its aim, per second. */
const EASE = 12;

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));

export function createView(start = HOME) {
  const view = {
    yaw: start.yaw, pitch: start.pitch, zoom: start.zoom,
    aim: { yaw: start.yaw, pitch: start.pitch, zoom: start.zoom },

    /** Turn by `yaw` and tilt by `pitch`, in radians. */
    turn(yaw, pitch = 0) {
      view.aim.yaw += yaw;
      view.aim.pitch = clamp(view.aim.pitch + pitch, LIMITS.pitch);
    },

    /** Draw in (factor below 1) or back (above 1). */
    zoomBy(factor) {
      view.aim.zoom = clamp(view.aim.zoom * factor, LIMITS.zoom);
    },

    /** Back to the corner it started from, at the usual distance. */
    reset() {
      // The short way round, from wherever it has been turned to.
      const turns = Math.round((view.aim.yaw - HOME.yaw) / (Math.PI * 2));
      Object.assign(view.aim, { ...HOME, yaw: HOME.yaw + turns * Math.PI * 2 });
    },

    /** Ease toward the aim. `jump` lands on it at once. */
    step(dt, jump = false) {
      const k = jump ? 1 : 1 - Math.exp(-EASE * dt);
      view.yaw += (view.aim.yaw - view.yaw) * k;
      view.pitch += (view.aim.pitch - view.pitch) * k;
      view.zoom += (view.aim.zoom - view.zoom) * k;
    },

    /** From what it looks at to the camera, as a unit vector. */
    direction() {
      const c = Math.cos(view.pitch);
      return [Math.sin(view.yaw) * c, Math.sin(view.pitch), Math.cos(view.yaw) * c];
    },
  };
  return view;
}

/**
 * Which way along the ground is right on the screen, and which is up it, for
 * a camera turned to `yaw` — so the controls push the way they point
 * however the course has been turned. Each is [x, z].
 */
export function groundAxes(yaw = HOME.yaw) {
  return {
    right: [Math.cos(yaw), -Math.sin(yaw)],
    up: [-Math.sin(yaw), -Math.cos(yaw)],
  };
}
