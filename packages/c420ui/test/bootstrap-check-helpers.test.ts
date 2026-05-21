import assert from "node:assert/strict";
import test from "node:test";

import {
  C420UI_BOOTSTRAP_ARTIFACT_FILES,
  c420uiBootstrapArtifactPath,
  C420UI_BOOTSTRAP_MANIFEST_PATH,
} from "../checks/bootstrap-check-helpers";

test("bootstrap helper exports the exact artifact file list", () => {
  assert.deepEqual(C420UI_BOOTSTRAP_ARTIFACT_FILES, [
    "run-c420ui.cjs",
    "run-c420ui-cli.cjs",
    "c420ui-builder.cjs",
  ]);
});

test("bootstrap helper resolves the run entrypoint path", () => {
  assert.equal(
    c420uiBootstrapArtifactPath("run-c420ui.cjs"),
    "packages/c420ui/bootstrap/generated/run-c420ui.cjs",
  );
});

test("bootstrap helper resolves the manifest path constant", () => {
  assert.equal(
    C420UI_BOOTSTRAP_MANIFEST_PATH,
    "packages/c420ui/bootstrap/generated/manifest.json",
  );
});
