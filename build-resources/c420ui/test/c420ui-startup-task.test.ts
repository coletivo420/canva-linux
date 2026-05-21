import assert from "node:assert/strict";
import test from "node:test";

import { runC420UIStartupTasks, type c420uiStartupTask } from "../src";

test("startup tasks report successful dependent project dependency preparation", async () => {
  const logs: string[] = [];
  const tasks: c420uiStartupTask[] = [
    {
      id: "deps",
      label: "Checking dependent project dependencies",
      run() {
        return { status: "available", message: "Required npm dependencies are installed." };
      },
    },
  ];

  await runC420UIStartupTasks(tasks, (text) => logs.push(text));

  assert.deepEqual(logs, [
    "[info] Checking dependent project dependencies...\n",
    "[info] Required npm dependencies are installed.\n",
  ]);
});

test("startup tasks keep failures visible without throwing", async () => {
  const logs: string[] = [];
  const tasks: c420uiStartupTask[] = [
    {
      id: "deps",
      label: "Checking dependent project dependencies",
      run() {
        return { status: "failed", message: "npm ci failed", exitCode: 1 };
      },
    },
  ];

  await runC420UIStartupTasks(tasks, (text) => logs.push(text));

  assert.deepEqual(logs, [
    "[info] Checking dependent project dependencies...\n",
    "[error] Failed to prepare dependent project dependencies.\n",
    "[error] npm ci failed\n",
  ]);
});

test("startup tasks log planned dependency repair commands", async () => {
  const logs: string[] = [];
  const tasks: c420uiStartupTask[] = [
    {
      id: "deps",
      label: "Checking dependent project dependencies",
      run() {
        return {
          status: "skipped",
          message: "Dependency repair was skipped.",
          plannedCommand: { command: "npm", args: ["ci", "--include=dev"] },
        };
      },
    },
  ];

  await runC420UIStartupTasks(tasks, (text) => logs.push(text));

  assert.deepEqual(logs, [
    "[info] Checking dependent project dependencies...\n",
    "[info] Planned dependency command: npm ci --include=dev\n",
    "[info] Dependency repair was skipped.\n",
  ]);
});
