import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  calculateCanvaLinuxSourceHash,
  combineSourceHashes,
} from "../canva-linux/source-hash";
import { calculateC420UISourceHash } from "../c420ui/bootstrap/source-hash";

function write(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function append(filePath: string, marker: string): void {
  fs.appendFileSync(filePath, `\n// ${marker}\n`, "utf8");
}

function createFixtureRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "canva-linux-source-hash-"));

  write(path.join(root, "package.json"), "{}\n");
  write(path.join(root, "package-lock.json"), "{}\n");
  write(path.join(root, "io.github.coletivo420.canva-linux.yml"), "id: io.github.coletivo420.canva-linux\n");

  write(path.join(root, "build-resources", "electron", "main", "index.ts"), "export const electronMain = true;\n");
  write(path.join(root, "build-resources", "canva-linux", "config", "project-ui.json"), "{}\n");
  write(path.join(root, "build-resources", "canva-linux", "config", "build-metadata.json"), "{}\n");
  write(path.join(root, "build-resources", "canva-linux-assets", "icons", "io.github.coletivo420.canva-linux.png"), "PNG\n");

  write(path.join(root, "build-resources", "c420ui", "src", "index.ts"), "export const ui = true;\n");
  write(path.join(root, "build-resources", "c420ui", "scripts", "run-c420ui.ts"), "export const run = true;\n");
  write(path.join(root, "build-resources", "c420ui", "checks", "check-bootstrap.ts"), "export const check = true;\n");
  write(path.join(root, "build-resources", "c420ui", "bootstrap", "source.ts"), "export const bootstrap = true;\n");
  write(path.join(root, "build-resources", "c420ui", "bootstrap", "generated", "run-c420ui.cjs"), "module.exports = true;\n");
  write(path.join(root, "build-resources", "c420ui", "types", "index.d.ts"), "export type T = string;\n");
  write(path.join(root, "build-resources", "c420ui", "package.json"), "{}\n");

  write(path.join(root, "build-resources", "tests", "example.test.ts"), "export const example = true;\n");
  write(path.join(root, "scripts", "canva-linux", "source.ts"), "export const canva = true;\n");
  write(path.join(root, "scripts", "c420ui-adapter", "provider.ts"), "export const provider = true;\n");
  write(path.join(root, "docs", "example.md"), "docs\n");

  return root;
}

function hashes(root: string): { canvaLinuxSourceHash: string; c420uiSourceHash: string; combinedSourceHash: string } {
  const canvaLinuxSourceHash = calculateCanvaLinuxSourceHash(root);
  const c420uiSourceHash = calculateC420UISourceHash(root);
  return {
    canvaLinuxSourceHash,
    c420uiSourceHash,
    combinedSourceHash: combineSourceHashes(canvaLinuxSourceHash, c420uiSourceHash),
  };
}

