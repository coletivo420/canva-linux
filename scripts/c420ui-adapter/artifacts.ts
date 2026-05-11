import fs from "node:fs";
import path from "node:path";
import type {
  c420uiArtifactWorkflow,
  c420uiProjectCapabilities,
  c420uiRunnableArtifactWorkflow,
  C420UIActionDescriptor,
} from "../../packages/c420ui/src";
import { loadCanvaLinuxC420UIActions } from "./actions";

export type CanvaLinuxArtifactWorkflow = c420uiArtifactWorkflow &
  c420uiRunnableArtifactWorkflow & {
    outputPattern?: string;
  };

type CanvaLinuxArtifactWorkflowConfig = CanvaLinuxArtifactWorkflow;

type CanvaLinuxArtifactsConfig = {
  capabilities: c420uiProjectCapabilities;
  workflows: CanvaLinuxArtifactWorkflowConfig[];
};

const ARTIFACTS_CONFIG_PATH = "config/canva-linux/artifacts.json";
const EXPECTED_CAPABILITY_FIELDS = [
  "supportsArtifacts",
  "supportsInstall",
  "supportsUninstall",
  "supportsPurge",
  "supportsRelease",
  "supportsRootActions",
  "supportsDryRun",
  "supportsPlannedActions",
] as const;

const ARTIFACT_ACTION_ID_FIELDS = [
  "buildActionId",
  "validateActionId",
  "installActionId",
  "uninstallActionId",
  "purgeActionId",
  "releaseActionId",
] as const;

const EXECUTABLE_ARTIFACT_ACTION_ID_FIELDS = [
  "buildActionId",
  "validateActionId",
  "installActionId",
  "uninstallActionId",
  "purgeActionId",
] as const;

const ARTIFACT_WORKFLOW_KINDS = [
  "appimage",
  "flatpak",
  "native",
  "tarball",
  "custom",
  "deb",
  "rpm",
  "aur",
] as const;

const ARTIFACT_WORKFLOW_SCOPES = [
  "portable",
  "system",
  "user",
  "release",
  "none",
] as const;

type ArtifactActionIdField = (typeof ARTIFACT_ACTION_ID_FIELDS)[number];
type ExecutableArtifactActionIdField = (typeof EXECUTABLE_ARTIFACT_ACTION_ID_FIELDS)[number];

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertOptionalBoolean(
  value: Record<string, unknown>,
  field: "planned" | "requiresRoot",
  context: string,
): void {
  if (value[field] !== undefined && typeof value[field] !== "boolean") {
    throw new Error(`${context}: ${field} must be a boolean when present`);
  }
}

function assertOptionalString(
  value: Record<string, unknown>,
  field: "description" | "outputPattern",
  context: string,
): void {
  if (value[field] !== undefined && typeof value[field] !== "string") {
    throw new Error(`${context}: ${field} must be a string when present`);
  }
}

function assertOptionalActionId(
  value: Record<string, unknown>,
  field: ArtifactActionIdField,
  context: string,
): void {
  if (value[field] === undefined) return;
  if (typeof value[field] !== "string" || !value[field].trim()) {
    throw new Error(`${context}: ${field} must be a non-empty string when present`);
  }
}

function assertKnownValue(
  value: string,
  allowedValues: readonly string[],
  field: "kind" | "scope",
  context: string,
): void {
  if (!allowedValues.includes(value)) {
    throw new Error(`${context}: ${field} must be one of ${allowedValues.join(", ")}`);
  }
}

function validateOutputPattern(outputPattern: string | undefined, context: string): void {
  if (outputPattern === undefined) return;
  if (!outputPattern.trim()) {
    throw new Error(`${context}: outputPattern must be non-empty when present`);
  }
  if (outputPattern.includes("x64")) {
    throw new Error(`${context}: outputPattern must not normalize architecture names to x64`);
  }
  if (outputPattern.includes("${arch}")) {
    throw new Error(`${context}: outputPattern must preserve generated architecture globs instead of \${arch}`);
  }
}

function assertRequiredString(
  value: Record<string, unknown>,
  field: "id" | "kind" | "label" | "scope",
  context: string,
): void {
  if (typeof value[field] !== "string" || !value[field].trim()) {
    throw new Error(`${context}: ${field} must be a non-empty string`);
  }
}

function toConfigPath(configPath: string): string {
  return path.join(...configPath.split(/[\\/]+/));
}

function resolveOutputPattern(outputPattern: string, version: string): string {
  return toConfigPath(outputPattern.replaceAll("${version}", version));
}

