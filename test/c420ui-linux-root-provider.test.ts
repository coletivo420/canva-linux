import assert from "node:assert/strict";
import test from "node:test";
import type { SpawnSyncReturns } from "node:child_process";

import {
  c420uiRootPolicyExitCode,
  createC420UILinuxRootProviderBase,
  validateC420UILinuxActionScope,
  type c420uiAction,
} from "../packages/c420ui/src";

const rootAction: c420uiAction = {
  id: "install-system",
  label: "Install System",
  group: "install",
  kind: "command",
  requiresRoot: true,
  scope: "system",
  env: { ACTION_ENV: "1" },
};

test("buildActionEnvironment merges base env and action env", () => {
  const provider = createC420UILinuxRootProviderBase({
    sudoHelperPath: "custom-helper.sh",
  });
  const env = provider.buildActionEnvironment(rootAction, {
    ACTION_ENV: "base",
    KEEP_ME: "1",
  });

  assert.deepEqual(env, {
    ACTION_ENV: "1",
    KEEP_ME: "1",
  });
});

test("validateC420UILinuxActionScope blocks requiresRoot true with user scope", () => {
  const result = validateC420UILinuxActionScope(
    { ...rootAction, scope: "user" },
    {},
  );

  assert.deepEqual(result, {
    ok: false,
    code: c420uiRootPolicyExitCode,
    message:
      "[error] install-system: requiresRoot=true cannot be combined with user scope.",
  });
});

test("validateC420UILinuxActionScope allows requiresRoot true with system scope", () => {
  const result = validateC420UILinuxActionScope(rootAction, {});

  assert.deepEqual(result, { ok: true });
});

test("buildRootActionEnvironment injects configured root auth env", () => {
  const provider = createC420UILinuxRootProviderBase({
    sudoHelperPath: "custom-helper.sh",
    rootAuthEnvKey: "PROJECT_ROOT_AUTH",
    rootAuthEnvValue: "yes",
  });

  assert.deepEqual(provider.buildRootActionEnvironment?.(rootAction, { BASE: "1" }), {
    BASE: "1",
    PROJECT_ROOT_AUTH: "yes",
  });
});

test("validateRootAccess calls configured sudo helper with --validate", () => {
  const calls: Array<{
    command: string;
    args: string[];
    options: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean };
  }> = [];
  const provider = createC420UILinuxRootProviderBase({
    sudoHelperPath: "project-helper.sh",
    runCommand(command, args, options) {
      calls.push({
        command,
        args: [...args],
        options: options as {
          cwd?: string;
          env?: NodeJS.ProcessEnv;
          shell?: boolean;
        },
      });
      return { status: 0 } as SpawnSyncReturns<Buffer>;
    },
  });
  const env = { TEST_ENV: "1" } as NodeJS.ProcessEnv;

  assert.deepEqual(provider.validateRootAccess("/repo", env), { ok: true });
  assert.deepEqual(calls, [
    {
      command: "bash",
      args: ["project-helper.sh", "--validate"],
      options: {
        cwd: "/repo",
        env,
        shell: false,
        stdio: "inherit",
      },
    },
  ]);
});

test("validateRootAccess returns an error when sudo helper fails", () => {
  const provider = createC420UILinuxRootProviderBase({
    sudoHelperPath: "project-helper.sh",
    runCommand() {
      return { status: 5 } as SpawnSyncReturns<Buffer>;
    },
  });

  assert.deepEqual(provider.validateRootAccess("/repo", {}), {
    ok: false,
    code: 5,
    message: "[error] Privilege validation failed before action execution.",
  });
});

test("sudo helper path is configurable instead of hardcoded", () => {
  const calls: string[][] = [];
  const provider = createC420UILinuxRootProviderBase({
    sudoHelperPath: "another-helper.sh",
    runCommand(_command, args) {
      calls.push([...args]);
      return { status: 0 } as SpawnSyncReturns<Buffer>;
    },
  });

  provider.validateRootAccess("/repo", {});

  assert.deepEqual(calls, [["another-helper.sh", "--validate"]]);
});
