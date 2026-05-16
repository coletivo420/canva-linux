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

test("builder routes direct actions through c420ui CLI bridge", () => {
  const source = read("scripts/canva-linux-c420ui-builder.ts");
  assert.match(source, /selectEntrypoint\(rootDir, kind\)/);
  assert.match(source, /bootstrap\/c420ui\/run-c420ui-cli\.cjs/);
  assert.match(source, /\.build\/scripts\/run-c420ui-cli\.js/);
  assert.match(source, /DIRECT_ACTION_FLAGS/);
});

test("compiled Electron runtime remains canva-linux", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.build.linux.executableName, "canva-linux");
  assert.equal(pkg.build.appId, "io.github.coletivo420.canva-linux");
});
