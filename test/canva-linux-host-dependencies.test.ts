import assert from "node:assert/strict";
import type { spawnSync } from "node:child_process";
import test from "node:test";
import { createCanvaLinuxHostDependencyProvider } from "../scripts/c420ui-canva-linux/host-dependencies";

type SpawnCall = {
  command: string;
  args?: readonly string[];
  options?: Parameters<typeof spawnSync>[2];
};

function createRunCommand(
  result: ReturnType<typeof spawnSync>,
  calls: SpawnCall[],
): typeof spawnSync {
  return ((command, args, options) => {
    calls.push({ command, args, options });
    return result;
  }) as typeof spawnSync;
}

test("Canva Linux provider calls the dependency shell script with rootDir and env", () => {
  const calls: SpawnCall[] = [];
  const env = { ...process.env, CANVA_TEST_ENV: "1" };
  const provider = createCanvaLinuxHostDependencyProvider({
    rootDir: "/repo/root",
    env,
    runCommand: createRunCommand({ status: 0 } as ReturnType<typeof spawnSync>, calls),
  });

  const result = provider.ensure?.();

  assert.deepEqual(result, { status: "available" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.command, "bash");
  assert.deepEqual(calls[0]?.args, ["scripts/ensure-npm-dependencies.sh"]);
  assert.equal(calls[0]?.options?.cwd, "/repo/root");
  assert.equal(calls[0]?.options?.env, env);
  assert.equal(calls[0]?.options?.stdio, "inherit");
  assert.equal(calls[0]?.options?.shell, false);
});

test("Canva Linux provider maps non-zero status to failed with exitCode", () => {
  const calls: SpawnCall[] = [];
  const provider = createCanvaLinuxHostDependencyProvider({
    rootDir: "/repo/root",
    runCommand: createRunCommand({ status: 17 } as ReturnType<typeof spawnSync>, calls),
  });

  assert.deepEqual(provider.ensure?.(), {
    status: "failed",
    exitCode: 17,
    message: "Failed to ensure host dependencies.",
  });
});

test("Canva Linux provider maps spawn errors to failed", () => {
  const calls: SpawnCall[] = [];
  const provider = createCanvaLinuxHostDependencyProvider({
    rootDir: "/repo/root",
    runCommand: createRunCommand(
      { status: null, error: new Error("spawn failed") } as ReturnType<
        typeof spawnSync
      >,
      calls,
    ),
  });

  assert.deepEqual(provider.ensure?.(), {
    status: "failed",
    exitCode: 1,
    message: "spawn failed",
  });
});
