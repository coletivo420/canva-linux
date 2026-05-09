import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { c420uiExitCodes } from "../packages/c420ui/src";
import { runCanvaLinuxArtifactWorkflow } from "../scripts/c420ui-adapter/bridge";

const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT ?? path.resolve(__dirname, "..", "..");
const bridgeSourcePath = path.join(rootDir, "scripts/c420ui-adapter/bridge.ts");

function readBridgeSource(): string {
  return fs.readFileSync(bridgeSourcePath, "utf8");
}

test("Canva Linux artifact workflow bridge routes through Action Engine and Root Provider", () => {
  const source = readBridgeSource();

  assert.equal(source.includes("createC420UIActionEngine"), true);
  assert.equal(source.includes("createCanvaLinuxRootProvider"), true);
  assert.equal(source.includes("runC420UIArtifactWorkflow"), true);
  assert.equal(source.includes("engine.runActionById"), true);
  assert.equal(source.includes("return adapter." + "runAction(actionId"), false);
  assert.equal(source.includes("adapter." + "runAction(actionId,"), false);
});

test("Canva Linux artifact workflow dry-run does not execute the concrete adapter action", async () => {
  const result = await runCanvaLinuxArtifactWorkflow(
    "appimage",
    "build",
    { dryRun: true, env: { ...process.env } },
    rootDir,
  );

  assert.equal(result.code, c420uiExitCodes.success);
  assert.equal(result.status, "success");
  assert.equal(result.message, "dry-run");
});

test("Canva Linux planned artifact workflow returns plannedAction", async () => {
  const result = await runCanvaLinuxArtifactWorkflow(
    "deb",
    "build",
    { env: { ...process.env } },
    rootDir,
  );

  assert.equal(result.code, c420uiExitCodes.plannedAction);
  assert.equal(result.status, "planned");
});

test("Canva Linux unsupported artifact workflow phase returns invalidUsage", async () => {
  const result = await runCanvaLinuxArtifactWorkflow(
    "appimage",
    "install",
    { env: { ...process.env } },
    rootDir,
  );

  assert.equal(result.code, c420uiExitCodes.invalidUsage);
  assert.equal(result.status, "failed");
  assert.equal(result.message, "appimage does not support install");
});

test("Canva Linux dangerous artifact phase is blocked without confirmation", async () => {
  const result = await runCanvaLinuxArtifactWorkflow(
    "flatpak",
    "uninstall",
    { env: { ...process.env } },
    rootDir,
  );

  assert.equal(result.code, c420uiExitCodes.generalError);
  assert.equal(result.status, "failed");
  assert.equal(result.message?.includes("Action requires confirmation"), true);
});
