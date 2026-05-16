import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("legacy canva-linux.sh compatibility entrypoint is absent", () => {
  assert.equal(fs.existsSync("canva-linux.sh"), false);
});

test("primary builder wrapper prefers c420ui-builder bootstrap bundle before build fallback", () => {
  const wrapper = fs.readFileSync("canva-linux-c420ui-builder", "utf8");
  assert.match(wrapper, /bootstrap\/c420ui\/c420ui-builder\.cjs/);
  assert.match(wrapper, /\.build\/scripts\/c420ui-builder\.js/);
  assert.doesNotMatch(wrapper, /canva-linux-c420ui-builder\.cjs/);
  assert.doesNotMatch(wrapper, /canva-linux-c420ui-builder\.js/);
  assert.ok(
    wrapper.indexOf("bootstrap/c420ui/c420ui-builder.cjs") <
      wrapper.indexOf(".build/scripts/c420ui-builder.js"),
  );
});

test("builder source delegates direct actions through c420ui CLI bridge", () => {
  const source = fs.readFileSync("scripts/c420ui-builder.ts", "utf8");
  assert.doesNotMatch(source, /DIRECT_ACTION_FLAGS/);
  assert.match(source, /hasBridgeAction/);
  assert.match(source, /bootstrap\/c420ui\/run-c420ui-cli\.cjs/);
  assert.match(source, /\.build\/scripts\/run-c420ui-cli\.js/);
  assert.match(source, /No direct action was provided/);
});

test("builder source opens c420ui UI by default", () => {
  const source = fs.readFileSync("scripts/c420ui-builder.ts", "utf8");
  assert.match(source, /bootstrap\/c420ui\/run-c420ui\.cjs/);
  assert.match(source, /\.build\/scripts\/run-c420ui\.js/);
  assert.match(source, /parsed\.hasBridgeAction \? "cli" : "ui"/);
});