test("split source hashes isolate canva-linux and c420ui domains", () => {
  const root = createFixtureRoot();
  try {
    const baseline = hashes(root);

    append(path.join(root, "build-resources", "electron", "main", "index.ts"), "electron");
    const afterElectron = hashes(root);
    assert.notEqual(afterElectron.canvaLinuxSourceHash, baseline.canvaLinuxSourceHash);
    assert.equal(afterElectron.c420uiSourceHash, baseline.c420uiSourceHash);

    append(path.join(root, "scripts", "canva-linux", "source.ts"), "scripts-canva-linux");
    const afterCanvaScripts = hashes(root);
    assert.notEqual(afterCanvaScripts.canvaLinuxSourceHash, afterElectron.canvaLinuxSourceHash);
    assert.equal(afterCanvaScripts.c420uiSourceHash, afterElectron.c420uiSourceHash);

    append(path.join(root, "scripts", "c420ui-adapter", "provider.ts"), "scripts-c420ui-adapter");
    const afterAdapter = hashes(root);
    assert.notEqual(afterAdapter.canvaLinuxSourceHash, afterCanvaScripts.canvaLinuxSourceHash);
    assert.equal(afterAdapter.c420uiSourceHash, afterCanvaScripts.c420uiSourceHash);

    append(path.join(root, "build-resources", "canva-linux", "config", "project-ui.json"), "config");
    const afterConfig = hashes(root);
    assert.notEqual(afterConfig.canvaLinuxSourceHash, afterAdapter.canvaLinuxSourceHash);
    assert.equal(afterConfig.c420uiSourceHash, afterAdapter.c420uiSourceHash);

    append(path.join(root, "build-resources", "canva-linux-assets", "icons", "io.github.coletivo420.canva-linux.png"), "assets");
    const afterAssets = hashes(root);
    assert.notEqual(afterAssets.canvaLinuxSourceHash, afterConfig.canvaLinuxSourceHash);
    assert.equal(afterAssets.c420uiSourceHash, afterConfig.c420uiSourceHash);

    append(path.join(root, "build-resources", "c420ui", "src", "index.ts"), "c420ui-src");
    const afterC420UISrc = hashes(root);
    assert.equal(afterC420UISrc.canvaLinuxSourceHash, afterAssets.canvaLinuxSourceHash);
    assert.notEqual(afterC420UISrc.c420uiSourceHash, afterAssets.c420uiSourceHash);

    append(path.join(root, "build-resources", "tests", "example.test.ts"), "tests");
    const afterTests = hashes(root);
    assert.equal(afterTests.canvaLinuxSourceHash, afterC420UISrc.canvaLinuxSourceHash);
    assert.equal(afterTests.c420uiSourceHash, afterC420UISrc.c420uiSourceHash);

    append(path.join(root, "docs", "example.md"), "docs");
    const afterDocs = hashes(root);
    assert.equal(afterDocs.canvaLinuxSourceHash, afterTests.canvaLinuxSourceHash);
    assert.equal(afterDocs.c420uiSourceHash, afterTests.c420uiSourceHash);

    append(path.join(root, "build-resources", "c420ui", "scripts", "run-c420ui.ts"), "c420ui-scripts");
    const afterC420UIScripts = hashes(root);
    assert.notEqual(afterC420UIScripts.c420uiSourceHash, afterDocs.c420uiSourceHash);

    append(path.join(root, "build-resources", "c420ui", "checks", "check-bootstrap.ts"), "c420ui-checks");
    const afterC420UIChecks = hashes(root);
    assert.notEqual(afterC420UIChecks.c420uiSourceHash, afterC420UIScripts.c420uiSourceHash);

    append(path.join(root, "build-resources", "c420ui", "bootstrap", "source.ts"), "c420ui-bootstrap");
    const afterC420UIBootstrap = hashes(root);
    assert.notEqual(afterC420UIBootstrap.c420uiSourceHash, afterC420UIChecks.c420uiSourceHash);

    append(path.join(root, "build-resources", "c420ui", "types", "index.d.ts"), "c420ui-types");
    const afterC420UITypes = hashes(root);
    assert.notEqual(afterC420UITypes.c420uiSourceHash, afterC420UIBootstrap.c420uiSourceHash);

    append(path.join(root, "build-resources", "electron", "main", "index.ts"), "electron-again");
    const afterElectronAgain = hashes(root);
    assert.notEqual(afterElectronAgain.canvaLinuxSourceHash, afterC420UITypes.canvaLinuxSourceHash);
    assert.equal(afterElectronAgain.c420uiSourceHash, afterC420UITypes.c420uiSourceHash);

    append(path.join(root, "scripts", "canva-linux", "source.ts"), "scripts-canva-linux-again");
    const afterCanvaScriptsAgain = hashes(root);
    assert.notEqual(afterCanvaScriptsAgain.canvaLinuxSourceHash, afterElectronAgain.canvaLinuxSourceHash);
    assert.equal(afterCanvaScriptsAgain.c420uiSourceHash, afterElectronAgain.c420uiSourceHash);

    append(path.join(root, "docs", "example.md"), "docs-again");
    const afterDocsAgain = hashes(root);
    assert.equal(afterDocsAgain.c420uiSourceHash, afterCanvaScriptsAgain.c420uiSourceHash);

    append(path.join(root, "build-resources", "tests", "example.test.ts"), "tests-again");
    const afterTestsAgain = hashes(root);
    assert.equal(afterTestsAgain.c420uiSourceHash, afterDocsAgain.c420uiSourceHash);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("combinedSourceHash tracks component hash changes", () => {
  const root = createFixtureRoot();
  try {
    const baseline = hashes(root);

    append(path.join(root, "build-resources", "electron", "main", "index.ts"), "combined-canva");
    const afterCanvaLinuxChange = hashes(root);
    assert.notEqual(afterCanvaLinuxChange.canvaLinuxSourceHash, baseline.canvaLinuxSourceHash);
    assert.notEqual(afterCanvaLinuxChange.combinedSourceHash, baseline.combinedSourceHash);

    append(path.join(root, "build-resources", "c420ui", "src", "index.ts"), "combined-c420ui");
    const afterC420UIChange = hashes(root);
    assert.notEqual(afterC420UIChange.c420uiSourceHash, afterCanvaLinuxChange.c420uiSourceHash);
    assert.notEqual(afterC420UIChange.combinedSourceHash, afterCanvaLinuxChange.combinedSourceHash);

    const stableA = hashes(root);
    const stableB = hashes(root);
    assert.equal(stableB.canvaLinuxSourceHash, stableA.canvaLinuxSourceHash);
    assert.equal(stableB.c420uiSourceHash, stableA.c420uiSourceHash);
    assert.equal(stableB.combinedSourceHash, stableA.combinedSourceHash);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
