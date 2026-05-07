import {
  getActionById as getSharedActionById,
  getActionsByGroup as getSharedActionsByGroup,
  loadActions,
  type ActionGroup,
  type ActionKind,
  type CanvaAction,
} from "../core/action-registry";

export type C420UIActionGroup = ActionGroup;
export type C420UIActionKind = ActionKind;
export type C420UIAction = CanvaAction;

export const c420uiActions: C420UIAction[] = [];

export function loadC420UIActions(rootDir = process.cwd()): C420UIAction[] {
  return loadActions(rootDir);
}

export function getActionsByGroup(
  group: C420UIActionGroup,
  rootDir = process.cwd(),
): C420UIAction[] {
  return getSharedActionsByGroup(group, rootDir);
}

export function getActionById(
  id: string,
  rootDir = process.cwd(),
): C420UIAction | undefined {
  return getSharedActionById(id, rootDir);
}
