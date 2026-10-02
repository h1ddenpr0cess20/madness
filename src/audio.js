/**
 * Every sound, made on the spot with Web Audio — no samples. The rolling is
 * filtered noise that rises with speed; knocks, the glass breaking, the acid
 * fizz and the jingles are short synthesised bursts; the music is a little
 * sequencer, scheduled a beat or so ahead of the clock.
 *
 * Nothing can play until the page has had a click or a key (browsers insist),
 * so `wake()` is called on the first one.
 */

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

/** The tune: i–VI–VII–V in D minor, bass on the eighths and an arpeggio on the sixteenths. */
const CHORDS = [
  [50, [62, 65, 69, 74]],
  [46, [62, 65, 70, 74]],
  [48, [64, 67, 72, 76]],
  [45, [61, 64, 69, 73]],
];
const TEMPO = 138;

export function createAudio() {
  let ctx = null, master = null, sfx = null, music = null;
  let roll = null, noise = null;
  let muted = false;
  let tune = null;

  try { muted = localStorage.getItem('madness.muted') === '1'; } catch {}

  function wake() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ctx.destination);
    sfx = ctx.createGain();
    sfx.gain.value = 0.9;
    sfx.connect(master);
    music = ctx.createGain();
    music.gain.value = 0.22;
    music.connect(master);

    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 300;
    band.Q.value = 0.7;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1400;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(band).connect(low).connect(gain).connect(sfx);
    source.start();
    roll = { band, gain };
  }

  const now = () => ctx.currentTime;

  function burst({ at = 0, length = 0.1, type = 'lowpass', freq = 1000, q = 0.7, gain = 0.5, sweep = null }) {
    if (!ctx) return;
    const t = now() + at;
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + length);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    s.connect(f).connect(g).connect(sfx);
    s.start(t, Math.random() * 1.5);
    s.stop(t + length + 0.05);
  }

  function tone({ at = 0, freq = 440, to = null, length = 0.15, type = 'sine', gain = 0.3, out = sfx, attack = 0.005 }) {
    if (!ctx) return;
    const t = now() + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + length);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + length + 0.05);
  }

  function schedule() {
    if (!tune || !ctx) return;
    const step = 60 / TEMPO / 4;
    while (tune.next < now() + 0.25) {
      const i = tune.step;
      const [bass, arp] = CHORDS[Math.floor(i / 16) % CHORDS.length];
      const t = tune.next - now();
      if (i % 2 === 0) {
        tone({ at: t, freq: NOTE(bass - 12 + (i % 8 === 6 ? 12 : 0)), length: step * 1.7, type: 'square', gain: 0.16, out: music });
      }
      const order = [0, 1, 2, 3, 2, 1, 2, 3];
      tone({ at: t, freq: NOTE(arp[order[i % 8]] + (i % 32 >= 16 ? 12 : 0)), length: step * 0.9, type: 'triangle', gain: 0.13, out: music });
      if (i % 4 === 0) burst({ at: t, length: 0.05, type: 'highpass', freq: 7000, gain: i % 8 === 4 ? 0.12 : 0.05 });
      tune.step++;
      tune.next += step;
    }
  }

  return {
    wake,

    get muted() { return muted; },

    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('madness.muted', muted ? '1' : '0'); } catch {}
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, now(), 0.05);
      return muted;
    },

    /** The rumble of rolling, every frame: speed in tiles a second, and whether it's on anything. */
    rolling(speed, grounded) {
      if (!roll) return;
      const level = grounded ? Math.min(0.32, speed * 0.032) : 0;
      roll.gain.gain.setTargetAtTime(level, now(), 0.05);
      roll.band.frequency.setTargetAtTime(160 + speed * 85, now(), 0.08);
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
      if (!ctx || tune) return;
      tune = { step: 0, next: now() + 0.05, timer: setInterval(schedule, 60) };
      schedule();
    },

    stopMusic() {
      if (!tune) return;
      clearInterval(tune.timer);
      tune = null;
    },
  };
}
