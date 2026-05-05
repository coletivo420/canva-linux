import {
  getActionById as getSharedActionById,
  getActionsByGroup as getSharedActionsByGroup,
  loadActions,
  type ActionGroup,
  type ActionKind,
  type CanvaAction,
} from '../core/action-registry';

export type TuiActionGroup = ActionGroup;
export type TuiActionKind = ActionKind;
export type TuiAction = CanvaAction;

export const tuiActions: TuiAction[] = [];

export function loadTuiActions(rootDir = process.cwd()): TuiAction[] {
  return loadActions(rootDir);
}

export function getActionsByGroup(group: TuiActionGroup, rootDir = process.cwd()): TuiAction[] {
  return getSharedActionsByGroup(group, rootDir);
}

export function getActionById(id: string, rootDir = process.cwd()): TuiAction | undefined {
  return getSharedActionById(id, rootDir);
}
