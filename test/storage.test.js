import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createStorage } from '../src/storage.js';

const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
};

test('remembers the best score and the furthest race', () => {
  const store = memory();
  const s = createStorage(store);
  assert.deepEqual(s.load(), { best: 0, reached: 0 });
  s.reached(2);
  s.reached(1);
  s.record(5000);
  s.record(3000);
  const again = createStorage(store).load();
  assert.equal(again.best, 5000);
  assert.equal(again.reached, 2);
});

test('plays on without storage, or with storage that throws or holds rubbish', () => {
  assert.deepEqual(createStorage(null).load(), { best: 0, reached: 0 });
  const angry = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
  const s = createStorage(angry);
  assert.equal(s.record(10).best, 10);
  assert.deepEqual(createStorage({ getItem: () => '{nope', setItem() {} }).load(), { best: 0, reached: 0 });
  assert.deepEqual(createStorage({ getItem: () => '{"best":"lots","reached":1.5}', setItem() {} }).load(), { best: 0, reached: 0 });
});
