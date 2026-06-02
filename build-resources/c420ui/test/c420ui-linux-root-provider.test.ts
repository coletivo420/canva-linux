import assert from "node:assert/strict";
import test from "node:test";
import type { SpawnSyncReturns } from "node:child_process";

import {
  c420uiRootPolicyExitCode,
  createC420UILinuxRootProviderBase,
  validateC420UILinuxActionScope,
  type c420uiAction,
} from "../src/index.js";

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
    sudoCommand: "custom-sudo",
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
    sudoCommand: "custom-sudo",
    rootAuthEnvKey: "PROJECT_ROOT_AUTH",
    rootAuthEnvValue: "yes",
  });

  assert.deepEqual(provider.buildRootActionEnvironment?.(rootAction, { BASE: "1" }), {
    BASE: "1",
    PROJECT_ROOT_AUTH: "yes",
  });
});

test("validateRootAccess calls configured sudo command with --validate", () => {
  const calls: Array<{
    command: string;
    args: string[];
    options: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean };
  }> = [];
  const provider = createC420UILinuxRootProviderBase({
    sudoCommand: "sudo",
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
      command: "sudo",
      args: ["-v"],
      options: {
        cwd: "/repo",
        env,
        shell: false,
        stdio: "inherit",
      },
    },
  ]);
});

test("validateRootAccess returns an error when sudo command fails", () => {
  const provider = createC420UILinuxRootProviderBase({
    sudoCommand: "sudo",
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

test("sudo command path is configurable instead of hardcoded", () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const provider = createC420UILinuxRootProviderBase({
    sudoCommand: "another-sudo",
    runCommand(command, args) {
      calls.push({ command, args: [...args] });
      return { status: 0 } as SpawnSyncReturns<Buffer>;
    },
  });

  provider.validateRootAccess("/repo", {});

  assert.deepEqual(calls, [{ command: "another-sudo", args: ["-v"] }]);
});


test("validateRootAccess supports a custom validation command builder", () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const provider = createC420UILinuxRootProviderBase({
    sudoCommand: "direct-sudo",
    buildRootValidationCommand(sudoCommand) {
      return { command: sudoCommand, args: ["--validate"] };
    },
    runCommand(command, args) {
      calls.push({ command, args: [...args] });
      return { status: 0 } as SpawnSyncReturns<Buffer>;
    },
  });

  provider.validateRootAccess("/repo", {});

  assert.deepEqual(calls, [
    { command: "direct-sudo", args: ["--validate"] },
  ]);
});

test("validateRootAccessWithInput calls configured sudo command with --validate-stdin", () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const provider = createC420UILinuxRootProviderBase({
    sudoCommand: "sudo",
    runCommand(command, args) {
      calls.push({ command, args: [...args] });
      return { status: 0 } as SpawnSyncReturns<Buffer>;
    },
  });

  assert.deepEqual(provider.validateRootAccessWithInput?.("/repo", {}, "secret"), {
    ok: true,
  });
  assert.deepEqual(calls, [
    { command: "sudo", args: ["-S", "-v", "-p", ""] },
  ]);
});

test("validateRootAccessWithInput passes password through stdin", () => {
  const inputs: unknown[] = [];
  const provider = createC420UILinuxRootProviderBase({
    sudoCommand: "sudo",
    runCommand(_command, _args, options) {
      inputs.push(options.input);
      return { status: 0 } as SpawnSyncReturns<Buffer>;
    },
  });

  provider.validateRootAccessWithInput?.("/repo", {}, "secret-password");

  assert.deepEqual(inputs, ["secret-password\n"]);
});

test("validateRootAccessWithInput does not use stdio inherit", () => {
  const stdioValues: unknown[] = [];
  const provider = createC420UILinuxRootProviderBase({
    sudoCommand: "sudo",
    runCommand(_command, _args, options) {
      stdioValues.push(options.stdio);
      return { status: 0 } as SpawnSyncReturns<Buffer>;
    },
  });

  provider.validateRootAccessWithInput?.("/repo", {}, "secret");

  assert.deepEqual(stdioValues, [["pipe", "pipe", "pipe"]]);
});

test("validateRootAccessWithInput returns ok on status 0", () => {
  const provider = createC420UILinuxRootProviderBase({
    sudoCommand: "sudo",
    runCommand() {
      return { status: 0 } as SpawnSyncReturns<Buffer>;
    },
  });

  assert.deepEqual(provider.validateRootAccessWithInput?.("/repo", {}, "secret"), {
    ok: true,
  });
});

test("validateRootAccessWithInput returns failed on non-zero status", () => {
  const provider = createC420UILinuxRootProviderBase({
    sudoCommand: "sudo",
    runCommand() {
      return { status: 5 } as SpawnSyncReturns<Buffer>;
    },
  });

  assert.deepEqual(provider.validateRootAccessWithInput?.("/repo", {}, "secret"), {
    ok: false,
    code: 5,
    message: "[error] Privilege validation failed before action execution.",
  });
});
