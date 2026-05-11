import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { loadCanvaLinuxActions } from "../scripts/canva-linux/actions/registry";
import {
  loadCanvaLinuxArtifactWorkflows,
  loadCanvaLinuxCapabilities,
} from "../scripts/c420ui-adapter/artifacts";

const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT ?? path.resolve(__dirname, "..");
const artifactsConfigPath = path.join(rootDir, "config/canva-linux/artifacts.json");
const packageJsonPath = path.join(rootDir, "package.json");

function loadWorkflows() {
  const version = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version as string;
  return loadCanvaLinuxArtifactWorkflows(rootDir, version);
}

test("config/canva-linux/artifacts.json loads", () => {
  assert.equal(fs.existsSync(artifactsConfigPath), true);
  const config = JSON.parse(fs.readFileSync(artifactsConfigPath, "utf8"));

  assert.equal(typeof config.capabilities, "object");
  assert.equal(Array.isArray(config.workflows), true);
  assert.equal(config.workflows.length > 0, true);
});

test("artifact capabilities are preserved from config", () => {
  assert.deepEqual(loadCanvaLinuxCapabilities(rootDir), {
    supportsArtifacts: true,
    supportsInstall: true,
    supportsUninstall: true,
    supportsPurge: true,
    supportsRelease: true,
    supportsRootActions: true,
    supportsDryRun: true,
    supportsPlannedActions: true,
  });
});

test("appimage, flatpak, native, release, and planned workflows exist", () => {
  const workflowsById = new Map(loadWorkflows().map((workflow) => [workflow.id, workflow]));

  for (const id of [
    "appimage",
    "flatpak",
    "native-system",
    "native-user",
    "release-tarball",
    "release-checksums",
    "deb",
    "rpm",
    "aur",
  ]) {
    assert.ok(workflowsById.get(id), `missing ${id}`);
  }

  assert.equal(workflowsById.get("deb")?.planned, true);
  assert.equal(workflowsById.get("rpm")?.planned, true);
  assert.equal(workflowsById.get("aur")?.planned, true);
});

test("artifact outputPattern expands package.json version without x64 normalization", () => {
  const version = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version as string;
  assert.equal(version, "0.1.4-12");
  const workflowsById = new Map(loadWorkflows().map((workflow) => [workflow.id, workflow]));

  assert.equal(
    workflowsById.get("appimage")?.outputPattern,
    path.join("dist", `canva-linux-${version}-*.AppImage`),
  );
  assert.equal(
    workflowsById.get("flatpak")?.outputPattern,
    path.join("dist", `canva-linux-${version}-*.flatpak`),
  );
  assert.equal(
    workflowsById.get("release-tarball")?.outputPattern,
    path.join("dist", `canva-linux-${version}-linux-unpacked-*.tar.gz`),
  );
  assert.equal(workflowsById.get("release-checksums")?.outputPattern, path.join("dist", "SHA256SUMS"));

  for (const workflow of workflowsById.values()) {
    assert.equal(workflow.outputPattern?.includes("x64") ?? false, false, workflow.id);
  }
});

test("all artifact action ids exist in actions.json", () => {
  const actionIds = new Set(loadCanvaLinuxActions(rootDir).map((action) => action.id));
  const actionIdFields = [
    "buildActionId",
    "validateActionId",
    "installActionId",
    "uninstallActionId",
    "purgeActionId",
    "releaseActionId",
  ] as const;

  for (const workflow of loadWorkflows()) {
    for (const field of actionIdFields) {
      const actionId = workflow[field];
      if (actionId) assert.equal(actionIds.has(actionId), true, `${workflow.id}.${field}`);
    }
  }
});

test("planned package workflows cannot report executable success", () => {
  const workflowsById = new Map(loadWorkflows().map((workflow) => [workflow.id, workflow]));
  const actionsById = new Map(loadCanvaLinuxActions(rootDir).map((action) => [action.id, action]));

  assert.equal(workflowsById.get("deb")?.buildActionId, undefined);
  assert.equal(workflowsById.get("rpm")?.buildActionId, undefined);

  const aurBuildActionId = workflowsById.get("aur")?.buildActionId;
  assert.equal(aurBuildActionId, "prepare-aur");
  const aurAction = actionsById.get(aurBuildActionId ?? "");
  assert.equal(aurAction?.kind, "planned");
  assert.equal(aurAction?.planned, true);
});
