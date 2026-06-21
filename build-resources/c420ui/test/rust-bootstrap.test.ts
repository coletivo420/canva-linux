import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("rust-bootstrap wrapper calls c420ui-host bootstrap commands", () => {
  const source = fs.readFileSync(
    path.join("build-resources", "c420ui", "src", "rust-bootstrap.ts"),
    "utf8",
  );
  assert.match(source, /command: "bootstrap"/);
  assert.match(source, /command: "bootstrap-check"/);
  assert.match(source, /command: "bootstrap-manifest"/);
  assert.doesNotMatch(source, /esbuild/);
  assert.doesNotMatch(source, /createC420UIBootstrapBuildOptions/);
});

test("bootstrap checks delegate to Rust", () => {
  const build = fs.readFileSync(
    path.join("build-resources", "c420ui", "scripts", "build-bootstrap.ts"),
    "utf8",
  );
  const check = fs.readFileSync(
    path.join("build-resources", "c420ui", "checks", "check-bootstrap.ts"),
    "utf8",
  );
  const gate = fs.readFileSync(
    path.join("build-resources", "c420ui", "checks", "check-artifact-gate.ts"),
    "utf8",
  );
  assert.match(build, /runC420UIRustBootstrap/);
  assert.match(check, /runC420UIRustBootstrapCheck/);
  assert.match(gate, /runC420UIRustBootstrapCheck/);
});