function loadArtifactsConfig(rootDir: string): CanvaLinuxArtifactsConfig {
  const configPath = path.join(rootDir, ARTIFACTS_CONFIG_PATH);
  const config = readJsonFile<unknown>(configPath);
  validateCanvaLinuxArtifactsConfigShape(config, configPath);
  return config;
}

function validateCanvaLinuxArtifactsConfigShape(
  config: unknown,
  configPath: string,
): asserts config is CanvaLinuxArtifactsConfig {
  if (!isRecord(config)) throw new Error(`${configPath}: artifacts config must be an object`);
  if (!isRecord(config.capabilities)) {
    throw new Error(`${configPath}: capabilities must be an object`);
  }
  for (const field of EXPECTED_CAPABILITY_FIELDS) {
    if (typeof config.capabilities[field] !== "boolean") {
      throw new Error(`${configPath}: capabilities.${field} must be a boolean`);
    }
  }
  if (!Array.isArray(config.workflows)) {
    throw new Error(`${configPath}: workflows must be an array`);
  }

  const workflowIds = new Set<string>();
  for (const [index, workflow] of config.workflows.entries()) {
    const context = `${configPath}: workflows[${index}]`;
    if (!isRecord(workflow)) throw new Error(`${context} must be an object`);
    for (const field of ["id", "kind", "label", "scope"] as const) {
      assertRequiredString(workflow, field, context);
    }
    const workflowId = workflow.id as string;
    const workflowKind = workflow.kind as string;
    const workflowScope = workflow.scope as string;
    if (workflowIds.has(workflowId)) {
      throw new Error(`${context}: duplicate workflow id ${workflowId}`);
    }
    workflowIds.add(workflowId);
    assertKnownValue(workflowKind, ARTIFACT_WORKFLOW_KINDS, "kind", context);
    assertKnownValue(workflowScope, ARTIFACT_WORKFLOW_SCOPES, "scope", context);
    assertOptionalBoolean(workflow, "planned", context);
    assertOptionalBoolean(workflow, "requiresRoot", context);
    assertOptionalString(workflow, "description", context);
    assertOptionalString(workflow, "outputPattern", context);
    validateOutputPattern(workflow.outputPattern as string | undefined, context);
    for (const field of ARTIFACT_ACTION_ID_FIELDS) {
      assertOptionalActionId(workflow, field, context);
    }
  }
}

function isExecutableArtifactActionField(
  field: ArtifactActionIdField,
): field is ExecutableArtifactActionIdField {
  return (EXECUTABLE_ARTIFACT_ACTION_ID_FIELDS as readonly string[]).includes(field);
}

export function validateCanvaLinuxArtifactsAgainstActions(
  workflows: CanvaLinuxArtifactWorkflowConfig[],
  actions: C420UIActionDescriptor[],
): void {
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  for (const workflow of workflows) {
    for (const field of ARTIFACT_ACTION_ID_FIELDS) {
      const actionId = workflow[field];
      if (!actionId) continue;
      const action = actionsById.get(actionId);
      if (!action) {
        throw new Error(`Artifact workflow ${workflow.id} references unknown ${field} ${actionId}`);
      }
      const actionPlanned = action.kind === "planned" || action.planned === true;
      if (workflow.planned === true && actionPlanned !== true) {
        throw new Error(`Artifact workflow ${workflow.id} is planned but ${field} ${actionId} is executable`);
      }
      if (workflow.planned !== true && isExecutableArtifactActionField(field) && actionPlanned) {
        throw new Error(`Artifact workflow ${workflow.id} is executable but ${field} ${actionId} is planned`);
      }
    }
  }
}

export function loadCanvaLinuxCapabilities(
  rootDir = process.env.CANVA_SCRIPT_REPO_ROOT ?? process.cwd(),
): c420uiProjectCapabilities {
  return { ...loadArtifactsConfig(rootDir).capabilities };
}

export function loadCanvaLinuxArtifactWorkflows(
  rootDir: string,
  version: string,
): CanvaLinuxArtifactWorkflow[] {
  const config = loadArtifactsConfig(rootDir);
  validateCanvaLinuxArtifactsAgainstActions(
    config.workflows,
    loadCanvaLinuxC420UIActions(rootDir),
  );

  return config.workflows.map((workflow) => ({
    ...workflow,
    outputPattern: workflow.outputPattern
      ? resolveOutputPattern(workflow.outputPattern, version)
      : undefined,
  }));
}
