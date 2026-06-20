import assert from "node:assert/strict";
import test from "node:test";

import {
  createC420UIActionEngine,
  createC420UIRustActionEngine,
  type c420uiAction,
  type c420uiProjectBridge,
} from "../src/index.js";

const commandAction: c420uiAction = {
  id: "doctor",
  label: "Doctor",
  group: "validation",
  kind: "command",
  description: "Run diagnostics",
  cliFlags: ["--doctor"],
  command: "node",
  args: ["doctor.mjs"],
};

function createFakeBridge(): c420uiProjectBridge {
  return {
    id: "fake-project",
    projectInfo() {
      return { projectName: "Fake Project" };
    },
    actions() {
      return [commandAction];
    },
    artifactWorkflows() {
      return [];
    },
    async runAction() {
      throw new Error("legacy TypeScript action execution must not be used by the action engine bridge");
    },
  };
}

test("legacy action-engine export points to the Rust action engine", () => {
  assert.equal(createC420UIActionEngine, createC420UIRustActionEngine);
});

test("Rust action engine bridge still lists and resolves actions", () => {
  const engine = createC420UIActionEngine({
    bridge: createFakeBridge(),
    rootDir: process.cwd(),
  });

  assert.deepEqual(engine.listActions(), [commandAction]);
  assert.deepEqual(engine.resolveActionById("doctor"), {
    found: true,
    action: commandAction,
  });
  assert.deepEqual(engine.resolveActionByCliFlag("--doctor"), {
    found: true,
    action: commandAction,
  });
  assert.deepEqual(engine.resolveActionById("missing"), {
    found: false,
    reason: "not-found",
    query: "missing",
  });
});
