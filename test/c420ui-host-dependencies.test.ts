import assert from "node:assert/strict";
import test from "node:test";
import {
  createC420UIHostDependencyResult,
  isC420UIHostDependencyFailure,
  type c420uiHostDependencyProvider,
} from "../packages/c420ui/src/host-dependencies";

test("isC420UIHostDependencyFailure returns true for missing and failed", () => {
  assert.equal(isC420UIHostDependencyFailure({ status: "missing" }), true);
  assert.equal(isC420UIHostDependencyFailure({ status: "failed" }), true);
});

test("isC420UIHostDependencyFailure returns false for available and skipped", () => {
  assert.equal(isC420UIHostDependencyFailure({ status: "available" }), false);
  assert.equal(isC420UIHostDependencyFailure({ status: "skipped" }), false);
});

test("createC420UIHostDependencyResult preserves exitCode and message", () => {
  const result = createC420UIHostDependencyResult("failed", {
    exitCode: 42,
    message: "dependency setup failed",
  });

  assert.deepEqual(result, {
    status: "failed",
    exitCode: 42,
    message: "dependency setup failed",
  });
});

test("host dependency provider can omit ensure", () => {
  const provider: c420uiHostDependencyProvider = {
    id: "test-provider",
    check: () => ({ status: "available" }),
  };

  assert.equal(provider.ensure, undefined);
  assert.deepEqual(provider.check(), { status: "available" });
});
