import { createAudio as createEngineAudio, NOTE } from 'madness-engine/audio';

/**
 * Every sound, made on the spot with the engine's Web Audio (`tone`, `burst`
 * and `loop`) — no samples. The rolling is filtered noise that rises with
 * speed; knocks, the glass breaking, the acid fizz and the jingles are short
 * synthesised bursts; the music is a little sequencer, scheduled a beat or so
 * ahead of the clock.
 *
 * Nothing can play until the page has had a click or a key (browsers insist),
 * so `wake()` is called on the first one.
 */

/** The tune: i–VI–VII–V in D minor, bass on the eighths and an arpeggio on the sixteenths. */
const CHORDS = [
  [50, [62, 65, 69, 74]],
  [46, [62, 65, 70, 74]],
  [48, [64, 67, 72, 76]],
  [45, [61, 64, 69, 73]],
];
const TEMPO = 138;

export function createAudio() {
  let roll = null;
  let tune = null;
  const audio = createEngineAudio({
    storageKey: 'madness.muted',
    volume: { music: 0.22, sfx: 0.9 },
    onWake: (a) => {
      roll = a.loop({ filters: [{ type: 'bandpass', freq: 300, q: 0.7 }, { type: 'lowpass', freq: 1400 }] });
    },
  });
  const tone = (t) => audio.tone({ attack: 0.005, ...t });
  const { burst } = audio;

  function schedule() {
    if (!tune || !audio.ctx) return;
    const step = 60 / TEMPO / 4;
    const now = audio.now();
    while (tune.next < now + 0.25) {
      const i = tune.step;
      const [bass, arp] = CHORDS[Math.floor(i / 16) % CHORDS.length];
      const t = tune.next - now;
      if (i % 2 === 0) {
        tone({ at: t, freq: NOTE(bass - 12 + (i % 8 === 6 ? 12 : 0)), length: step * 1.7, type: 'square', gain: 0.16, out: audio.music });
      }
      const order = [0, 1, 2, 3, 2, 1, 2, 3];
      tone({ at: t, freq: NOTE(arp[order[i % 8]] + (i % 32 >= 16 ? 12 : 0)), length: step * 0.9, type: 'triangle', gain: 0.13, out: audio.music });
      if (i % 4 === 0) burst({ at: t, length: 0.05, type: 'highpass', freq: 7000, gain: i % 8 === 4 ? 0.12 : 0.05 });
      tune.step++;
      tune.next += step;
    }
  }

  return {
    wake: audio.wake,

    get muted() { return audio.muted; },

    toggleMute: audio.toggleMute,

    /** The rumble of rolling, every frame: speed in tiles a second, and whether it's on anything. */
    rolling(speed, grounded) {
      if (!roll) return;
      roll.set({ gain: grounded ? Math.min(0.32, speed * 0.032) : 0 });
      roll.set({ filter: 160 + speed * 85, smooth: 0.08 });
    },

    /** A knock against the course, as hard as `speed`. */
    knock(speed) {
      const k = Math.min(1, speed / 12);
      if (k < 0.08) return;
      burst({ length: 0.07, freq: 700 + 900 * k, gain: 0.5 * k });
      tone({ freq: 140 + 60 * k, to: 60, length: 0.12, gain: 0.5 * k });
    },

    /** Steel on glass. */
    clack(speed) {
      const k = Math.min(1, speed / 8);
      if (k < 0.05) return;
      tone({ freq: 2900, to: 2200, length: 0.06, gain: 0.25 * k });
      tone({ freq: 4400, length: 0.04, gain: 0.12 * k });
      burst({ length: 0.03, type: 'highpass', freq: 3000, gain: 0.3 * k });
    },

    shatter() {
      burst({ length: 0.5, type: 'highpass', freq: 2500, gain: 0.7 });
      burst({ length: 0.18, freq: 900, gain: 0.6 });
      for (let i = 0; i < 14; i++) {
        tone({ at: Math.random() * 0.35, freq: 2200 + Math.random() * 4500, length: 0.08 + Math.random() * 0.2, gain: 0.12 });
      }
    },

    fizz() {
      burst({ length: 0.9, type: 'bandpass', freq: 500, sweep: 3200, q: 2, gain: 0.6 });
      for (let i = 0; i < 8; i++) tone({ at: i * 0.07, freq: 300 + Math.random() * 500, to: 900, length: 0.06, gain: 0.08 });
    },

    fall() {
      tone({ freq: 900, to: 140, length: 1.1, type: 'triangle', gain: 0.25 });
    },

    beep(high = false) {
      tone({ freq: high ? 1320 : 660, length: high ? 0.35 : 0.16, type: 'square', gain: 0.14 });
    },

    tick() {
      tone({ freq: 1760, length: 0.05, type: 'square', gain: 0.07 });
    },

    goal() {
      [72, 76, 79, 84, 79, 84].forEach((n, i) => tone({ at: i * 0.11, freq: NOTE(n), length: i === 5 ? 0.6 : 0.16, type: 'square', gain: 0.14 }));
      [60, 64, 67, 72].forEach((n, i) => tone({ at: i * 0.22, freq: NOTE(n - 12), length: 0.3, type: 'triangle', gain: 0.18 }));
    },

    over() {
      [67, 63, 60, 55].forEach((n, i) => tone({ at: i * 0.28, freq: NOTE(n), length: 0.4, type: 'square', gain: 0.13 }));
    },

    startMusic() {
      if (!audio.ctx || tune) return;
      tune = { step: 0, next: audio.now() + 0.05, timer: setInterval(schedule, 60) };
      schedule();
    },

    stopMusic() {
      if (!tune) return;
      clearInterval(tune.timer);
      tune = null;
    },
  };
}
