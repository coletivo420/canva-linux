import { c420uiExitCodes } from "./exit-codes";

export type c420uiActionKind = "command" | "planned" | "internal";

export type c420uiActionGroup =
  | "install"
  | "development"
  | "maintenance"
  | "package"
  | "release"
  | "validation"
  | "settings"
  | "custom";

export type c420uiAction = {
  id: string;
  label: string;
  group: c420uiActionGroup | string;
  section?: string;
  kind: c420uiActionKind;
  description?: string;
  warning?: string;
  dangerous?: boolean;
  requiresConfirmation?: boolean;
  planned?: boolean;
  requiresRoot?: boolean;
  hidden?: boolean;
  longRunning?: boolean;
  confirmationTitle?: string;
  confirmationMessage?: string;
  confirmationPhrase?: string;
  scope?: "user" | "system" | "auto" | string;
  env?: Record<string, string>;
  cliFlags?: string[];
  artifactWorkflowId?: string;
  installDetectionKey?: string;
  cli?: string[];
  command?: string;
  args?: string[];
};

export const c420uiActionKinds = ["command", "planned", "internal"] as const;
export const c420uiActionGroups = [
  "install",
  "development",
  "maintenance",
  "package",
  "release",
  "validation",
  "settings",
  "custom",
] as const;
export const c420uiWorkflowPhases = [
  "development",
  "build",
  "package",
  "install",
  "uninstall",
  "purge",
  "release",
  "validation",
  "logs",
  "maintenance",
] as const;

export type C420UIActionKind = c420uiActionKind;
export type C420UIActionGroup = c420uiActionGroup;
export type C420UIWorkflowPhase = (typeof c420uiWorkflowPhases)[number];
export type C420UIDryRunMode = "disabled" | "supported" | "required";

export type C420UIActionDescriptor = c420uiAction & {
  section: string;
  phase?: C420UIWorkflowPhase;
  dryRun?: C420UIDryRunMode;
  exitCodeOnPlanned?: typeof c420uiExitCodes.plannedAction;
  cli?: string[];
  command?: string;
  args?: string[];
};

export function getC420UIActionCliFlags(action: c420uiAction): string[] {
  const legacyCli = (action as { cli?: string[] }).cli ?? [];
  return [...(action.cliFlags ?? []), ...legacyCli];
}

export function isC420UIPlannedAction(action: c420uiAction): boolean {
  return action.kind === "planned" || action.planned === true;
}

export function requiresC420UIActionConfirmation(action: c420uiAction): boolean {
  return action.dangerous === true || action.requiresConfirmation === true;
}

export function assertC420UIActionContract(action: c420uiAction): void {
  if (!action.id.trim()) throw new Error("c420ui action id is required");
  if (!action.label.trim()) throw new Error(`${action.id}: label is required`);
}


export type c420uiActionValidationOptions = {
  allowedGroups?: readonly string[];
  allowedSections?: readonly string[];
  allowedKinds?: readonly string[];
  allowedScopes?: readonly string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(
  value: unknown,
  message: string,
): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
}

function requireOptionalStringArray(
  value: unknown,
  message: string,
): asserts value is string[] | undefined {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(message);
  }
}

function requireOptionalBoolean(
  action: Record<string, unknown>,
  key: string,
): void {
  if (action[key] !== undefined && typeof action[key] !== "boolean") {
    throw new Error(`Action ${key} must be boolean: ${String(action.id)}`);
  }
}

function requireOptionalString(
  action: Record<string, unknown>,
  key: string,
): void {
  if (action[key] !== undefined && typeof action[key] !== "string") {
    throw new Error(`Action ${key} must be string: ${String(action.id)}`);
  }
}

function validateActionEnv(action: Record<string, unknown>): void {
  if (action.env === undefined) return;
  if (!isRecord(action.env)) {
    throw new Error(`Action env must be an object: ${String(action.id)}`);
  }
  for (const [key, value] of Object.entries(action.env)) {
    if (!key.trim()) {
      throw new Error(`Action env contains an empty key: ${String(action.id)}`);
    }
    if (typeof value !== "string") {
      throw new Error(
        `Action env value must be string: ${String(action.id)} -> ${key}`,
      );
    }
  }
}

