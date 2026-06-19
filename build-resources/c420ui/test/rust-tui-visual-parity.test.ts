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
});

test("nao existe C420UI_TUI_BACKEND", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/rust-tui-contracts.ts"),
    "utf8",
  );
  assert.equal(source.includes("C420UI_TUI_BACKEND"), false);
});
