import assert from "node:assert/strict";
import test from "node:test";

import {
  isC420UIAutoScope,
  isC420UISystemScope,
  isC420UIUserScope,
  normalizeC420UIActionScope,
} from "../packages/c420ui/src";

test("normalizeC420UIActionScope returns undefined for undefined scope", () => {
  assert.equal(normalizeC420UIActionScope(undefined), undefined);
});

test("normalizeC420UIActionScope trims known scopes", () => {
  assert.equal(normalizeC420UIActionScope(" system "), "system");
});

test("scope helpers identify known scopes", () => {
  assert.equal(isC420UISystemScope("system"), true);
  assert.equal(isC420UIUserScope("user"), true);
  assert.equal(isC420UIAutoScope("auto"), true);
});

test("normalizeC420UIActionScope preserves unknown custom scopes", () => {
  assert.equal(normalizeC420UIActionScope(" project-custom "), "project-custom");
});