function validateAllowedValue(
  value: string,
  allowed: readonly string[] | undefined,
  message: string,
): void {
  if (allowed && !allowed.includes(value)) throw new Error(message);
}

export function validateC420UIActions(
  actions: unknown,
  options: c420uiActionValidationOptions = {},
): asserts actions is c420uiAction[] {
  if (!Array.isArray(actions)) throw new Error("actions registry must contain an array");

  const ids = new Set<string>();
  const cliAliases = new Set<string>();

  for (const item of actions) {
    if (!isRecord(item)) throw new Error("Action entries must be objects");
    requireString(item.id, "Action missing id");
    if (!/^[a-z0-9-]+$/.test(item.id)) {
      throw new Error(`Invalid action id format: ${item.id}`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate action id: ${item.id}`);
    ids.add(item.id);

    requireString(item.label, `Action missing label: ${item.id}`);
    requireString(item.group, `Action missing group: ${item.id}`);
    requireString(item.section, `Action missing section: ${item.id}`);
    requireString(item.kind, `Action missing kind: ${item.id}`);

    validateAllowedValue(
      item.group,
      options.allowedGroups,
      `Invalid action group: ${item.id} -> ${item.group}`,
    );
    validateAllowedValue(
      item.section,
      options.allowedSections,
      `Invalid action section: ${item.id} -> ${item.section}`,
    );
    validateAllowedValue(
      item.kind,
      options.allowedKinds ?? c420uiActionKinds,
      `Unsupported action kind: ${item.id} -> ${item.kind}`,
    );

    requireOptionalStringArray(item.args, `Action args must be an array: ${item.id}`);
    requireOptionalStringArray(
      item.cli,
      `Action cli aliases must be an array: ${item.id}`,
    );
    requireOptionalStringArray(
      item.cliFlags,
      `Action cliFlags aliases must be an array: ${item.id}`,
    );

    if (item.scope !== undefined) {
      requireString(item.scope, `Action scope must be string: ${item.id}`);
      validateAllowedValue(
        item.scope,
        options.allowedScopes,
        `Invalid action scope: ${item.id} -> ${item.scope}`,
      );
    }

    for (const key of [
      "hidden",
      "longRunning",
      "dangerous",
      "planned",
      "requiresConfirmation",
      "requiresRoot",
    ]) {
      requireOptionalBoolean(item, key);
    }

    for (const key of [
      "command",
      "description",
      "confirmationTitle",
      "confirmationMessage",
      "confirmationPhrase",
      "warning",
      "artifactWorkflowId",
    ]) {
      requireOptionalString(item, key);
    }

    validateActionEnv(item);

    if (item.kind === "planned") {
      if (item.command || item.args) {
        throw new Error(`Planned action must not define command/args: ${item.id}`);
      }
    }

    if (item.kind === "command") {
      if (!item.command) throw new Error(`Command action missing command: ${item.id}`);
      if (!Array.isArray(item.args)) {
        throw new Error(`Command action args must be an array: ${item.id}`);
      }
    }

    for (const alias of [...(item.cli ?? []), ...(item.cliFlags ?? [])]) {
      if (!alias.startsWith("--")) {
        throw new Error(`CLI alias must start with --: ${item.id} -> ${alias}`);
      }
      if (cliAliases.has(alias)) throw new Error(`Duplicate cli alias: ${alias}`);
      cliAliases.add(alias);
    }

    if (item.dangerous && item.requiresConfirmation !== true) {
      throw new Error(
        `Dangerous action must set requiresConfirmation=true: ${item.id}`,
      );
    }
    if (item.dangerous && !(item.description || item.confirmationMessage)) {
      throw new Error(
        `Dangerous action missing description/confirmationMessage: ${item.id}`,
      );
    }
  }
}

export function validateC420UIActionRegistry(
  actions: unknown,
  options?: c420uiActionValidationOptions,
): asserts actions is c420uiAction[] {
  validateC420UIActions(actions, options);
}
