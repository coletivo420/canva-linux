import assert from "node:assert/strict";
import test from "node:test";
import {
  createC420UIHostDependencyResult,
  isC420UIHostDependencyFailure,
  validateC420UIHostDependencyConfig,
  type c420uiHostDependencyProvider,
} from "../src/host-dependencies";

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

test("invalid config fails", () => {
  assert.throws(() => validateC420UIHostDependencyConfig(null), /must be an object/);
});

test("node.minimumMajor as string fails", () => {
  assert.throws(
    () => validateC420UIHostDependencyConfig({ node: { minimumMajor: "22" } }),
    /node\.minimumMajor must be a number/,
  );
});

test("commands as non-array fails", () => {
  assert.throws(
    () => validateC420UIHostDependencyConfig({ commands: "git" }),
    /commands must be an array/,
  );
});

test("npm.requiredDevDependencies as string fails", () => {
  assert.throws(
    () =>
      validateC420UIHostDependencyConfig({
        npm: {
          packageManager: "npm",
          requiredDevDependencies: "typescript",
        },
      }),
    /npm\.requiredDevDependencies must be a string array/,
  );
});

test("valid config passes", () => {
  const config = {
    node: { minimumMajor: 22, required: true },
    commands: [{ id: "git", command: "git", required: true, requiredFor: ["development"] }],
    npm: {
      packageManager: "npm",
      lockfile: "package-lock.json",
      installStrategy: "auto",
      includeDev: true,
      requiredDependencies: ["leftpad"],
      requiredDevDependencies: ["typescript"],
    },
  };

  assert.deepEqual(validateC420UIHostDependencyConfig(config), config);
});
