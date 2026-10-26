import { saveSlot } from 'madness-engine/storage';

/**
 * What the game remembers between visits: the best score, and the furthest
 * race reached (any race up to it can be started from the title). The slot
 * is the engine's, guarded, so the game plays the same without storage.
 */

const KEY = 'madness.v1';

export function createStorage(store = globalThis.localStorage) {
  const slot = saveSlot(KEY, store);
  let saved = { best: 0, reached: 0 };
  const raw = slot.read();
  if (raw && typeof raw === 'object') {
    saved.best = Number.isFinite(raw.best) ? raw.best : 0;
    saved.reached = Number.isInteger(raw.reached) ? raw.reached : 0;
  }

  const save = () => {
    slot.write(saved);
    return { ...saved };
  };

  return {
    load: () => ({ ...saved }),
    reached(index) {
      saved = { ...saved, reached: Math.max(saved.reached, index) };
      return save();
    },
    record(score) {
      saved = { ...saved, best: Math.max(saved.best, score), last: score };
      return save();
    },
  };
}
