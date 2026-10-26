/**
 * The screen, on the engine's stage (`madness-engine/stage`): WebGPU where the
 * browser has it and WebGL 2 where it does not, the physically based shading,
 * glass and shadows the marble is drawn with. A perspective camera that
 * starts at the isometric corner — the arcade's view — and can be turned,
 * tilted and zoomed round wherever the marble is.
 *
 * The lighting is the engine's rig: a soft wash, a key light that casts the
 * shadows (here it follows the play), and a dim fill. The sky is a deep blue
 * haze, and what the glass, steel and polished tiles reflect is a studio,
 * both painted at startup.
 */

import { createStage as createEngineStage } from 'madness-engine/stage';
import { paintRoom } from 'madness-engine/textures/rooms/studio';
import { paintSky } from 'madness-engine/textures/skies/haze';
import { createView } from 'madness-engine/views/arcade';

/** How far back the camera sits at zoom 1, and its lens. Where round the marble it is, is the view's. */
export const LENS = Object.freeze({ distance: 12, fov: 36 });

export function createStage(host) {
  return createEngineStage(host, {
    lens: LENS,
    view: createView(),
    sky: paintSky(),
    room: paintRoom(),
    label: 'madness',
  });
}
