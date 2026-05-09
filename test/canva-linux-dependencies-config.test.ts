import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { loadCanvaLinuxDependencyConfig } from "../scripts/c420ui-canva-linux/dependencies";

const rootDir = process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..");

test("Canva Linux dependency config loads declared dev dependencies", () => {
  const config = loadCanvaLinuxDependencyConfig(rootDir);
  assert.equal(config.node?.minimumMajor, 22);
  assert.deepEqual(
    config.commands?.map((dependency) => dependency.command),
    ["git", "npm"],
  );
  assert.ok(config.npm?.requiredDevDependencies?.includes("esbuild"));
  assert.ok(config.npm?.requiredDevDependencies?.includes("electron"));
  assert.ok(config.npm?.requiredDevDependencies?.includes("blessed"));
});

test("c420ui core does not contain Canva Linux concrete npm dependency names", () => {
  const sourceDir = path.join(rootDir, "packages", "c420ui", "src");
  const source = fs
    .readdirSync(sourceDir)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => fs.readFileSync(path.join(sourceDir, file), "utf8"))
    .join("\n");
  assert.equal(/electron-builder|@typescript-eslint\/parser|blessed/.test(source), false);
});
