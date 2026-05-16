// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const { parseCanvaLinuxRuntimeCli, printCanvaLinuxRuntimeHelp } =
  loadRuntimeModule("main/runtime-cli");

function parse(...args) {
  return parseCanvaLinuxRuntimeCli(["/usr/bin/electron", "/app/main", ...args]);
}

test("parses help and version", () => {
  assert.equal(parse("--help").help, true);
  assert.equal(parse("--version").version, true);
  assert.match(printCanvaLinuxRuntimeHelp(), /canva-linux \[options\]/);
});

test("parses supported debug levels", () => {
  assert.equal(parse("--debug=1").debugLevel, 1);
  assert.equal(parse("--debug=2").debugLevel, 2);
});

test("rejects unsupported debug forms", () => {
  for (const arg of [
    "--debug",
    "--debug=0",
    "--debug=3",
    "--debug=gpu",
    "--debug=session",
    "--debug=credentials",
  ]) {
    assert.throws(() => parse(arg), /Unsupported --debug value/);
  }
  assert.throws(() => parse("--debug", "1"), /Unsupported --debug value/);
});

test("parses supported credential stores", () => {
  for (const store of ["auto", "gnome-libsecret", "kwallet6", "kwallet5"]) {
    assert.equal(parse(`--credential-store=${store}`).credentialStore, store);
  }
});

test("rejects unsupported credential stores", () => {
  assert.throws(() => parse("--credential-store"), /Unsupported --credential-store value/);
  for (const store of ["basic_text", "basic", "unknown"]) {
    assert.throws(
      () => parse(`--credential-store=${store}`),
      /Unsupported --credential-store value/,
    );
  }
});

test("parses supported GPU and display flags", () => {
  assert.equal(parse("--gpu-backend=auto").gpuBackend, "auto");
  assert.equal(parse("--gpu-backend=vulkan").gpuBackend, "vulkan");
  assert.equal(parse("--force-x11").forceX11, true);
  assert.equal(parse("--force-wayland").forceWayland, true);
  assert.equal(
    parse("--disable-wayland-color-manager").disableWaylandColorManager,
    true,
  );
});

test("rejects unsupported GPU backend", () => {
  assert.throws(() => parse("--gpu-backend"), /Unsupported --gpu-backend value/);
  assert.throws(
    () => parse("--gpu-backend=metal"),
    /Unsupported --gpu-backend value/,
  );
});

test("rejects conflicting display forcing flags", () => {
  assert.throws(
    () => parse("--force-x11", "--force-wayland"),
    /Use either --force-x11 or --force-wayland, not both\./,
  );
});
