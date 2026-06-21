import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import assert from "node:assert/strict";

describe("c420ui maintenance boundary", () => {
  const rootDir = process.cwd();
  const cleanPath = path.join(rootDir, "build-resources/c420ui/operations/maintenance/clean-artifacts.ts");
  const fixPath = path.join(rootDir, "build-resources/c420ui/operations/maintenance/fix-build-permissions.ts");

  test("clean-artifacts does not import canva-linux adapter", () => {
    const source = fs.readFileSync(cleanPath, "utf8");
    assert.equal(source.includes("canva-linux"), false);
    assert.equal(source.includes("loadCanvaLinuxMaintenanceConfig"), false);
    assert.equal(source.includes("export async function runC420UICleanArtifacts"), true);
  });

  test("fix-build-permissions does not import canva-linux adapter", () => {
    const source = fs.readFileSync(fixPath, "utf8");
    assert.equal(source.includes("canva-linux"), false);
    assert.equal(source.includes("loadCanvaLinuxMaintenanceConfig"), false);
    assert.equal(source.includes("export async function runC420UIFixBuildPermissions"), true);
  });

  test("legacy host runners are removed", () => {
    assert.equal(fs.existsSync(path.join(rootDir, "build-resources/c420ui/host/command-runner.ts")), false);
    assert.equal(fs.existsSync(path.join(rootDir, "build-resources/c420ui/host/sudo.ts")), false);
  });
});
