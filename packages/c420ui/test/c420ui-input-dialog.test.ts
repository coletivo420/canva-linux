import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function inputDialogSource(): string {
  const source = read("packages/c420ui/src/terminal/modal.ts");
  const start = source.indexOf("export function inputDialog");
  assert.ok(start >= 0);

  return source.slice(start);
}

test("inputDialog declares close before timeout uses it", () => {
  const source = inputDialogSource();

  assert.match(source, /const close = \(result: InputDialogResult\)/);
  assert.match(source, /timer = setTimeout/);
  assert.ok(
    source.indexOf("const close =") < source.indexOf("timer = setTimeout"),
  );
});

test("inputDialog makes close idempotent", () => {
  const source = inputDialogSource();

  assert.match(source, /let closed = false;/);
  assert.match(source, /if \(closed\) \{\s*return;\s*\}/);
  assert.match(source, /closed = true;/);
});

test("inputDialog handles textbox cancel event", () => {
  const source = inputDialogSource();

  assert.match(source, /input\.on\("cancel"/);
  assert.match(source, /status: "canceled"/);
});

test("inputDialog defers textbox cancel close until blessed finishes key handling", () => {
  const source = inputDialogSource();

  assert.match(source, /input\.on\("cancel"/);
  assert.match(source, /setImmediate\(\(\) => \{/);
  assert.match(source, /close\(\{\s*status: "canceled"/);
});

test("inputDialog does not add redundant textbox escape key handler", () => {
  const source = inputDialogSource();

  assert.doesNotMatch(source, /input\.key\(\["escape"\]/);
});

test("inputDialog keeps overlay escape fallback", () => {
  const source = inputDialogSource();

  assert.match(source, /overlay\.key\(\["escape"\]/);
  assert.match(source, /status: "canceled"/);
});
