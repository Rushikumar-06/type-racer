import test from 'node:test';
import assert from 'node:assert/strict';
import { createTypingState, applyActions, metrics, validateBatch } from '../src/lib/typing';

test('an error does not advance the car and backspace lets the racer correct it', () => {
  const state = createTypingState();
  applyActions(state, 'race', ['r', 'x', 'c']);
  assert.equal(state.progress, 1);
  assert.equal(state.mistakes, 1);
  applyActions(state, 'race', ['BACKSPACE', 'BACKSPACE', 'a', 'c', 'e']);
  assert.equal(state.progress, 4);
  assert.equal(state.typed, 'race');
});

test('accuracy counts attempted characters, including corrected mistakes', () => {
  const state = createTypingState();
  applyActions(state, 'car', ['c', 'x', 'BACKSPACE', 'a', 'r']);
  const data = metrics(state, 12000, 3);
  assert.equal(data.accuracy, 75);
  assert.equal(data.wpm, 3);
  assert.equal(data.percent, 100);
  assert.equal(data.mistakes, 1);
});

test('raw progress claims, malformed actions, and oversized batches are rejected', () => {
  assert.equal(validateBatch({ progress: 100 }), false);
  assert.equal(validateBatch({ seq: 1, actions: ['the entire passage'] }), false);
  assert.equal(validateBatch({ seq: 1, actions: Array(100).fill('a') }), false);
  assert.equal(validateBatch({ seq: 1, actions: ['r', 'BACKSPACE', 'a'] }), true);
});
