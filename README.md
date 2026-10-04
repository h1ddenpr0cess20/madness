# Madness

A Marble Madness-style 3D racer. You roll a glass marble down courses that hang
in the dark, with a single clock running against you. You can roll off the
edges, drop too far, get flattened by a hammer or dissolved by acid, and get
shoved off by black steelies along the way. Whatever time is left at a goal
carries over into the next race.

The marble is [Alan](https://github.com/h1ddenpr0cess20/alan)'s eye: the same
sphere of clear glass, drawn by the same engine. Where Alan has an iris, the
marble has the Claude spark made three-dimensional: a burst of terracotta
strands out every way from the middle, each one fuller toward its rounded tip.
It tumbles inside the glass as the marble rolls.

![The marble on the title screen](docs/screenshots/title.png)

![The Aerial Race, under the hammers](docs/screenshots/aerial.png)

## Run

```sh
git clone https://github.com/h1ddenpr0cess20/madness
cd madness
npm install
npm run dev               # → http://localhost:5173
```

No server and no keys: it's a static page. `npm run build` puts it in `dist/`,
which runs from any folder or path.

## Play

| | |
|---|---|
| <kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> or <kbd>WASD</kbd> | Roll. The courses run diagonally across the screen, so hold two at once. |
| Hold the mouse or a finger | Roll toward the pointer. The further it is from the marble, the harder the push. |
| <kbd>Q</kbd> <kbd>E</kbd>, or drag with the right mouse button | Turn the board round the marble. Dragging up and down tilts it, from a skim across the tiles to nearly straight down. |
| Mouse wheel, or <kbd>+</kbd> <kbd>−</kbd> | Zoom in and out. |
| Two fingers | Pinch to zoom, twist to turn the board, drag up or down to tilt. |
| <kbd>C</kbd> | Put the view back where it started. |
| Gamepad | Left stick or d-pad rolls; right stick turns and tilts; shoulder buttons zoom; <kbd>A</kbd> starts, <kbd>Start</kbd> pauses. |
| <kbd>P</kbd> / <kbd>Esc</kbd> | Pause. You can still turn and zoom to look around. |
| <kbd>M</kbd> | Sound on or off. |

The controls follow the view: up always rolls the marble up the screen,
however the board is turned.

There are eleven races: Practice, Beginner, Intermediate, Crossroads, Twister,
Aerial, Silly, Marathon, Gauntlet, Odyssey and Ultimate. Crossroads and Odyssey
split along the way: a short way that is narrow, full of holes or under the
hammers, or a long way round that is safer but costs you seconds. Marathon and
Odyssey are the long ones, back and forth across the biggest boards in the game.
Each one adds its own time to whatever you had left. Losing the marble puts it
back on the last safe ground it crossed while the clock keeps running, so a
fall costs a couple of seconds and nothing more. The title screen lets you
start from any race you have reached before, and it keeps your best score.

What's out there:

- **Drops.** A long fall onto flat ground breaks the marble. Coming down at a
  glance onto a slope doesn't.
- **Steelies.** Heavy black marbles that come for you and try to knock you off
  the edge.
- **Acid slimes.** Green blobs that creep round set paths. Touch one and the
  marble is gone.
- **Hammers.** They climb slowly, wait at the top, then slam down.
- **Lifts.** They carry you across gaps, down shafts and, in the Silly Race,
  back up again. They pause at each end for you to get on or off.
- **Chutes and bowls.** The Twister Race is a bobsleigh run of banked chutes
  and bends. Bowls dip in the middle, and the Gauntlet's bowl is a sumo ring
  full of steelies.

## How it's made

| | |
|---|---|
| `src/vendor/gfx/` | Alan's renderer, copied unchanged from `alan/src/client/vendor/gfx`: WebGPU where the browser has it, WebGL 2 where it doesn't (`?renderer=webgl` pins it), physically based shading, transmission and shadows. |
| `src/marble.js` | Alan's glass (`createEye`), scaled down to a marble, with the 3D spark inside it. |
| `src/course.js` | A course is a grid of tiles, each with four corner heights. That one structure gives flat ground, ramps, banks, half-pipes, bowls and bumps, with walls wherever neighbouring tiles differ. It builds both the mesh and the collision triangles. |
| `src/levels.js` | The eleven races, written with `flat`, `slope`, `chute`, `bend`, `bowl`, `surface` and the hazards. |
| `src/physics.js` | Sphere physics written for this game: gravity, the push from the controls, then contact resolution against the triangles and the moving boxes, nearest contact first so seams between tiles don't nudge the marble. |
| `src/race.js` | One race with nothing drawn: the rules for losing the marble, reaching the goal and where it goes back to. The game draws it; the tests drive it. |
| `src/view.js` | Where the camera sits round the marble — turned, tilted and zoomed within limits, eased toward wherever the player aims it — and which way on the ground is up and right on the screen. |
| `src/audio.js` | Every sound, synthesised with Web Audio. |

| Script | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Bundles to `dist/` |
| `npm run preview` | `build`, then serves `dist/` |
| `npm test` | `node:test`: the physics, the course builder, the hazards, the marble, and an autopilot that has to finish every race well inside its time without losing the marble |
| `npm run lint` | ESLint |

The renderer is three.js-shaped but isn't three.js; see
`src/vendor/gfx/LICENSE` for what it ports from it.
