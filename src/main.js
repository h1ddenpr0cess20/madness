import { createAudio } from './audio.js';
import { createGame } from './game.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';
import { createStage } from './stage.js';
import { createStorage } from './storage.js';

const view = document.getElementById('view');
const audio = createAudio();
const wake = () => audio.wake();
addEventListener('pointerdown', wake);
addEventListener('keydown', wake);

let game = null;
const hud = createHud(document.body, {
  onStart: (index) => { audio.wake(); game?.startRun(index); },
});
hud.muted(audio.muted);
document.getElementById('mute').addEventListener('mute', () => hud.muted(audio.toggleMute()));
document.getElementById('start').addEventListener('click', (e) => {
  e.stopPropagation();
  audio.wake();
  game?.startRun(0);
});

const input = createInput(view, {
  anchor: () => game?.marbleOnScreen(view.getBoundingClientRect()),
});

try {
  const stage = await createStage(view);
  game = createGame({ stage, hud, input, audio, storage: createStorage() });
  globalThis.madness = game;

  let last = performance.now();
  stage.renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    game.update(dt, input.take());
    stage.look();
    stage.render();
  });
} catch (err) {
  const box = document.getElementById('error');
  box.hidden = false;
  box.textContent = 'The game could not start: this browser offers neither WebGPU nor WebGL 2.\n\n'
    + String(err && err.message ? err.message : err);
  console.error(err);
}
