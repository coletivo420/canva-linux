import { c420uiKnownActionScopes, type c420uiActionScope } from "./scopes";
import { isC420UIPlannedAction, type C420UIActionDescriptor, type C420UIWorkflowPhase } from "./actions";
import type { C420UIWorkflow } from "./workflows";

export type c420uiDevelopmentTaskKind =
  | "doctor"
  | "validate"
  | "build"
  | "package"
  | "install"
  | "uninstall"
  | "purge"
  | "clean"
  | "release"
  | "custom";

export type c420uiDevelopmentTaskRequiredFor =
  | "development"
  | "build"
  | "package"
  | "release"
  | "validation";

export type c420uiDevelopmentTask = {
  id: string;
  label: string;
  kind: c420uiDevelopmentTaskKind;
  actionId: string;
  description?: string;
  scope?: c420uiActionScope;
  requiresRoot?: boolean;
  supportsDryRun?: boolean;
  planned?: boolean;
  requiredFor?: c420uiDevelopmentTaskRequiredFor[];
};

export type c420uiDevelopmentConfig = {
  tasks: c420uiDevelopmentTask[];
};

export type c420uiDevelopmentProvider = {
  id: string;
  label?: string;
  tasks(): c420uiDevelopmentTask[];
};

export const c420uiDevelopmentTaskKinds = [
  "doctor",
  "validate",
  "build",
  "package",
  "install",
  "uninstall",
  "purge",
  "clean",
  "release",
  "custom",
] as const satisfies readonly c420uiDevelopmentTaskKind[];

export const c420uiDevelopmentTaskRequiredForValues = [
  "development",
  "build",
  "package",
  "release",
  "validation",
] as const satisfies readonly c420uiDevelopmentTaskRequiredFor[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value: unknown, message: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
}

function requireOptionalBoolean(
  task: Record<string, unknown>,
  key: "requiresRoot" | "supportsDryRun" | "planned",
): void {
  if (task[key] !== undefined && typeof task[key] !== "boolean") {
    throw new Error(`Development task ${key} must be boolean: ${String(task.id)}`);
  }
}

function validateOptionalScope(task: Record<string, unknown>): void {
  if (task.scope === undefined) return;
  requireString(task.scope, `Development task scope must be string: ${String(task.id)}`);
  if (!c420uiKnownActionScopes.includes(task.scope as never)) {
    throw new Error(`Invalid development task scope: ${String(task.id)} -> ${task.scope}`);
  }
}

function validateRequiredFor(task: Record<string, unknown>): void {
  if (task.requiredFor === undefined) return;
  if (!Array.isArray(task.requiredFor)) {
    throw new Error(`Development task requiredFor must be an array: ${String(task.id)}`);
  }
  for (const value of task.requiredFor) {
    if (
      typeof value !== "string" ||
      !c420uiDevelopmentTaskRequiredForValues.includes(
        value as c420uiDevelopmentTaskRequiredFor,
      )
    ) {
      throw new Error(`Invalid development task requiredFor: ${String(task.id)} -> ${String(value)}`);
    }
  }
}

function kindToWorkflowPhase(kind: c420uiDevelopmentTaskKind): C420UIWorkflowPhase {
  switch (kind) {
    case "doctor":
    case "clean":
    case "custom":
      return "development";
    case "validate":
      return "validation";
    case "build":
      return "build";
    case "package":
      return "package";
    case "install":
      return "install";
    case "uninstall":
      return "uninstall";
    case "purge":
      return "purge";
    case "release":
      return "release";
  }
}

export function validateC420UIDevelopmentTasks(
  tasks: unknown,
): asserts tasks is c420uiDevelopmentTask[] {
  if (!Array.isArray(tasks)) throw new Error("development tasks must be an array");

  const ids = new Set<string>();
  for (const item of tasks) {
    if (!isRecord(item)) throw new Error("Development task entries must be objects");
    requireString(item.id, "Development task missing id");
    if (ids.has(item.id)) throw new Error(`Duplicate development task id: ${item.id}`);
    ids.add(item.id);

    requireString(item.label, `Development task missing label: ${item.id}`);
    requireString(item.kind, `Development task missing kind: ${item.id}`);
    if (!c420uiDevelopmentTaskKinds.includes(item.kind as c420uiDevelopmentTaskKind)) {
      throw new Error(`Invalid development task kind: ${item.id} -> ${item.kind}`);
    }
    requireString(item.actionId, `Development task missing actionId: ${item.id}`);
    if (item.description !== undefined) {
      requireString(item.description, `Development task description must be string: ${item.id}`);
    }
    validateOptionalScope(item);
    requireOptionalBoolean(item, "requiresRoot");
    requireOptionalBoolean(item, "supportsDryRun");
    requireOptionalBoolean(item, "planned");
    validateRequiredFor(item);
  }
}

