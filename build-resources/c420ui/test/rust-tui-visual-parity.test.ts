import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createC420UITuiRenderInput } from "../src/rust-tui-contracts.js";
import type { C420UIActionDescriptor, C420UIConfig } from "../src/index.js";

const config: C420UIConfig = {
  rootDir: "/repo",
  title: "Tool",
  brand: { name: "c420ui", version: "0.1.0", hash: "sha256:hash", logoLines: [] },
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

test("contrato envia panels obrigatorios, footer antigo, theme resolvido, view e focusZone", () => {
  const input = createC420UITuiRenderInput({ config, actions: [] }) as any;
  
  // view/focusZone
  assert.equal(input.view, "main");
  assert.equal(input.focusZone, "menu");

  // mandatory panels
  assert.ok(input.panels);
  assert.ok(input.panels.detectedInstallations);
  assert.ok(input.panels.generatedArtifacts);
  assert.ok(input.panels.linuxArtifacts);
  assert.ok(input.panels.content);
  assert.ok(input.panels.logs);

  // footer antigo
  assert.ok(input.footer);
  assert.equal(input.footer.textSelectionMode, false);
  assert.ok(input.footer.items.includes("Tab Focus"));

  // theme resolvido
  assert.ok(input.theme);
  assert.equal(input.theme.supportsTrueColor, true);
  assert.ok(input.theme.colors);
  assert.equal(input.theme.colors.lightBlue, "#00C4CC");
  assert.deepEqual(input.brand.logoLines, []);
  assert.deepEqual(input.project.logoLines, []);
  assert.equal(input.project.appId, "example.app");
});

test("contrato envia descricao e overview legado com logo do projeto", () => {
  const input = createC420UITuiRenderInput({
    config: {
      ...config,
      project: {
        ...config.project,
        logoLines: ["Example", "Logo"],
      },
    },
    actions: [
      {
        id: "build",
        label: "Build",
        group: "development",
        kind: "command",
        description: "Build the project.",
        warning: "Needs dependencies.",
      },
    ],
    view: "development",
  }) as any;

  assert.equal(input.actions[0].description, "Build the project.");
  assert.equal(input.menu.items[0].description, "Build the project.");
  assert.equal(input.menu.items[0].warning, "Needs dependencies.");
  assert.ok(input.panels.content.lines.includes("Example"));
  assert.ok(input.panels.content.lines.includes("Logo"));
  assert.ok(input.panels.content.lines.includes("Package / Version Information:"));
});

test("help menu is informational and never maps help items to executable actions", () => {
  const input = createC420UITuiRenderInput({
    config,
    actions: [
      {
        id: "dev-action",
        label: "Dev action",
        group: "development",
        kind: "command",
        description: "Should not appear as executable help.",
      },
    ],
    view: "help",
  }) as any;

  assert.equal(input.menu.label, "Help");
  assert.equal(input.panels.content.label, "Help");
  assert.ok(input.panels.content.lines.includes("Navigation"));
  assert.ok(input.panels.content.lines.includes("Clipboard order"));
  assert.equal(input.menu.items.some((item: any) => item.actionId), false);
  assert.deepEqual(input.menu.items.at(-1), {
    id: "back-main",
    label: "Back to Main",
    view: "main",
  });
});

test("nao existe C420UI_TUI_BACKEND", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/rust-tui-contracts.ts"),
    "utf8",
  );
  assert.equal(source.includes("C420UI_TUI_BACKEND"), false);
});
