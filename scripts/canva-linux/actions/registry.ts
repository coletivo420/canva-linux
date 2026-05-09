import fs from "node:fs";
import path from "node:path";
import {
  validateC420UIActionRegistry,
  type C420UIActionDescriptor,
} from "../../../packages/c420ui/src/actions";
import { findCanvaLinuxProjectRoot } from "../project-root";

const ACTION_GROUPS = ["install", "development", "maintenance"] as const;
const ACTION_SECTIONS = [
  "Install",
  "Package generation",
  "Build",
  "Validation",
  "Maintenance",
  "Uninstall",
] as const;
const ACTION_KINDS = ["command", "planned"] as const;
const INSTALL_SCOPES = ["system", "user"] as const;

export type ActionGroup = (typeof ACTION_GROUPS)[number];
export type ActionSection = (typeof ACTION_SECTIONS)[number];
export type ActionKind = (typeof ACTION_KINDS)[number];
export type InstallScope = (typeof INSTALL_SCOPES)[number];

export type CanvaAction = C420UIActionDescriptor & {
  group: ActionGroup;
  section: ActionSection;
  kind: ActionKind;
  scope?: InstallScope;
};

let cachedRoot: string | null = null;
let cachedActions: CanvaAction[] | null = null;

export function findProjectRoot(startDir?: string): string {
  return findCanvaLinuxProjectRoot(startDir);
}

function actionsPath(rootDir = findProjectRoot()): string {
  return path.join(rootDir, "config/canva-linux/actions.json");
}

function validateCanvaLinuxGroupSection(action: CanvaAction): void {
  if (action.group === "install" && action.section !== "Install") {
    throw new Error(`Group/section mismatch: ${action.id}`);
  }
  if (
    action.group === "development" &&
    !["Package generation", "Build", "Validation"].includes(action.section)
  ) {
    throw new Error(`Group/section mismatch: ${action.id}`);
  }
  if (
    action.group === "maintenance" &&
    !["Maintenance", "Uninstall"].includes(action.section)
  ) {
    throw new Error(`Group/section mismatch: ${action.id}`);
  }
}

export function validateCanvaLinuxActions(
  actions: unknown,
): asserts actions is CanvaAction[] {
  validateC420UIActionRegistry(actions, {
    allowedGroups: ACTION_GROUPS,
    allowedSections: ACTION_SECTIONS,
    allowedKinds: ACTION_KINDS,
    allowedScopes: INSTALL_SCOPES,
  });

  for (const action of actions as CanvaAction[]) {
    validateCanvaLinuxGroupSection(action);
  }
}

export function loadCanvaLinuxActionRegistry(
  rootDir = findProjectRoot(),
): CanvaAction[] {
  const resolvedRoot = path.resolve(rootDir);
  if (cachedActions && cachedRoot === resolvedRoot) return cachedActions;
  const actions = JSON.parse(
    fs.readFileSync(actionsPath(resolvedRoot), "utf8"),
  ) as unknown;
  validateCanvaLinuxActions(actions);
  cachedRoot = resolvedRoot;
  cachedActions = actions;
  return actions;
}

export function loadCanvaLinuxActions(rootDir = findProjectRoot()): CanvaAction[] {
  return loadCanvaLinuxActionRegistry(rootDir);
}