export function validateC420UIDevelopmentConfig(
  config: unknown,
): asserts config is c420uiDevelopmentConfig {
  if (!isRecord(config)) throw new Error("development config must be an object");
  validateC420UIDevelopmentTasks(config.tasks);
}

export function assertC420UIDevelopmentConfig(
  config: unknown,
): asserts config is c420uiDevelopmentConfig {
  validateC420UIDevelopmentConfig(config);
}

export function createC420UIDevelopmentWorkflow(
  task: c420uiDevelopmentTask,
): C420UIWorkflow {
  validateC420UIDevelopmentTasks([task]);
  const action: C420UIActionDescriptor = {
    id: task.actionId,
    label: task.label,
    group: "development",
    section: "Development",
    kind: task.planned ? "planned" : "command",
    description: task.description,
    planned: task.planned,
    requiresRoot: task.requiresRoot,
    scope: task.scope,
    phase: kindToWorkflowPhase(task.kind),
    dryRun: task.supportsDryRun ? "supported" : undefined,
  };

  return {
    id: task.id,
    label: task.label,
    phase: kindToWorkflowPhase(task.kind),
    actions: [action],
    requiresRoot: task.requiresRoot,
    supportsDryRun: task.supportsDryRun,
  };
}

export function getC420UIDevelopmentTaskWorkflowPhase(
  task: c420uiDevelopmentTask,
): C420UIWorkflowPhase {
  validateC420UIDevelopmentTasks([task]);
  return kindToWorkflowPhase(task.kind);
}

function supportsDryRunAction(action: C420UIActionDescriptor): boolean {
  if (isC420UIPlannedAction(action)) return false;
  if (action.dryRun === "disabled") return false;
  return action.kind === "command" || action.dryRun === "supported" || action.dryRun === "required";
}

export function assertC420UIDevelopmentTaskMatchesAction(
  task: c420uiDevelopmentTask,
  action: C420UIActionDescriptor,
): void {
  validateC420UIDevelopmentTasks([task]);
  if (task.actionId !== action.id) {
    throw new Error(`Development task ${task.id} actionId does not match action ${action.id}`);
  }

  const plannedAction = isC420UIPlannedAction(action);
  if (task.planned === true && !plannedAction) {
    throw new Error(`Development task ${task.id} is planned but action ${action.id} is executable`);
  }
  if (task.planned !== true && plannedAction) {
    throw new Error(`Development task ${task.id} is executable but action ${action.id} is planned`);
  }

  if (task.requiresRoot !== undefined && Boolean(task.requiresRoot) !== Boolean(action.requiresRoot)) {
    throw new Error(`Development task ${task.id} requiresRoot contradicts action ${action.id}`);
  }
  if (task.scope !== undefined && task.scope !== action.scope) {
    throw new Error(`Development task ${task.id} scope contradicts action ${action.id}`);
  }
  if (task.supportsDryRun === true && !supportsDryRunAction(action)) {
    throw new Error(`Development task ${task.id} promises dry-run but action ${action.id} does not support it`);
  }

  const workflowPhase = kindToWorkflowPhase(task.kind);
  if (action.phase !== undefined && action.phase !== workflowPhase) {
    throw new Error(`Development task ${task.id} phase ${workflowPhase} contradicts action ${action.id} phase ${action.phase}`);
  }
}

export function createC420UIDevelopmentWorkflowFromAction(
  task: c420uiDevelopmentTask,
  action: C420UIActionDescriptor,
): C420UIWorkflow {
  assertC420UIDevelopmentTaskMatchesAction(task, action);
  const phase = kindToWorkflowPhase(task.kind);
  const workflowAction: C420UIActionDescriptor = {
    ...action,
    phase,
  };

  return {
    id: task.id,
    label: task.label || action.label,
    phase,
    actions: [workflowAction],
    requiresRoot: action.requiresRoot,
    supportsDryRun: task.supportsDryRun,
  };
}

export function createC420UIDevelopmentWorkflows(
  tasks: c420uiDevelopmentTask[],
): C420UIWorkflow[] {
  validateC420UIDevelopmentTasks(tasks);
  return tasks.map((task) => createC420UIDevelopmentWorkflow(task));
}
