import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { SpawnSyncReturns } from "node:child_process";

import {
  createC420UIActionEngine,
  c420uiExitCodes,
} from "../packages/c420ui/src";
import { createCanvaLinuxC420UIAdapter } from "../scripts/c420ui-adapter/adapter";
import { createCanvaLinuxRootProvider } from "../scripts/c420ui-adapter/root-provider";

function createTempProject(): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "canva-adapter-env-"));
  fs.mkdirSync(path.join(rootDir, "config", "canva-linux"), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, "package.json"),
    `${JSON.stringify({ name: "adapter-env-test", version: "0.0.0" }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(rootDir, "config", "canva-linux", "actions.json"),
    `${JSON.stringify(
      [
        {
          id: "install-native-system",
          label: "Native Install System",
          group: "install",
          section: "Install",
          kind: "command",
          command: process.execPath,
          args: [
            "-e",
            "process.stdout.write(JSON.stringify({ rootAuth: process.env.C420UI_ROOT_AUTH, base: process.env.BASE_ENV }))",
          ],
          requiresRoot: true,
        },
        {
          id: "long-running",
          label: "Long Running",
          group: "development",
          section: "Build",
          kind: "command",
          command: process.execPath,
          args: [
            "-e",
            "process.on('SIGINT',()=>{process.stdout.write('interrupted\\n'); process.exit(0)}); process.stdout.write('ready\\n'); setTimeout(()=>process.exit(0), 30000);",
          ],
        },
        {
          id: "install-native-user",
          label: "Native Install User",
          group: "install",
          section: "Install",
          kind: "command",
          command: process.execPath,
          args: [
            "-e",
            "process.stdout.write(JSON.stringify({ scope: process.env.CANVA_NATIVE_SCOPE, base: process.env.BASE_ENV }))",
          ],
          scope: "user",
          requiresRoot: false,
          env: {
            CANVA_NATIVE_SCOPE: "user",
          },
        },
      ],
      null,
      2,
    )}\n`,
  );
  return rootDir;
}

test("Canva Linux adapter trusts prepared context env for direct bridge action runs", async () => {
  const rootDir = createTempProject();
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);
  const stdout: string[] = [];

  try {
    const result = await adapter.runAction("install-native-user", {
      rootDir,
      dryRun: false,
      yes: true,
      env: { BASE_ENV: "from-context" } as NodeJS.ProcessEnv,
      emitLog(event) {
        if (event.source === "stdout") stdout.push(event.line);
      },
      emitProgress() {},
    });

    assert.equal(result.code, c420uiExitCodes.success);
    assert.equal(result.status, "success");
    assert.deepEqual(JSON.parse(stdout.join("")), {
      base: "from-context",
    });
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("Canva Linux action engine forwards root-auth flag after root preflight", async () => {
  const rootDir = createTempProject();
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);
  const stdout: string[] = [];

  try {
    const engine = createC420UIActionEngine({
      bridge: adapter,
      rootDir,
      env: { BASE_ENV: "from-engine" } as NodeJS.ProcessEnv,
      rootProvider: createCanvaLinuxRootProvider({
        runCommand() {
          return { status: 0 } as SpawnSyncReturns<Buffer>;
        },
      }),
      emit(event) {
        if (event.type === "log" && event.source === "stdout") {
          stdout.push(event.line);
        }
      },
    });

    const result = await engine.runActionById("install-native-system", {
      yes: true,
    });

    assert.equal(result.code, c420uiExitCodes.success);
    assert.deepEqual(JSON.parse(stdout.join("")), {
      rootAuth: "1",
      base: "from-engine",
    });
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("Canva Linux adapter cancels a running action through the execution signal", async () => {
  const rootDir = createTempProject();
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);
  const abortController = new AbortController();
  let abortOnceReady: (() => void) | null = null;
  const ready = new Promise<void>((resolve) => {
    abortOnceReady = resolve;
  });
  const stdout: string[] = [];

  try {
    const runningAction = adapter.runAction("long-running", {
      rootDir,
      dryRun: false,
      yes: true,
      env: {},
      signal: abortController.signal,
      emitLog(event) {
        if (event.source === "stdout") {
          stdout.push(event.line);
          if (event.line === "ready") abortOnceReady?.();
        }
      },
      emitProgress() {},
    });

    await ready;
    abortController.abort();
    const result = await runningAction;

    assert.equal(result.code, c420uiExitCodes.canceled);
    assert.equal(result.status, "canceled");
    assert.ok(stdout.includes("interrupted"));
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
