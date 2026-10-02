import { World } from './physics.js';

/**
 * A course is a grid of tiles, each with its own four corner heights — so a
 * tile can be flat, a ramp, a bank or a bump, and two tiles side by side can
 * be at different heights with a wall between them. Where there is no tile
 * there is nothing: the marble falls into the dark.
 *
 * x runs down-right across the screen and z down-left; the camera looks from
 * high x and z, so a course starts at the back, high up, and works its way
 * down toward the front.
 */

/** How far the sides of the course reach down into the dark below a tile. */
export const DEPTH = 5;

/** Corner order: (x, z), (x + 1, z), (x, z + 1), (x + 1, z + 1). */
const H00 = 0, H10 = 1, H01 = 2, H11 = 3;

export class Course {
  constructor({ name, cols, rows, time, palette }) {
    this.name = name;
    this.cols = cols;
    this.rows = rows;
    /** Seconds this race adds to the clock. */
    this.time = time;
    this.palette = palette;
    this.cells = new Array(cols * rows).fill(null);
    this.start = { x: 0, z: 0 };
    this.steelies = [];
    this.slimes = [];
    this.hammers = [];
    this.lifts = [];
    this.signs = [];
  }

  cell(x, z) {
    if (x < 0 || z < 0 || x >= this.cols || z >= this.rows) return null;
    return this.cells[z * this.cols + x];
  }

  /** Tiles over the rectangle, each corner at `height(X, Z)` (grid coordinates). */
  surface(x, z, w, d, height, { color = 0, kind = 'floor' } = {}) {
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) throw new Error(`${this.name}: tile ${i},${j} is off the grid`);
        this.cells[j * this.cols + i] = {
          h: [height(i, j), height(i + 1, j), height(i, j + 1), height(i + 1, j + 1)],
          color, kind,
        };
      }
    }
    return this;
  }

  flat(x, z, w, d, h, opts) {
    return this.surface(x, z, w, d, () => h, opts);
  }

  /** A ramp: `from` along its first edge, `to` along its last, running along `axis`. */
  slope(x, z, w, d, from, to, axis, opts) {
    const along = axis === 'x' ? (X) => (X - x) / w : (X, Z) => (Z - z) / d;
    return this.surface(x, z, w, d, (X, Z) => from + (to - from) * along(X, Z), opts);
  }

  clear(x, z, w, d) {
    for (let j = z; j < z + d; j++) for (let i = x; i < x + w; i++) this.cells[j * this.cols + i] = null;
    return this;
  }

  /** The chequered finish. */
  goal(x, z, w, d, h) {
    return this.flat(x, z, w, d, h, { kind: 'goal' });
  }

  steelie(x, z, { range = 9 } = {}) {
    this.steelies.push({ x: x + 0.5, z: z + 0.5, range });
    return this;
  }

  /** An acid slime creeping round a loop of tile centres. */
  slime(points, { speed = 1.6 } = {}) {
    this.slimes.push({ points: points.map(([x, z]) => [x + 0.5, z + 0.5]), speed });
    return this;
  }

  /** A hammer over the tiles, rising `lift` above them and slamming down every `period` seconds. */
  hammer(x, z, { w = 1, d = 1, lift = 2.4, period = 2.6, phase = 0 } = {}) {
    this.hammers.push({ x, z, w, d, lift, period, phase });
    return this;
  }

  /** A platform with its top at `h`, gliding out by `to` and back every `period` seconds. */
  lift(x, z, w, d, h, { to, period = 6, phase = 0, pause = 0.26 }) {
    this.lifts.push({ x, z, w, d, h, to, period, phase, pause });
    return this;
  }

  /** A word painted on the course, like the arrows and "GOAL" of the arcade. */
  sign(text, x, z, { size = 2, angle = 0 } = {}) {
    this.signs.push({ text, x, z, size, angle });
    return this;
  }

  /** The height of the course surface under (x, z), or null over a gap. */
  heightAt(x, z) {
    const i = Math.floor(x), j = Math.floor(z);
    const c = this.cell(i, j);
    if (!c) return null;
    const u = x - i, w = z - j, h = c.h;
    if (u + w <= 1) return h[H00] + (h[H10] - h[H00]) * u + (h[H01] - h[H00]) * w;
    return h[H11] + (h[H01] - h[H11]) * (1 - u) + (h[H10] - h[H11]) * (1 - w);
  }

  /**
   * Somewhere to put the marble back after it is lost: a level tile with
   * level tiles at the same height all round it.
   */
  isSafe(x, z) {
    const c = this.cell(x, z);
    if (!c || !isFlat(c)) return false;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const n = this.cell(x + i, z + j);
        if (!n || !isFlat(n) || Math.abs(n.h[0] - c.h[0]) > 1e-6) return false;
      }
    }
    return true;
  }

  get lowest() {
    let low = Infinity;
    for (const c of this.cells) if (c) low = Math.min(low, ...c.h);
    return low;
  }

  get highest() {
    let high = -Infinity;
    for (const c of this.cells) if (c) high = Math.max(high, ...c.h);
    return high;
  }
}

