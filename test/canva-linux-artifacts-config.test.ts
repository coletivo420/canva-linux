import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadCanvaLinuxActions } from "../scripts/canva-linux/actions/registry";
import {
  loadCanvaLinuxArtifactWorkflows,
  loadCanvaLinuxCapabilities,
  validateCanvaLinuxArtifactsAgainstActions,
} from "../scripts/c420ui-adapter/artifacts";

const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT ?? path.resolve(__dirname, "..");
const artifactsConfigPath = path.join(rootDir, "config/canva-linux/artifacts.json");
const packageJsonPath = path.join(rootDir, "package.json");
const expectedCapabilityFields = [
  "supportsArtifacts",
  "supportsInstall",
  "supportsUninstall",
  "supportsPurge",
  "supportsRelease",
  "supportsRootActions",
  "supportsDryRun",
  "supportsPlannedActions",
] as const;
const validKinds = new Set(["appimage", "flatpak", "native", "tarball", "custom", "deb", "rpm", "aur"]);
const validScopes = new Set(["portable", "system", "user", "release", "none"]);
const executableActionIdFields = [
  "buildActionId",
  "validateActionId",
  "installActionId",
  "uninstallActionId",
  "purgeActionId",
] as const;

function loadArtifactsConfig() {
  return JSON.parse(fs.readFileSync(artifactsConfigPath, "utf8")) as {
    capabilities: Record<string, unknown>;
    workflows: Array<Record<string, unknown>>;
  };
}

function loadWorkflows() {
  const version = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version as string;
  return loadCanvaLinuxArtifactWorkflows(rootDir, version);
}

function createTempRootWithArtifactsConfig(configText: string): string {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "canva-linux-artifacts-"));
  const configDir = path.join(tempRoot, "config/canva-linux");
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, "artifacts.json"), configText);
  return tempRoot;
}

function minimalArtifactsConfigText(): string {
  return JSON.stringify({
    capabilities: Object.fromEntries(expectedCapabilityFields.map((field) => [field, true])),
    workflows: [],
  });
}

test("config/canva-linux/artifacts.json loads", () => {
  assert.equal(fs.existsSync(artifactsConfigPath), true);
  const config = loadArtifactsConfig();

  assert.equal(typeof config.capabilities, "object");
  assert.equal(Array.isArray(config.workflows), true);
  assert.equal(config.workflows.length > 0, true);
});

test("artifact capabilities are boolean and preserved from config", () => {
  const config = loadArtifactsConfig();
  for (const field of expectedCapabilityFields) {
    assert.equal(typeof config.capabilities[field], "boolean", field);
  }

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

test("artifact workflow ids are unique and use known kind and scope values", () => {
  const config = loadArtifactsConfig();
  const ids = config.workflows.map((workflow) => workflow.id);
  assert.deepEqual(ids, [...new Set(ids)]);

  for (const workflow of config.workflows) {
    assert.equal(validKinds.has(String(workflow.kind)), true, String(workflow.id));
    assert.equal(validScopes.has(String(workflow.scope)), true, String(workflow.id));
  }
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
    assert.equal(workflow.outputPattern?.includes("${arch}") ?? false, false, workflow.id);
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


test("non-planned executable artifact phases do not reference planned actions", () => {
  const actionsById = new Map(loadCanvaLinuxActions(rootDir).map((action) => [action.id, action]));

  for (const workflow of loadWorkflows()) {
    if (workflow.planned === true) continue;
    for (const field of executableActionIdFields) {
      const actionId = workflow[field];
      if (!actionId) continue;
      const action = actionsById.get(actionId);
      assert.ok(action, `${workflow.id}.${field}`);
      assert.equal(action.kind === "planned" || action.planned === true, false, `${workflow.id}.${field}`);
    }
  }
});

test("planned releaseActionId references are explicitly allowed", () => {
  const workflowsById = new Map(loadWorkflows().map((workflow) => [workflow.id, workflow]));
  const actions = loadCanvaLinuxActions(rootDir).map((action) => ({
    ...action,
    kind: action.kind === "command" ? "command" as const : "planned" as const,
  }));
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  const appImageReleaseActionId = workflowsById.get("appimage")?.releaseActionId;

  assert.equal(appImageReleaseActionId, "release-artifacts");
  assert.equal(actionsById.get(appImageReleaseActionId ?? "")?.planned, true);
  assert.doesNotThrow(() => validateCanvaLinuxArtifactsAgainstActions(loadWorkflows(), actions));

  assert.throws(
    () => validateCanvaLinuxArtifactsAgainstActions(
      [{ ...workflowsById.get("appimage")!, buildActionId: "release-artifacts" }],
      actions,
    ),
    /buildActionId release-artifacts is planned/,
  );
});


test("artifact config loader reports missing and malformed configuration clearly", () => {
  const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "canva-linux-artifacts-missing-"));
  assert.throws(
    () => loadCanvaLinuxCapabilities(missingRoot),
    /Missing Canva Linux configuration file:/,
  );

  const invalidRoot = createTempRootWithArtifactsConfig("{");
  assert.throws(
    () => loadCanvaLinuxCapabilities(invalidRoot),
    /Failed to parse configuration file .*artifacts\.json:/,
  );
});

test("artifact config loader caches validated config per config path", () => {
  const tempRoot = createTempRootWithArtifactsConfig(minimalArtifactsConfigText());
  assert.equal(loadCanvaLinuxCapabilities(tempRoot).supportsArtifacts, true);

  fs.writeFileSync(path.join(tempRoot, "config/canva-linux/artifacts.json"), "{");
  assert.equal(loadCanvaLinuxCapabilities(tempRoot).supportsArtifacts, true);
});
