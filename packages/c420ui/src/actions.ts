import { c420uiExitCodes } from "./exit-codes";

export const c420uiActionKinds = ["command", "planned", "internal"] as const;
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

export type C420UIActionKind = (typeof c420uiActionKinds)[number];
export type C420UIWorkflowPhase = (typeof c420uiWorkflowPhases)[number];
export type C420UIDryRunMode = "disabled" | "supported" | "required";

export type C420UIActionDescriptor = {
  id: string;
  label: string;
  group: string;
  section: string;
  phase?: C420UIWorkflowPhase;
  kind: C420UIActionKind;
  description?: string;
  warning?: string;
  dangerous?: boolean;
  planned?: boolean;
  requiresRoot?: boolean;
  dryRun?: C420UIDryRunMode;
  exitCodeOnPlanned?: typeof c420uiExitCodes.plannedAction;
  cli?: string[];
  command?: string;
  args?: string[];
  env?: Record<string, string>;
};

export function isC420UIPlannedAction(action: C420UIActionDescriptor): boolean {
  return action.kind === "planned" || action.planned === true;
}

export function assertC420UIActionContract(
  action: C420UIActionDescriptor,
): void {
  if (!action.id.trim()) throw new Error("c420ui action id is required");
  if (!action.label.trim()) throw new Error(`${action.id}: label is required`);
  if (isC420UIPlannedAction(action) && (action.command || action.args?.length)) {
    throw new Error(`${action.id}: planned actions must not define commands`);
  }
}