const isFlat = (c) => c.h.every((v) => Math.abs(v - c.h[0]) < 1e-6);

/** sRGB hex to linear RGB — vertex colours are linear. */
export function linearRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
}

/**
 * Everything drawn and everything collided with, from the tiles: the tops
 * (one quad per tile, each with the whole tile texture, so every tile gets
 * its grid lines), the walls down the sides, and a World holding both as
 * triangles for the physics.
 */
export function buildCourse(course) {
  const world = new World({ cols: course.cols, rows: course.rows });
  const tops = { position: [], normal: [], color: [], uv: [] };
  const walls = { position: [], normal: [], color: [] };
  const palette = course.palette;
  const tileColours = palette.tiles.map(linearRGB);
  const goalColours = [linearRGB('#f4f1ea'), linearRGB('#1c1b1a')];
  const wallColours = (palette.walls ?? palette.tiles).map(linearRGB);

  const face = (out, a, b, c, normal, colours, uvs) => {
    out.position.push(...a, ...b, ...c);
    for (let k = 0; k < 3; k++) out.normal.push(...normal);
    out.color.push(...colours[0], ...colours[1], ...colours[2]);
    if (uvs) out.uv.push(...uvs[0], ...uvs[1], ...uvs[2]);
    world.addTriangle(...a, ...b, ...c);
  };

  const normalOf = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  };

  /** A wall triangle, wound to face `out` (the way the wall looks). */
  const wallTriangle = (a, b, c, out, shade) => {
    let n = normalOf(a, b, c);
    if (n[0] * out[0] + n[2] * out[2] < 0) { [b, c] = [c, b]; n = normalOf(a, b, c); }
    face(walls, a, b, c, n, [shade(a[1]), shade(b[1]), shade(c[1])]);
  };

  for (let z = 0; z < course.rows; z++) {
    for (let x = 0; x < course.cols; x++) {
      const c = course.cell(x, z);
      if (!c) continue;
      const [h00, h10, h01, h11] = c.h;
      const checker = (x + z) % 2;
      const base = c.kind === 'goal' ? goalColours[checker] : tileColours[c.color % tileColours.length];
      const tint = c.kind === 'goal' ? 1 : checker ? 0.88 : 1;
      const col = base.map((v) => v * tint);
      const A = [x, h00, z], B = [x + 1, h10, z], C = [x, h01, z + 1], D = [x + 1, h11, z + 1];
      face(tops, A, C, B, normalOf(A, C, B), [col, col, col], [[0, 1], [0, 0], [1, 1]]);
      face(tops, B, C, D, normalOf(B, C, D), [col, col, col], [[1, 1], [0, 0], [1, 0]]);

      // The sides: down to the next tile, or into the dark.
      const wallBase = wallColours[c.color % wallColours.length];
      const low = Math.min(...c.h) - DEPTH;
      const edges = [
        // [ends, this tile's heights there, neighbour, its heights there, outward]
        [[x, z], [x + 1, z], h00, h10, course.cell(x, z - 1), (n) => [n.h[H01], n.h[H11]], [0, 0, -1]],
        [[x, z + 1], [x + 1, z + 1], h01, h11, course.cell(x, z + 1), (n) => [n.h[H00], n.h[H10]], [0, 0, 1]],
        [[x, z], [x, z + 1], h00, h01, course.cell(x - 1, z), (n) => [n.h[H10], n.h[H11]], [-1, 0, 0]],
        [[x + 1, z], [x + 1, z + 1], h10, h11, course.cell(x + 1, z), (n) => [n.h[H00], n.h[H01]], [1, 0, 0]],
      ];
      for (const [p0, p1, a0, a1, n, theirs, out] of edges) {
        const [b0, b1] = n ? theirs(n) : [low, low];
        const top = Math.max(a0, a1);
        const shade = (y) => {
          const k = Math.max(0, Math.min(1, 1 - (top - y) / DEPTH));
          return wallBase.map((v) => v * (0.12 + 0.88 * k));
        };
        const at = (p, y) => [p[0], y, p[1]];
        const lerp = (t) => [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
        const d0 = a0 - b0, d1 = a1 - b1;
        if (d0 <= 1e-6 && d1 <= 1e-6) continue;
        if (d0 >= -1e-6 && d1 >= -1e-6) {
          if (d0 > 1e-6) wallTriangle(at(p0, b0), at(p1, b1), at(p0, a0), out, shade);
          if (d1 > 1e-6) wallTriangle(at(p1, b1), at(p1, a1), at(p0, a0), out, shade);
        } else {
          // The two edges cross: this tile is higher on one side of the crossing only.
          const t = d0 / (d0 - d1);
          const m = lerp(t);
          const ym = a0 + (a1 - a0) * t;
          if (d0 > 0) wallTriangle(at(p0, b0), at(m, ym), at(p0, a0), out, shade);
          else wallTriangle(at(p1, b1), at(p1, a1), at(m, ym), out, shade);
        }
      }
    }
  }

  world.finish();
  const typed = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, new Float32Array(v)]));
  return { tops: typed(tops), walls: typed(walls), world };
}
