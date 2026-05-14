import path from "node:path";

import { isC420UIPlannedAction, type C420UIActionDescriptor } from "./actions";

export type c420uiArtifactKind =
  | "appimage"
  | "flatpak"
  | "tarball"
  | "deb"
  | "rpm"
  | "aur"
  | "native"
  | "custom";

export type c420uiArtifactScope =
  | "user"
  | "system"
  | "portable"
  | "release"
  | "none";

export type c420uiArtifactWorkflow = {
  id: string;
  kind: c420uiArtifactKind;
  label: string;
  description?: string;
  scope?: c420uiArtifactScope;
  buildActionId?: string;
  validateActionId?: string;
  installActionId?: string;
  uninstallActionId?: string;
  purgeActionId?: string;
  releaseActionId?: string;
  planned?: boolean;
  requiresRoot?: boolean;
  outputPattern?: string;
};

export type c420uiArtifactRecipeWorkflow = c420uiArtifactWorkflow & {
  scope: c420uiArtifactScope;
};

export type c420uiArtifactCapabilities = {
  supportsArtifacts: boolean;
  supportsInstall: boolean;
  supportsUninstall: boolean;
  supportsPurge: boolean;
  supportsRelease: boolean;
  supportsRootActions: boolean;
  supportsDryRun: boolean;
  supportsPlannedActions: boolean;
};

export type c420uiArtifactRecipeConfig = {
  capabilities: c420uiArtifactCapabilities;
  workflows: c420uiArtifactRecipeWorkflow[];
};

export type C420UIArtifactKind = c420uiArtifactKind;
export type C420UIArtifactScope = c420uiArtifactScope;
export type C420UIArtifactWorkflow = c420uiArtifactWorkflow;
export type C420UIArtifactRecipeWorkflow = c420uiArtifactRecipeWorkflow;
export type C420UIArtifactCapabilities = c420uiArtifactCapabilities;
export type C420UIArtifactRecipeConfig = c420uiArtifactRecipeConfig;

export type C420UIArtifactRecipe = c420uiArtifactRecipeWorkflow & {
  outputPattern?: string;
};

export type C420UIArtifactWorkflowContext = {
  rootDir: string;
  dryRun?: boolean;
};

const artifactCapabilityFields = [
  "supportsArtifacts",
  "supportsInstall",
  "supportsUninstall",
  "supportsPurge",
  "supportsRelease",
  "supportsRootActions",
  "supportsDryRun",
  "supportsPlannedActions",
] as const;

const artifactWorkflowKinds = [
  "appimage",
  "flatpak",
  "tarball",
  "deb",
  "rpm",
  "aur",
  "native",
  "custom",
] as const satisfies readonly c420uiArtifactKind[];

const artifactWorkflowScopes = [
  "user",
  "system",
  "portable",
  "release",
  "none",
] as const satisfies readonly c420uiArtifactScope[];

const artifactActionIdFields = [
  "buildActionId",
  "validateActionId",
  "installActionId",
  "uninstallActionId",
  "purgeActionId",
  "releaseActionId",
] as const;

const executableArtifactActionIdFields = [
  "buildActionId",
  "validateActionId",
  "installActionId",
  "uninstallActionId",
  "purgeActionId",
] as const;

type ArtifactActionIdField = (typeof artifactActionIdFields)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function isExecutableArtifactActionField(field: ArtifactActionIdField): boolean {
  return (executableArtifactActionIdFields as readonly string[]).includes(field);
}

function isRootManagedArtifactActionField(field: ArtifactActionIdField): boolean {
  return field === "installActionId" || field === "uninstallActionId" || field === "purgeActionId";
}

function toConfigPath(configPath: string): string {
  return path.normalize(configPath.replace(/^[\\/]+/, ""));
}

