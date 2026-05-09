import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { SpawnSyncReturns } from "node:child_process";

import { c420uiRootPolicyExitCode, type c420uiAction } from "../packages/c420ui/src";
import { createCanvaLinuxRootProvider } from "../scripts/c420ui-canva-linux/root-provider";

const rootAction: c420uiAction = {
  id: "install-native",
  label: "Install Native",
  group: "install",
  kind: "command",
  requiresRoot: true,
  scope: "system",
  env: { CANVA_NATIVE_SCOPE: "system" },
};

const userAction: c420uiAction = {
  id: "install-native-user",
  label: "Install Native User",
  group: "install",
  kind: "command",
  requiresRoot: false,
  scope: "user",
};

const purgeAction: c420uiAction = {
  id: "purge",
  label: "Purge",
  group: "maintenance",
  kind: "command",
  dangerous: true,
};

test("buildActionEnvironment merges action env over base env", () => {
  const provider = createCanvaLinuxRootProvider();
  const env = provider.buildActionEnvironment(rootAction, {
    CANVA_NATIVE_SCOPE: "user",
    KEEP_ME: "1",
  });

  assert.deepEqual(env, {
    CANVA_NATIVE_SCOPE: "system",
    KEEP_ME: "1",
    C420UI_ACTION_SCOPE: "system",
  });
});

test("validateActionScope fails for requiresRoot true with scope user", () => {
  const provider = createCanvaLinuxRootProvider();
  const result = provider.validateActionScope(
    { ...rootAction, scope: "user" },
    {},
  );

  assert.deepEqual(result, {
    ok: false,
    code: c420uiRootPolicyExitCode,
    message:
      "[error] install-native: requiresRoot=true cannot be combined with user scope.",
  });
});

test("validateActionScope fails for CANVA_NATIVE_SCOPE user", () => {
  const provider = createCanvaLinuxRootProvider();
  const result = provider.validateActionScope(rootAction, {
    CANVA_NATIVE_SCOPE: "user",
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, c420uiRootPolicyExitCode);
});

test("validateActionScope fails for CANVA_FLATPAK_SCOPE user", () => {
  const provider = createCanvaLinuxRootProvider();
  const result = provider.validateActionScope(rootAction, {
    CANVA_FLATPAK_SCOPE: "user",
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, c420uiRootPolicyExitCode);
});

test("resolveRootPolicy returns root for requiresRoot true", () => {
  const provider = createCanvaLinuxRootProvider();
  const result = provider.resolveRootPolicy(rootAction, "/repo", {});

  assert.deepEqual(result, {
    requiresRoot: true,
    reason: "install-native: requiresRoot=true",
  });
});

test("resolveRootPolicy does not request root for user action without system install", () => {
  const provider = createCanvaLinuxRootProvider();
  const result = provider.resolveRootPolicy(userAction, "/repo", {});

  assert.deepEqual(result, { requiresRoot: false });
});

test("resolveRootPolicy returns warning when system detection fails", () => {
  const provider = createCanvaLinuxRootProvider();
  const result = provider.resolveRootPolicy(purgeAction, "/missing-root-dir", {});

  assert.equal(result.requiresRoot, false);
  assert.match(result.warning ?? "", /Unable to detect system installations for root policy/);
});


test("Canva Linux root provider delegates generic Linux root behavior to c420ui", () => {
  const source = fs.readFileSync(
    "scripts/c420ui-canva-linux/root-provider.ts",
    "utf8",
  );

  assert.equal(source.includes("createC420UILinuxRootProviderBase"), true);
  assert.equal(source.includes("validateRootAccess(rootDir"), false);
  assert.equal(source.includes("buildRootActionEnvironment"), false);
});

test("validateRootAccess uses c420ui sudo helper through injected runner", () => {
  const calls: Array<{
    command: string;
    args: string[];
    options: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean };
  }> = [];
  const provider = createCanvaLinuxRootProvider({
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

  const result = provider.validateRootAccess("/repo", env);

  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    command: "bash",
    args: ["packages/c420ui/host/linux/sudo-helper.sh", "--validate"],
    options: {
      cwd: "/repo",
      env,
      shell: false,
      stdio: "inherit",
    },
  });
});
