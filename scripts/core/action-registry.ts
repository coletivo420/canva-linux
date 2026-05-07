import fs from "node:fs";
import path from "node:path";
import {
  ACTION_GROUPS,
  ACTION_KINDS,
  ACTION_SECTIONS,
  INSTALL_SCOPES,
  type ActionGroup,
  type CanvaAction,
} from "./action-types";

export type {
  ActionGroup,
  ActionKind,
  CanvaAction,
  InstallScope,
} from "./action-types";

const allowedGroups = new Set<string>(ACTION_GROUPS);
const allowedSections = new Set<string>(ACTION_SECTIONS);
const allowedKinds = new Set<string>(ACTION_KINDS);
const allowedScopes = new Set<string>(INSTALL_SCOPES);

let cachedRoot: string | null = null;
let cachedActions: CanvaAction[] | null = null;

function defaultRootSearchDir(): string {
  return path.resolve(__dirname, "../..");
}

export function findProjectRoot(startDir = defaultRootSearchDir()): string {
  let current = path.resolve(startDir);
  while (true) {
    if (
      fs.existsSync(path.join(current, "package.json")) &&
      fs.existsSync(path.join(current, "scripts/actions.json"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return defaultRootSearchDir();
    current = parent;
  }
}

function actionsPath(rootDir = findProjectRoot()) {
  return path.join(rootDir, "scripts/actions.json");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertString(
  value: unknown,
  message: string,
): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
}

function assertStringArray(
  value: unknown,
  message: string,
): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
    throw new Error(message);
}

function assertOptionalBoolean(action: Record<string, unknown>, key: string) {
  if (action[key] !== undefined && typeof action[key] !== "boolean") {
    throw new Error(`Action ${key} must be boolean: ${String(action.id)}`);
  }
}

function assertOptionalString(action: Record<string, unknown>, key: string) {
  if (action[key] !== undefined && typeof action[key] !== "string") {
    throw new Error(`Action ${key} must be string: ${String(action.id)}`);
  }
}

function validateActionEnv(action: Record<string, unknown>) {
  if (action.env === undefined) return;
  if (!isObject(action.env))
    throw new Error(`Action env must be an object: ${String(action.id)}`);
  for (const [key, value] of Object.entries(action.env)) {
    if (!key.trim())
      throw new Error(`Action env contains an empty key: ${String(action.id)}`);
    if (typeof value !== "string")
      throw new Error(
        `Action env value must be string: ${String(action.id)} -> ${key}`,
      );
  }
}

export function validateActions(
  actions: unknown,
): asserts actions is CanvaAction[] {
  if (!Array.isArray(actions))
    throw new Error("actions.json must contain an array");
  const ids = new Set<string>();
  const cliAliases = new Set<string>();

  for (const item of actions) {
    if (!isObject(item)) throw new Error("Action entries must be objects");
    assertString(item.id, "Action missing id");
    if (!/^[a-z0-9-]+$/.test(item.id))
      throw new Error(`Invalid action id format: ${item.id}`);
    if (ids.has(item.id)) throw new Error(`Duplicate action id: ${item.id}`);
    ids.add(item.id);

    assertString(item.label, `Action missing label: ${item.id}`);
    assertString(item.group, `Action missing group: ${item.id}`);
    assertString(item.section, `Action missing section: ${item.id}`);
    assertString(item.kind, `Action missing kind: ${item.id}`);

    if (!allowedGroups.has(item.group))
      throw new Error(`Invalid action group: ${item.id} -> ${item.group}`);
    if (!allowedSections.has(item.section))
      throw new Error(`Invalid action section: ${item.id} -> ${item.section}`);
    if (!allowedKinds.has(item.kind))
      throw new Error(`Unsupported action kind: ${item.id} -> ${item.kind}`);

    if (item.group === "install" && item.section !== "Install")
      throw new Error(`Group/section mismatch: ${item.id}`);
    if (
      item.group === "development" &&
      !["Package generation", "Build", "Validation"].includes(item.section)
    )
      throw new Error(`Group/section mismatch: ${item.id}`);
    if (
      item.group === "maintenance" &&
      !["Maintenance", "Uninstall"].includes(item.section)
    )
      throw new Error(`Group/section mismatch: ${item.id}`);

    if (item.args !== undefined)
      assertStringArray(item.args, `Action args must be an array: ${item.id}`);
    if (item.cli !== undefined)
      assertStringArray(
        item.cli,
        `Action cli aliases must be an array: ${item.id}`,
      );
    if (
      item.scope !== undefined &&
      (typeof item.scope !== "string" || !allowedScopes.has(item.scope))
    ) {
      throw new Error(`Action scope must be system or user: ${item.id}`);
    }

    for (const key of [
      "hidden",
      "longRunning",
      "dangerous",
      "planned",
      "requiresConfirmation",
      "requiresRoot",
    ]) {
      assertOptionalBoolean(item, key);
    }
    for (const key of [
      "command",
      "description",
      "confirmationTitle",
      "confirmationMessage",
      "confirmationPhrase",
      "warning",
    ]) {
      assertOptionalString(item, key);
    }
    validateActionEnv(item);

    if (item.kind === "planned") {
      if (item.command || item.args)
        throw new Error(
          `Planned action must not define command/args: ${item.id}`,
        );
    }
    if (item.kind === "command") {
      if (!item.command)
        throw new Error(`Command action missing command: ${item.id}`);
      if (!Array.isArray(item.args))
        throw new Error(`Command action args must be an array: ${item.id}`);
    }

    const cli = item.cli as string[] | undefined;
    for (const alias of cli ?? []) {
      if (!alias.startsWith("--"))
        throw new Error(`CLI alias must start with --: ${item.id} -> ${alias}`);
      if (cliAliases.has(alias))
        throw new Error(`Duplicate cli alias: ${alias}`);
      cliAliases.add(alias);
    }

    if (item.dangerous && item.requiresConfirmation !== true)
      throw new Error(
        `Dangerous action must set requiresConfirmation=true: ${item.id}`,
      );
    if (item.dangerous && !(item.description || item.confirmationMessage))
      throw new Error(
        `Dangerous action missing description/confirmationMessage: ${item.id}`,
      );
  }
}

export function loadActions(rootDir = findProjectRoot()): CanvaAction[] {
  const resolvedRoot = path.resolve(rootDir);
  if (cachedActions && cachedRoot === resolvedRoot) return cachedActions;
  const actions = JSON.parse(
    fs.readFileSync(actionsPath(resolvedRoot), "utf8"),
  ) as unknown;
  validateActions(actions);
  cachedRoot = resolvedRoot;
  cachedActions = actions;
  return actions;
}

function shellQuote(part: string) {
  if (part.length === 0) return "''";
  if (/[^A-Za-z0-9_/:=+,.@-]/.test(part))
    return `'${part.replace(/'/g, "'\\''")}'`;
  return part;
}

export function formatActionCommand(
  action: CanvaAction | undefined | null,
): string {
  if (!action || !("command" in action) || !action.command) return "";
  return [action.command, ...(Array.isArray(action.args) ? action.args : [])]
    .map((part) => shellQuote(String(part)))
    .join(" ");
}

export function actionRequiresConfirmation(
  action: CanvaAction | undefined | null,
): boolean {
  return Boolean(action?.dangerous || action?.requiresConfirmation);
}

export function getActionsByGroup(
  group: ActionGroup,
  rootDir = findProjectRoot(),
): CanvaAction[] {
  return loadActions(rootDir).filter(
    (action) => action.group === group && !action.hidden,
  );
}

export function getActionById(
  id: string,
  rootDir = findProjectRoot(),
): CanvaAction | undefined {
  return loadActions(rootDir).find((action) => action.id === id);
}

export function getActionByCliFlag(
  flag: string,
  rootDir = findProjectRoot(),
): CanvaAction | undefined {
  return loadActions(rootDir).find(
    (action) => Array.isArray(action.cli) && action.cli.includes(flag),
  );
}
