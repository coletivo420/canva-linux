import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createCanvaLinuxC420UIAdapter } from "../../canva-linux/c420ui-adapter/adapter.js";
import { validateC420UIHostDependencyConfig } from "../src/host-dependencies.js";

const rootDir = process.env.CANVA_TEST_REPO_ROOT || process.cwd();

test("Canva Linux adapter loads host-dependencies.json", () => {
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);
  const dependencies = adapter.loadHostDependencies();

  assert.equal(dependencies.node?.minimumMajor, 22);
  assert.deepEqual(
    dependencies.commands?.map((dependency) => dependency.command),
    ["git", "npm"],
  );
  assert.ok(dependencies.npm?.requiredDevDependencies?.includes("esbuild"));
});

test("toC420UIConfig includes hostDependencies", () => {
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);
  const config = adapter.toC420UIConfig();

  assert.deepEqual(config.hostDependencies, adapter.loadHostDependencies());
});

test("c420ui validates hostDependencies through c420ui schema", () => {
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);

  assert.deepEqual(
    validateC420UIHostDependencyConfig(adapter.loadHostDependencies()),
    adapter.loadHostDependencies(),
  );
});

test("Canva Linux adapter does not resolve dependencies itself", () => {
  const adapterSource = fs.readFileSync(
    path.join(rootDir, "build-resources/canva-linux/c420ui-adapter/adapter.ts"),
    "utf8",
  );

  assert.equal(/fs\.accessSync|lookupC420UICommandInPath|npm\s+ci|npm\s+install|cargo|flatpak|sudo/.test(adapterSource), false);
});

test("missing or invalid host-dependencies.json fails clearly", () => {
  const adapterSource = fs.readFileSync(
    path.join(rootDir, "build-resources/canva-linux/c420ui-adapter/adapter.ts"),
    "utf8",
  );

  assert.match(adapterSource, /host-dependencies\.json/);
  assert.match(adapterSource, /validateC420UIHostDependencyConfig/);
  assert.throws(() => validateC420UIHostDependencyConfig({ node: { minimumMajor: "22" } }), /node\.minimumMajor must be a number/);
});
