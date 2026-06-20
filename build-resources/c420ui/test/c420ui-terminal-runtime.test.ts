import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import type { c420uiProjectBridge } from "../src/index.js";
import type { C420UIAppOptions } from "../src/terminal/app-options.js";
import { formatC420UITerminalHelp } from "../src/terminal/help.js";
import { runC420UITerminalApp } from "../src/terminal/runtime.js";

const rootDir = process.env.CANVA_TEST_REPO_ROOT || process.cwd();

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
        displayVersion: "0.1.4-14",
        phase: "0.1.4-14",
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

test("runC420UITerminalApp blocks root before starting c420ui-tui", () => {
  let started = false;
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
        runRustTuiApp() {
          started = true;
          throw new Error("c420ui-tui must not start");
        },
      }),
    /exit/,
  );

  assert.equal(started, false);
  assert.equal(exitCode, 1);
  assert.match(messages[0] ?? "", /Example Project/);
});

test("runC420UITerminalApp starts the Rust TUI for non-root launches", () => {
  let started = false;

  runC420UITerminalApp(createRuntimeOptions(), {
    getuid: () => 1000,
    exit(code) {
      throw new Error(`unexpected exit ${code}`);
    },
    runRustTuiApp(options) {
      started = true;
      assert.equal(options.config.project.projectName, "Example Project");
    },
  });

  assert.equal(started, true);
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

test("runC420UITerminalApp passes error writer and exit to the Rust TUI runner", () => {
  const messages: string[] = [];
  let receivedWriteError: ((message: string) => void) | undefined;
  let receivedExit: ((code: number) => never) | undefined;

  runC420UITerminalApp(createRuntimeOptions(), {
    getuid: () => 1000,
    writeError(message) {
      messages.push(message);
    },
    exit(code) {
      throw new Error("exit");
    },
    runRustTuiApp(options) {
      receivedWriteError = options.writeError;
      receivedExit = options.exit;
    },
  });

  receivedWriteError?.("boom");
  assert.equal(messages[0], "boom");
  assert.throws(() => receivedExit?.(1), /exit/);
});

test("legacy Blessed terminal runtime files are removed", () => {
  for (const relativePath of [
    "build-resources/c420ui/src/terminal/app.ts",
    "build-resources/c420ui/src/terminal/blessed-widgets.ts",
    "build-resources/c420ui/src/terminal/modal.ts",
  ]) {
    assert.equal(fs.existsSync(path.join(rootDir, relativePath)), false, `${relativePath} must not exist`);
  }
});

test("terminal public index exposes Rust runtime types without createApp", () => {
  const source = fs.readFileSync(
    path.join(rootDir, "build-resources/c420ui/src/terminal/index.ts"),
    "utf8",
  );

  assert.match(source, /C420UIAppOptions/);
  assert.match(source, /runC420UITerminalApp/);
  assert.doesNotMatch(source, /createApp|HeaderLayout|\.\/app\.js/);
});

test("terminal build and bootstrap recipe do not externalize Blessed runtime packages", () => {
  const packageJson = fs.readFileSync(path.join(rootDir, "package.json"), "utf8");
  const bootstrapRecipe = fs.readFileSync(
    path.join(rootDir, "build-resources/c420ui/bootstrap/build-recipe.ts"),
    "utf8",
  );

  assert.doesNotMatch(packageJson, /--external:blessed/);
  assert.doesNotMatch(bootstrapRecipe, /"blessed"|"term\.js"|"pty\.js"/);
});
