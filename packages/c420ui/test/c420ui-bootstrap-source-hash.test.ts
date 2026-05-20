import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS,
  collectC420UIBootstrapSourceHashFiles,
} from "../bootstrap/source-hash";

const sourceHashInputs: readonly string[] = C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS;

test("c420ui bootstrap source hash covers bundled adapter and Canva Linux dependencies", () => {
  for (const requiredInput of [
    "packages/c420ui/bootstrap",
    "scripts/c420ui-adapter",
    "scripts/canva-linux/actions",
    "scripts/canva-linux/artifacts",
    "scripts/canva-linux/capabilities",
    "scripts/canva-linux/development",
    "scripts/canva-linux/project-root.ts",
  ] as const) {
    assert.equal(
      sourceHashInputs.includes(requiredInput),
      true,
      `source hash inputs must include ${requiredInput}`,
    );
  }
});

test("c420ui bootstrap source hash excludes removed c420ui integration modules", () => {
  for (const forbiddenInput of [
    "scripts/canva-linux/detection",
    "scripts/canva-linux/bootstrap",
    "scripts/canva-linux/build-metadata-loader.ts",
  ] as const) {
    assert.equal(
      sourceHashInputs.includes(forbiddenInput),
      false,
      `source hash inputs must not include ${forbiddenInput}`,
    );
  }
});

test("ignores packages/c420ui/bootstrap/generated", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-source-hash-"));
  fs.mkdirSync(path.join(rootDir, "packages", "c420ui", "bootstrap", "generated"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "packages", "c420ui", "bootstrap", "generated", "run-c420ui.cjs"), "module.exports = 1;\n");
  fs.writeFileSync(path.join(rootDir, "packages", "c420ui", "bootstrap", "build-recipe.ts"), "export const marker = 1;\n");

  const files = collectC420UIBootstrapSourceHashFiles(rootDir, ["packages/c420ui/bootstrap"]);
  assert.equal(files.includes("packages/c420ui/bootstrap/generated/run-c420ui.cjs"), false);
  assert.equal(files.includes("packages/c420ui/bootstrap/build-recipe.ts"), true);
});

test("does not ignore unrelated generated directories", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-source-hash-"));
  fs.mkdirSync(path.join(rootDir, "packages", "c420ui", "src", "generated"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "packages", "c420ui", "src", "generated", "example.ts"), "export const keep = true;\n");

  const files = collectC420UIBootstrapSourceHashFiles(rootDir, ["packages/c420ui/src"]);
  assert.equal(files.includes("packages/c420ui/src/generated/example.ts"), true);
});
