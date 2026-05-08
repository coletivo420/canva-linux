import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { c420uiExitCodes } from "../packages/c420ui/src";
import { createCanvaLinuxC420UIAdapter } from "../scripts/c420ui-canva-linux/adapter";

function createTempProject(): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "canva-adapter-env-"));
  fs.mkdirSync(path.join(rootDir, "scripts"), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, "package.json"),
    `${JSON.stringify({ name: "adapter-env-test", version: "0.0.0" }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(rootDir, "scripts", "actions.json"),
    `${JSON.stringify(
      [
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

test("Canva Linux adapter overlays action env for direct bridge action runs", async () => {
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
      scope: "user",
      base: "from-context",
    });
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
