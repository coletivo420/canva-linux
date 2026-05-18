import assert from "node:assert/strict";
import test from "node:test";

import { C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS } from "../checks/bootstrap-check-helpers";

const sourceHashInputs: readonly string[] = C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS;

test("c420ui bootstrap source hash covers bundled adapter and Canva Linux dependencies", () => {
  for (const requiredInput of [
    "scripts/c420ui-adapter",
    "scripts/canva-linux/actions",
    "scripts/canva-linux/artifacts",
    "scripts/canva-linux/capabilities",
    "scripts/canva-linux/development",
    "scripts/canva-linux/project-root.ts",
  ] as const) {
    assert.equal(
      sourceHashInputs.includes(requiredInput),
      true,
      `source hash inputs must include ${requiredInput}`,
    );
  }
});

test("c420ui bootstrap source hash excludes removed c420ui integration modules", () => {
  for (const forbiddenInput of [
    "scripts/canva-linux/detection",
    "scripts/canva-linux/bootstrap",
    "scripts/canva-linux/build-metadata-loader.ts",
  ] as const) {
    assert.equal(
      sourceHashInputs.includes(forbiddenInput),
      false,
      `source hash inputs must not include ${forbiddenInput}`,
    );
  }
});
