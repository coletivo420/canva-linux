import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";

test("legacy canva-linux.sh is an error-only deprecation stub", () => {
  const syntax = spawnSync("bash", ["-n", "canva-linux.sh"], { encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr);

  const result = spawnSync("./canva-linux.sh", ["--help"], { encoding: "utf8" });
  assert.equal(result.status, 64);
  assert.match(result.stderr, /Use \.\/canva-linux-c420ui-builder/);
});

test("primary builder wrapper prefers bootstrap bundle before build fallback", () => {
  const wrapper = fs.readFileSync("canva-linux-c420ui-builder", "utf8");
  assert.match(wrapper, /bootstrap\/c420ui\/canva-linux-c420ui-builder\.cjs/);
  assert.match(wrapper, /\.build\/scripts\/canva-linux-c420ui-builder\.js/);
  assert.ok(
    wrapper.indexOf("bootstrap/c420ui/canva-linux-c420ui-builder.cjs") <
      wrapper.indexOf(".build/scripts/canva-linux-c420ui-builder.js"),
  );
});

test("builder source routes direct actions through c420ui CLI bridge", () => {
  const source = fs.readFileSync("scripts/canva-linux-c420ui-builder.ts", "utf8");
  assert.match(source, /DIRECT_ACTION_FLAGS/);
  assert.match(source, /bootstrap\/c420ui\/run-c420ui-cli\.cjs/);
  assert.match(source, /\.build\/scripts\/run-c420ui-cli\.js/);
  assert.match(source, /Only one direct action can be executed per invocation/);
});

test("builder source opens c420ui UI by default", () => {
  const source = fs.readFileSync("scripts/canva-linux-c420ui-builder.ts", "utf8");
  assert.match(source, /bootstrap\/c420ui\/run-c420ui\.cjs/);
  assert.match(source, /\.build\/scripts\/run-c420ui\.js/);
  assert.match(source, /parsed\.directAction \? "cli" : "ui"/);
});