export function assertC420UIArtifactRecipeConfig(
  config: unknown,
  context = "artifact recipe config",
): asserts config is c420uiArtifactRecipeConfig {
  if (!isRecord(config)) throw new Error(`${context}: artifacts config must be an object`);
  if (!isRecord(config.capabilities)) {
    throw new Error(`${context}: capabilities must be an object`);
  }
  for (const field of artifactCapabilityFields) {
    if (typeof config.capabilities[field] !== "boolean") {
      throw new Error(`${context}: capabilities.${field} must be a boolean`);
    }
  }
  if (!Array.isArray(config.workflows)) {
    throw new Error(`${context}: workflows must be an array`);
  }

  const workflowIds = new Set<string>();
  for (const [index, workflow] of config.workflows.entries()) {
    const workflowContext = `${context}: workflows[${index}]`;
    if (!isRecord(workflow)) throw new Error(`${workflowContext} must be an object`);
    for (const field of ["id", "kind", "label", "scope"] as const) {
      assertRequiredString(workflow, field, workflowContext);
    }

    const workflowId = workflow.id as string;
    if (workflowIds.has(workflowId)) {
      throw new Error(`${workflowContext}: duplicate workflow id ${workflowId}`);
    }
    workflowIds.add(workflowId);

    assertKnownValue(workflow.kind as string, artifactWorkflowKinds, "kind", workflowContext);
    assertKnownValue(workflow.scope as string, artifactWorkflowScopes, "scope", workflowContext);
    assertOptionalBoolean(workflow, "planned", workflowContext);
    assertOptionalBoolean(workflow, "requiresRoot", workflowContext);
    assertOptionalString(workflow, "description", workflowContext);
    assertOptionalString(workflow, "outputPattern", workflowContext);
    validateOutputPattern(workflow.outputPattern as string | undefined, workflowContext);
    for (const field of artifactActionIdFields) {
      assertOptionalActionId(workflow, field, workflowContext);
    }
  }
}

export function validateC420UIArtifactRecipeConfig(
  config: unknown,
  context?: string,
): c420uiArtifactRecipeConfig {
  assertC420UIArtifactRecipeConfig(config, context);
  return config;
}

export function validateC420UIArtifactWorkflowsAgainstActions(
  workflows: c420uiArtifactRecipeWorkflow[],
  actions: C420UIActionDescriptor[],
): void {
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  for (const workflow of workflows) {
    for (const field of artifactActionIdFields) {
      const actionId = workflow[field];
      if (!actionId) continue;
      const action = actionsById.get(actionId);
      if (!action) {
        throw new Error(`Artifact workflow ${workflow.id} references unknown ${field} ${actionId}`);
      }
      const actionPlanned = isC420UIPlannedAction(action);
      if (workflow.planned === true && actionPlanned !== true) {
        throw new Error(`Artifact workflow ${workflow.id} is planned but ${field} ${actionId} is executable`);
      }
      if (workflow.planned !== true && isExecutableArtifactActionField(field) && actionPlanned) {
        throw new Error(`Artifact workflow ${workflow.id} is executable but ${field} ${actionId} is planned`);
      }
      if (workflow.requiresRoot === true && action.scope === "user") {
        throw new Error(`Artifact workflow ${workflow.id} requires root but ${field} ${actionId} is user-scoped`);
      }
      if (workflow.requiresRoot === false && action.requiresRoot === true) {
        throw new Error(`Artifact workflow ${workflow.id} declares requiresRoot=false but ${field} ${actionId} requires root`);
      }
      if (
        workflow.scope === "system" &&
        isRootManagedArtifactActionField(field) &&
        action.scope === "user"
      ) {
        throw new Error(`Artifact workflow ${workflow.id} is system-scoped but ${field} ${actionId} is user-scoped`);
      }
      if (
        workflow.scope === "system" &&
        isRootManagedArtifactActionField(field) &&
        action.scope === "system" &&
        action.requiresRoot === false
      ) {
        throw new Error(`Artifact workflow ${workflow.id} is system-scoped but ${field} ${actionId} declares requiresRoot=false`);
      }
    }
  }
}

export function resolveC420UIArtifactOutputPattern(
  outputPattern: string,
  values: { version: string },
): string {
  validateOutputPattern(outputPattern, "artifact outputPattern");
  return toConfigPath(outputPattern.replaceAll("${version}", values.version));
}
