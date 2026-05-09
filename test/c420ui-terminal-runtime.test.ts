import assert from "node:assert/strict";
import test from "node:test";

import type { c420uiProjectBridge } from "../packages/c420ui/src";
import type { C420UIAppOptions } from "../packages/c420ui/src/terminal/app";
import { formatC420UITerminalHelp } from "../packages/c420ui/src/terminal/help";
import { runC420UITerminalApp } from "../packages/c420ui/src/terminal/runtime";

function createRuntimeOptions(): C420UIAppOptions {
  const bridge: c420uiProjectBridge = {
    id: "example-project",
    projectInfo() {
      return { projectName: "Example Project" };
    },
    actions() {
      return [];
    },
    artifactWorkflows() {
      return [];
    },
    async runAction() {
      return { code: 0, status: "success", message: "ok" };
    },
  };

  return {
    config: {
      rootDir: "/repo",
      title: "Example Project Tool",
      brand: { name: "c420ui", version: "0.1", logoLines: [] },
      project: {
        projectName: "Example Project",
        projectSubtitle: "Example subtitle",
        displayVersion: "0.1.4-12",
        phase: "0.1.4-12",
        status: "dev",
        logoLines: [],
        appId: "example.project",
        executableName: "example-project",
        repositoryUrl: "https://example.invalid/project",
        launcherCommand: "./example-project.sh",
        stateDirectoryName: "example-project",
      },
      releaseNotes: "Example release notes",
    },
    bridge,
  };
}

test("runC420UITerminalApp blocks root before createApp", () => {
  let created = false;
  let exitCode: number | undefined;
  const messages: string[] = [];

  assert.throws(
    () =>
      runC420UITerminalApp(createRuntimeOptions(), {
        getuid: () => 0,
        writeError(message) {
          messages.push(message);
        },
        exit(code) {
          exitCode = code;
          throw new Error("exit");
        },
        create() {
          created = true;
          throw new Error("createApp must not run");
        },
        onUncaughtException() {
          throw new Error("uncaught handler must not be registered");
        },
      }),
    /exit/,
  );

  assert.equal(created, false);
  assert.equal(exitCode, 1);
  assert.match(messages[0] ?? "", /Example Project/);
});

test("runC420UITerminalApp creates the terminal UI for non-root launches", () => {
  let created = false;
  let uncaughtHandlerRegistered = false;

  runC420UITerminalApp(createRuntimeOptions(), {
    getuid: () => 1000,
    exit(code) {
      throw new Error(`unexpected exit ${code}`);
    },
    create() {
      created = true;
      return { destroy() {} } as never;
    },
    onUncaughtException() {
      uncaughtHandlerRegistered = true;
      return process;
    },
  });

  assert.equal(created, true);
  assert.equal(uncaughtHandlerRegistered, true);
});

test("formatC420UITerminalHelp includes the project name and launcher command", () => {
  const help = formatC420UITerminalHelp({
    config: createRuntimeOptions().config,
    launcherCommand: "./example-project.sh --ui",
  });

  assert.match(help, /Example Project c420ui terminal interface/);
  assert.match(help, /npm run c420ui/);
  assert.match(help, /\.\/example-project\.sh --ui/);
});

test("runC420UITerminalApp uses injected error writer and exit for uncaught exceptions", () => {
  let uncaughtHandler: ((error: Error) => void) | undefined;
  let destroyed = false;
  const messages: string[] = [];
  let exitCode: number | undefined;

  runC420UITerminalApp(createRuntimeOptions(), {
    getuid: () => 1000,
    writeError(message) {
      messages.push(message);
    },
    exit(code) {
      exitCode = code;
      throw new Error("exit");
    },
    create() {
      return {
        destroy() {
          destroyed = true;
        },
      } as never;
    },
    onUncaughtException(listener) {
      uncaughtHandler = listener;
      return process;
    },
  });

  assert.ok(uncaughtHandler);
  assert.throws(() => uncaughtHandler?.(new Error("boom")), /exit/);
  assert.equal(destroyed, true);
  assert.equal(exitCode, 1);
  assert.match(messages[0] ?? "", /boom/);
});
