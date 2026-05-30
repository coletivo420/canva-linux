import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  calculateCanvaLinuxSourceHash,
  calculateSourceHash,
  combineSourceHashes,
} from "../../scripts/canva-linux/source-hash";
import {
  calculateC420UISourceHash,
  C420UI_SOURCE_HASH_INPUTS,
} from "../c420ui/bootstrap/source-hash";

function write(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function makeFixtureRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "canva-source-hashes-"));
  write(path.join(root, "build-resources/electron/main/runtime.ts"), "export const runtime = 1;\n");
  write(path.join(root, "scripts/canva-linux/actions/a.ts"), "export const action = 1;\n");
  write(path.join(root, "scripts/c420ui-adapter/adapter.ts"), "export const adapter = 1;\n");
  write(path.join(root, "build-resources/canva-linux/config/project-ui.json"), "{}\n");
  write(path.join(root, "build-resources/canva-linux-assets/icons/x.txt"), "icon\n");
  write(path.join(root, "io.github.coletivo420.canva-linux.yml"), "id: io.github.coletivo420.canva-linux\n");
  write(path.join(root, "package.json"), "{}\n");
  write(path.join(root, "package-lock.json"), "{}\n");

  write(path.join(root, "build-resources/c420ui/src/index.ts"), "export const ui = 1;\n");
  write(path.join(root, "build-resources/c420ui/scripts/run-c420ui.ts"), "export const run = 1;\n");
  write(path.join(root, "build-resources/c420ui/checks/check.ts"), "export const check = 1;\n");
  write(path.join(root, "build-resources/c420ui/bootstrap/build-recipe.ts"), "export const recipe = 1;\n");
  write(path.join(root, "build-resources/c420ui/types/index.d.ts"), "export type X = string;\n");
  write(path.join(root, "build-resources/c420ui/package.json"), "{}\n");
  write(path.join(root, "docs/readme.md"), "docs\n");

  return root;
}

function mutate(filePath: string): void {
  fs.appendFileSync(filePath, "// changed\n", "utf8");
}

test("canvaLinuxSourceHash and c420uiSourceHash change only in their domains", () => {
  const root = makeFixtureRoot();
  try {
    const canvaBefore = calculateCanvaLinuxSourceHash(root);
    const c420uiBefore = calculateC420UISourceHash(root);

    mutate(path.join(root, "build-resources/electron/main/runtime.ts"));
    const canvaAfterElectron = calculateCanvaLinuxSourceHash(root);
    const c420uiAfterElectron = calculateC420UISourceHash(root);
    assert.notEqual(canvaAfterElectron, canvaBefore);
    assert.equal(c420uiAfterElectron, c420uiBefore);

    mutate(path.join(root, "scripts/canva-linux/actions/a.ts"));
    const canvaAfterScripts = calculateCanvaLinuxSourceHash(root);
    assert.notEqual(canvaAfterScripts, canvaAfterElectron);

    mutate(path.join(root, "build-resources/c420ui/src/index.ts"));
    const canvaAfterC420UI = calculateCanvaLinuxSourceHash(root);
    const c420uiAfterC420UI = calculateC420UISourceHash(root);
    assert.equal(canvaAfterC420UI, canvaAfterScripts);
    assert.notEqual(c420uiAfterC420UI, c420uiAfterElectron);

    mutate(path.join(root, "build-resources/c420ui/scripts/run-c420ui.ts"));
    const c420uiAfterScripts = calculateC420UISourceHash(root);
    assert.notEqual(c420uiAfterScripts, c420uiAfterC420UI);

    mutate(path.join(root, "docs/readme.md"));
    const canvaAfterDocs = calculateCanvaLinuxSourceHash(root);
    const c420uiAfterDocs = calculateC420UISourceHash(root);
    assert.equal(canvaAfterDocs, canvaAfterC420UI);
    assert.equal(c420uiAfterDocs, c420uiAfterScripts);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("combinedSourceHash changes when either component changes", () => {
  const root = makeFixtureRoot();
  try {
    const canvaA = calculateCanvaLinuxSourceHash(root);
    const c420uiA = calculateC420UISourceHash(root);
    const combinedA = combineSourceHashes(canvaA, c420uiA);

    mutate(path.join(root, "build-resources/electron/main/runtime.ts"));
    const combinedB = combineSourceHashes(calculateCanvaLinuxSourceHash(root), c420uiA);
    assert.notEqual(combinedB, combinedA);

    mutate(path.join(root, "build-resources/c420ui/src/index.ts"));
    const combinedC = combineSourceHashes(calculateCanvaLinuxSourceHash(root), calculateC420UISourceHash(root));
    assert.notEqual(combinedC, combinedB);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Guard against accidental broadening of c420ui input scope.
test("c420ui source hash inputs do not include docs or canva-linux scripts", () => {
  const inputs: readonly string[] = C420UI_SOURCE_HASH_INPUTS;
  assert.equal(inputs.includes("scripts/canva-linux"), false);
  assert.equal(inputs.includes("docs"), false);

  const hash = calculateSourceHash(process.cwd(), ["docs"], ["docs"]);
  assert.match(hash, /^sha256:[0-9a-f]{64}$/);
});
