// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("canva-linux-c420ui-builder entrypoint exists and selects bootstrap before build fallback", () => {
  const wrapper = read("canva-linux-c420ui-builder");
  assert.match(wrapper, /bootstrap\/c420ui\/canva-linux-c420ui-builder\.cjs/);
  assert.match(wrapper, /\.build\/scripts\/canva-linux-c420ui-builder\.js/);
  assert.ok(
    wrapper.indexOf("bootstrap/c420ui/canva-linux-c420ui-builder.cjs") <
      wrapper.indexOf(".build/scripts/canva-linux-c420ui-builder.js"),
  );
});

test("builder title and help separate c420ui builder from runtime canva-linux", () => {
  const source = read("scripts/canva-linux-c420ui-builder.ts");
  assert.match(source, /Canva Linux Builder powered by c420ui/);
  assert.match(source, /opens the c420ui install and development workspace by default/);
  assert.match(source, /canva-linux --help/);
});

test("builder help does not advertise runtime-only flags", () => {
  const source = read("scripts/canva-linux-c420ui-builder.ts");
  const helpBody = source.slice(source.indexOf("function builderHelp"), source.indexOf("function sessionLogPath"));
  for (const forbidden of [
    "--debug=1",
    "--debug=2",
    "--credential-store",
    "--gpu-backend",
    "--force-x11",
    "--force-wayland",
  ]) {
    assert.doesNotMatch(helpBody, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("builder delegates direct action flags through c420ui CLI bridge", () => {
  const source = read("scripts/canva-linux-c420ui-builder.ts");
  assert.match(source, /selectEntrypoint\(rootDir, kind\)/);
  assert.match(source, /bootstrap\/c420ui\/run-c420ui-cli\.cjs/);
  assert.match(source, /\.build\/scripts\/run-c420ui-cli\.js/);
  assert.doesNotMatch(source, /DIRECT_ACTION_FLAGS/);
  assert.match(source, /hasBridgeAction/);
});

test("builder normalizeArgs delegates registry-backed planned actions", () => {
  const { normalizeArgs } = require(path.join(
    repoRoot,
    ".build/scripts/canva-linux-c420ui-builder.js",
  ));

  for (const action of ["--prepare-aur", "--bundle-deb", "--bundle-rpm"]) {
    assert.deepEqual(normalizeArgs([action, "--dry-run"]), {
      help: false,
      bridgeArgs: [action, "--dry-run"],
      hasBridgeAction: true,
    });
  }

  assert.deepEqual(normalizeArgs(["--bundle-deb", "--force"]).bridgeArgs, [
    "--bundle-deb",
    "--yes",
  ]);
});

test("builder rejects runtime-only namespaces and non-flag arguments", () => {
  const { normalizeArgs } = require(path.join(
    repoRoot,
    ".build/scripts/canva-linux-c420ui-builder.js",
  ));

  for (const arg of [
    "--debug",
    "--debug=1",
    "--debug=3",
    "--credential-store=kwallet6",
    "--gpu-backend=vulkan",
    "--force-x11",
    "--force-wayland",
    "--disable-wayland-color-manager",
  ]) {
    assert.throws(
      () => normalizeArgs([arg]),
      new RegExp(`${arg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} is a Canva Linux runtime option`),
    );
  }

  assert.throws(() => normalizeArgs(["install-native"]), /Unsupported builder argument/);
});

test("builder rejects builder globals without a direct action and has no root dry-run bypass", () => {
  const source = read("scripts/canva-linux-c420ui-builder.ts");
  assert.match(source, /No direct action was provided/);
  assert.match(source, /assertNonRoot\(\)/);
  assert.doesNotMatch(source, /allowRootDryRun/);
  assert.doesNotMatch(source, /parsed\.directAction/);
});

test("compiled Electron runtime remains canva-linux", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.build.linux.executableName, "canva-linux");
  assert.equal(pkg.build.appId, "io.github.coletivo420.canva-linux");
});
