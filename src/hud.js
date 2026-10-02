import { RACES } from './levels.js';

/**
 * Everything on screen that isn't the 3D view: the clock, the race and the
 * score along the top, the big messages in the middle, the title screen.
 */

const NAMES = RACES.map((race) => race().name.replace(/ Race$/, ''));

export function createHud(root, { onStart }) {
  const $ = (id) => root.querySelector(`#${id}`);
  const top = $('top');
  const raceEl = $('race');
  const clockEl = $('clock');
  const scoreEl = $('score');
  const bannerEl = $('banner');
  const titleEl = $('title');
  const racesEl = $('races');
  const bestEl = $('best');
  const pauseEl = $('pause');
  const muteEl = $('mute');
  let shown = false;
  let lastClock = null;

  muteEl.addEventListener('click', (e) => {
    e.stopPropagation();
    muteEl.dispatchEvent(new CustomEvent('mute', { bubbles: true }));
  });

  return {
    get bannerShown() { return shown; },

    title(saved) {
      titleEl.hidden = false;
      top.hidden = true;
      bannerEl.hidden = true;
      shown = false;
      racesEl.replaceChildren(...RACES.map((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'race';
        b.disabled = i > saved.reached;
        b.innerHTML = `<span>${i + 1}</span>${NAMES[i]}`;
        b.title = b.disabled ? 'Reach this race to start from it' : `Start from the ${NAMES[i]} Race`;
        b.addEventListener('click', (e) => { e.stopPropagation(); onStart(i); });
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        return b;
      }));
      bestEl.textContent = saved.best > 0
        ? `best ${String(saved.best).padStart(6, '0')}${saved.last != null ? ` · last ${String(saved.last).padStart(6, '0')}` : ''}`
        : '';
    },

    play() {
      titleEl.hidden = true;
      top.hidden = false;
    },

    race(name) { raceEl.textContent = name; },

    score(n) { scoreEl.textContent = String(n).padStart(6, '0'); },

    clock(seconds) {
      if (seconds === null) { clockEl.textContent = ''; return; }
      const s = Math.ceil(seconds);
      if (s === lastClock) return;
      lastClock = s;
      clockEl.textContent = String(s);
      clockEl.classList.toggle('low', s <= 10);
    },

    banner(text, size = 'normal') {
      shown = text != null;
      bannerEl.hidden = !shown;
      if (!shown) return;
      bannerEl.textContent = text;
      bannerEl.className = size;
      // Restart the pop-in.
      void bannerEl.offsetWidth;
      bannerEl.classList.add('pop');
    },

    paused(on) { pauseEl.hidden = !on; },

    muted(on) {
      muteEl.setAttribute('aria-pressed', String(on));
      muteEl.textContent = on ? 'sound off' : 'sound on';
    },
  };
}
