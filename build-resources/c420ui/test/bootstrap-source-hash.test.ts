import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  C420UI_SOURCE_HASH_IGNORES,
  C420UI_SOURCE_HASH_INPUTS,
  calculateC420UIBootstrapSourceHash,
  calculateC420UISourceHash,
  collectC420UIBootstrapSourceHashFiles,
  collectC420UISourceHashFiles,
} from "../bootstrap/source-hash";

const sourceHashInputs: readonly string[] = C420UI_SOURCE_HASH_INPUTS;

test("c420ui source hash covers only c420ui-owned sources", () => {
  for (const requiredInput of [
    "build-resources/c420ui/bootstrap",
    "build-resources/c420ui/src",
    "build-resources/c420ui/scripts",
    "build-resources/c420ui/checks",
    "build-resources/c420ui/types",
    "build-resources/c420ui/package.json",
  ] as const) {
    assert.equal(
      sourceHashInputs.includes(requiredInput),
      true,
      `source hash inputs must include ${requiredInput}`,
    );
  }
});

test("c420ui source hash excludes Canva Linux sources", () => {
  for (const forbiddenInput of [
    "scripts/c420ui-adapter",
    "scripts/canva-linux",
    "build-resources/electron",
    "build-resources/canva-linux/config",
    "package.json",
    "package-lock.json",
  ] as const) {
    assert.equal(
      sourceHashInputs.includes(forbiddenInput),
      false,
      `source hash inputs must not include ${forbiddenInput}`,
    );
  }
});

test("c420ui source hash ignores include generated bootstrap outputs", () => {
  assert.equal(
    C420UI_SOURCE_HASH_IGNORES.includes("build-resources/c420ui/bootstrap/generated"),
    true,
  );
});

test("ignores build-resources/c420ui/bootstrap/generated", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-source-hash-"));
  fs.mkdirSync(path.join(rootDir, "build-resources", "c420ui", "bootstrap", "generated"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "build-resources", "c420ui", "bootstrap", "generated", "run-c420ui.cjs"), "module.exports = 1;\n");
  fs.writeFileSync(path.join(rootDir, "build-resources", "c420ui", "bootstrap", "build-recipe.ts"), "export const marker = 1;\n");

  const files = collectC420UISourceHashFiles(rootDir, ["build-resources/c420ui/bootstrap"]);
  assert.equal(files.includes("build-resources/c420ui/bootstrap/generated/run-c420ui.cjs"), false);
  assert.equal(files.includes("build-resources/c420ui/bootstrap/build-recipe.ts"), true);
});

test("does not ignore unrelated generated directories", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-source-hash-"));
  fs.mkdirSync(path.join(rootDir, "build-resources", "c420ui", "src", "generated"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "build-resources", "c420ui", "src", "generated", "example.ts"), "export const keep = true;\n");

  const files = collectC420UISourceHashFiles(rootDir, ["build-resources/c420ui/src"]);
  assert.equal(files.includes("build-resources/c420ui/src/generated/example.ts"), true);
});

test("legacy bootstrap hash aliases map to c420ui source hash behavior", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-source-hash-"));
  fs.mkdirSync(path.join(rootDir, "build-resources", "c420ui", "src"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "build-resources", "c420ui", "src", "index.ts"), "export const v = 1;\n");

  assert.deepEqual(
    collectC420UIBootstrapSourceHashFiles(rootDir, ["build-resources/c420ui/src"]),
    collectC420UISourceHashFiles(rootDir, ["build-resources/c420ui/src"]),
  );
  assert.equal(
    calculateC420UIBootstrapSourceHash(rootDir, ["build-resources/c420ui/src"]),
    calculateC420UISourceHash(rootDir, ["build-resources/c420ui/src"]),
  );
});
