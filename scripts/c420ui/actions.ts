import {
  getActionById,
  getActionsByGroup,
  loadActions,
  type ActionGroup,
  type ActionKind,
  type CanvaAction,
} from "../canva-linux/actions/registry";

export type C420UIActionGroup = ActionGroup;
export type C420UIActionKind = ActionKind;
export type C420UIAction = CanvaAction;

export const c420uiActions: C420UIAction[] = [];

export function loadC420UIActions(rootDir = process.cwd()): C420UIAction[] {
  return loadActions(rootDir);
}

export { getActionById, getActionsByGroup };
export { c420uiActions as tuiActions };
export type {
  C420UIAction as TuiAction,
  C420UIActionGroup as TuiActionGroup,
  C420UIActionKind as TuiActionKind,
};
