import { c420uiExitCodes } from "./exit-codes";

export type c420uiActionKind = "command" | "planned";

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
  cliFlags?: string[];
  artifactWorkflowId?: string;
};

export const c420uiActionKinds = ["command", "planned"] as const;
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
  env?: Record<string, string>;
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
