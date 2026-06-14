import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  formatC420UIVersionLabel,
  shortSourceHash,
} from "../src/version-info.js";

const repoRoot = process.env.CANVA_TEST_REPO_ROOT || process.cwd();
const adapterSource = fs.readFileSync(
  path.join(repoRoot, "build-resources/canva-linux/c420ui-adapter/adapter.ts"),
  "utf8",
);
const appSource = fs.readFileSync(
  path.join(repoRoot, "build-resources/c420ui/src/terminal/app.ts"),
  "utf8",
);
const builderSource = fs.readFileSync(
  path.join(repoRoot, "build-resources/c420ui/scripts/c420ui-builder.ts"),
  "utf8",
);
const packageJson = JSON.parse(
  fs.readFileSync(
    path.join(repoRoot, "build-resources/c420ui/package.json"),
    "utf8",
  ),
) as { name: string; version: string };

const c420uiPackage = {
  name: "@coletivo420/c420ui",
  version: "0.1.0",
};

const metadata = {
  baseVersion: "0.1.4-15.Dev.11",
  baseDisplayVersion: "0.1.4-15.Dev",
  basePhase: "0.1.4-15.Dev.11",
  buildRevision: "unknown",
  version: "0.1.4-15.Dev.11",
  displayVersion: "0.1.4-15.Dev",
  phase: "0.1.4-15.Dev.11",
  fullVersion: "0.1.4-15.Dev.11",
  canvaLinuxSourceHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  c420uiSourceHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  combinedSourceHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
};

test("reads c420ui package version from build-resources/c420ui/package.json", () => {
  assert.equal(packageJson.name, c420uiPackage.name);
  assert.equal(packageJson.version, c420uiPackage.version);
  assert.match(adapterSource, /c420uiPackageJsonPath[\s\S]*"build-resources\/c420ui\/package\.json"/);
  assert.match(adapterSource, /version:\s*loadC420UIPackageJson\(\)\.version\s*\?\?\s*"unknown"/);
});

test("renders c420uiSourceHash next to c420ui version", () => {
  const label = formatC420UIVersionLabel({
    packageName: "c420ui",
    packageVersion: c420uiPackage.version,
    sourceHash: metadata.c420uiSourceHash,
  });

  assert.equal(label, "c420ui 0.1.0 · sha256:bbbbbbbb");
});

test("shortens sha256 c420uiSourceHash to sha256:xxxxxxxx", () => {
  assert.equal(shortSourceHash(metadata.c420uiSourceHash), "sha256:bbbbbbbb");
});

test("does not use Canva Linux metadata.version as c420ui version", () => {
  assert.notEqual(c420uiPackage.version, metadata.version);
  assert.doesNotMatch(adapterSource, /loadBrandConfig\(\)[\s\S]*version:\s*(?:loadBuildMetadata\(\)\.)?version/);
});

test("does not use canvaLinuxSourceHash for c420ui hash", () => {
  const label = formatC420UIVersionLabel({
    packageName: "c420ui",
    packageVersion: c420uiPackage.version,
    sourceHash: metadata.c420uiSourceHash,
  });

  assert.match(adapterSource, /hash:\s*loadBuildMetadata\(\)\.c420uiSourceHash\s*\|\|\s*"unknown"/);
  assert.doesNotMatch(adapterSource, /loadBrandConfig\(\)[\s\S]*hash:\s*loadBuildMetadata\(\)\.canvaLinuxSourceHash/);
  assert.doesNotMatch(label, /sha256:aaaaaaaa/);
});

test("does not use combinedSourceHash for c420ui hash", () => {
  const label = formatC420UIVersionLabel({
    packageName: "c420ui",
    packageVersion: c420uiPackage.version,
    sourceHash: metadata.c420uiSourceHash,
  });

  assert.doesNotMatch(adapterSource, /loadBrandConfig\(\)[\s\S]*hash:\s*loadBuildMetadata\(\)\.combinedSourceHash/);
  assert.doesNotMatch(label, /sha256:cccccccc/);
});

test("falls back to hash unknown when c420uiSourceHash is missing", () => {
  assert.equal(shortSourceHash(null), "hash unknown");
  assert.equal(
    formatC420UIVersionLabel({
      packageName: "c420ui",
      packageVersion: c420uiPackage.version,
      sourceHash: null,
    }),
    "c420ui 0.1.0 · hash unknown",
  );
});

test("c420ui header renderer uses the c420ui version formatter", () => {
  assert.match(appSource, /formatC420UIVersionLabel\(\{[\s\S]*packageName:\s*opts\.brand\.name[\s\S]*packageVersion:\s*opts\.brand\.version[\s\S]*sourceHash:\s*opts\.brand\.hash/);
});

test("c420ui builder logs and version blocks use c420uiSourceHash", () => {
  assert.match(builderSource, /formatC420UIVersionLabel/);
  assert.match(builderSource, /sourceHash:\s*sourceHash\s*\?\?\s*null/);
  assert.match(builderSource, /metadata\.c420uiSourceHash/);
  assert.doesNotMatch(builderSource, /sourceHash:\s*metadata\.canvaLinuxSourceHash/);
  assert.doesNotMatch(builderSource, /sourceHash:\s*metadata\.combinedSourceHash/);
});

test("c420ui startup log includes formatted builder version hash", () => {
  assert.match(appSource, /\[info\] c420ui started\. builder=\$\{formatC420UIVersionLabel/);
});
