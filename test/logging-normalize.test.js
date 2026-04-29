'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeLogArg,
  normalizeArgs,
  createLogSignature,
} = require('../electron/main/logging-normalize');

test('normalizes primitive values', () => {
  assert.deepEqual(
    normalizeArgs(['text', 123, true, null, undefined]),
    ['text', '123', 'true', 'null', 'undefined']
  );
});

test('normalizes BigInt without throwing', () => {
  assert.doesNotThrow(() => normalizeLogArg(123n));
  assert.equal(normalizeLogArg(123n), '123');
});

test('normalizes circular objects without throwing', () => {
  const circular = { name: 'root' };
  circular.self = circular;

  assert.doesNotThrow(() => normalizeLogArg(circular));
  assert.match(normalizeLogArg(circular), /\[Circular\]/);
});

test('normalizes Error with message and stack', () => {
  const error = new Error('boom');
  const normalized = normalizeLogArg(error);

  assert.match(normalized, /^Error: boom/);
  assert.equal(normalized.match(/Error: boom/g)?.length, 1);
});

test('normalizes functions without throwing', () => {
  function namedFunction() {}

  assert.equal(
    normalizeLogArg(namedFunction),
    '[Function:namedFunction]'
  );
});

test('normalizes symbols without throwing', () => {
  assert.equal(normalizeLogArg(Symbol('gpu')), 'Symbol(gpu)');
});

test('creates signatures without throwing for mixed unsafe args', () => {
  const circular = {};
  circular.self = circular;

  assert.doesNotThrow(() => {
    createLogSignature([
      'gpu',
      circular,
      10n,
      new Error('boom'),
      function testFn() {},
    ]);
  });
});

test('normalizes nullish args collections without throwing', () => {
  assert.deepEqual(normalizeArgs(null), []);
  assert.deepEqual(normalizeArgs(undefined), []);
});

test('normalizes non-iterable args input safely', () => {
  assert.deepEqual(normalizeArgs(123), ['123']);
});
