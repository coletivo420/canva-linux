import assert from "node:assert/strict";
import test from "node:test";

import { projectValidationSteps } from "../canva-linux/validation/project";

test("validate-project preserves source-first step order", () => {
  const labels = projectValidationSteps().map((step) => step.label);
  assert.deepEqual(labels, [
    "npm run build:metadata",
    "npm run lint",
    "npm run typecheck",
    "npm run typecheck:strict",
    "npm test",
    "npm run check:c420ui-node-check",
    "npm run check:c420ui-bootstrap-artifacts",
    "git diff --exit-code",
    "npm run docs:check-ai",
    "check flatpak scope policy",
    "check shell ui api",
    "npm run check:c420ui-core",
    "npm run check:canva-linux",
    "npm run check:shared-tooling",
    "npm run build:runtime",
    "npm run build:check",
  ]);
});
