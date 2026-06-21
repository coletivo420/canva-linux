import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createC420UITuiRenderInput } from "../src/rust-tui-contracts.js";
import type { C420UIActionDescriptor, C420UIConfig } from "../src/index.js";

const config: C420UIConfig = {
  rootDir: "/repo",
  title: "Tool",
  brand: {
    name: "c420ui",
    version: "0.1.0",
    hash: "sha256:c420uihash",
    logoLines: [],
  },
  project: {
    projectName: "Example Project",
    projectSubtitle: "Workspace",
    displayVersion: "1.2.3",
    phase: "dev",
    fullVersion: "1.2.3-dev",
    hash: "sha256:projecthash",
    logoLines: [],
    appId: "example.app",
    executableName: "example",
    repositoryUrl: "https://example.invalid/repo",
    launcherCommand: "example",
    stateDirectoryName: "example",
  },
  releaseNotes: "",
};

const actions: C420UIActionDescriptor[] = [
  {
    id: "build",
    label: "Build",
    group: "package",
    section: "Package",
    kind: "command",
  },
  {
    id: "danger",
    label: "Danger",
    group: "maintenance",
    section: "Maintenance",
    kind: "command",
    dangerous: true,
  },
  {
    id: "planned",
    label: "Planned",
    group: "release",
    section: "Release",
    kind: "planned",
  },
];

test("creates render input with brand project and actions", () => {
  const input = createC420UITuiRenderInput({ config, actions });
  assert.deepEqual(input.brand, {
    name: "c420ui",
    version: "0.1.0",
    hash: "sha256:c420uihash",
    logoLines: [],
  });
  assert.equal(input.project.name, "Example Project");
  assert.equal(input.project.version, "1.2.3-dev");
  assert.equal(input.actions.length, 3);
});

test("maps dangerous planned logs and progress", () => {
  const input = createC420UITuiRenderInput({
    config,
    actions,
    logs: [{ source: "stdout", line: "hello", level: "info" }],
    progress: { state: "running", label: "Building", percent: 50 },
  });
  assert.equal(input.actions[1]?.dangerous, true);
  assert.equal(input.actions[2]?.planned, true);
  assert.deepEqual(input.logs, [{ source: "stdout", line: "hello", level: "info" }]);
  assert.deepEqual(input.progress, { state: "running", label: "Building", percent: 50 });
});

test("contract source does not hardcode dependent project identity or blessed", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/rust-tui-contracts.ts"),
    "utf8",
  );
  assert.equal(source.includes("Canva Linux"), false);
  assert.equal(source.includes("io.github.coletivo420.canva-linux"), false);
  assert.equal(source.includes("blessed"), false);
  assert.equal(source.includes("C420UI_" + "TUI_BACKEND"), false);
});

test("contract does not execute c420ui-tui", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/rust-tui-contracts.ts"),
    "utf8",
  );
  assert.equal(source.includes("runC420UIRustHost"), false);
  assert.equal(source.includes("c420ui-tui"), false);
});

test("runner uses the shared Rust TUI render contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/rust-tui-runner.ts"),
    "utf8",
  );

  assert.equal(source.includes("createC420UITuiRenderInput"), true);
});
