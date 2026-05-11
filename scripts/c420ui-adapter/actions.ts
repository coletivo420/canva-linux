import {
  type C420UIActionDescriptor,
  type C420UIWorkflowPhase,
} from "../../packages/c420ui/src";
import {
  loadCanvaLinuxActions as loadCanvaLinuxActionRegistry,
  type CanvaAction,
} from "../canva-linux/actions/registry";

function actionPhase(action: CanvaAction): C420UIWorkflowPhase | undefined {
  if (action.phase) return action.phase;
  if (action.group === "install") return "install";
  if (action.group === "maintenance") return undefined;
  return undefined;
}

export function toC420UIActionDescriptor(
  action: CanvaAction,
): C420UIActionDescriptor {
  const isCommandAction = action.kind === "command";
  const kind = isCommandAction ? "command" : "planned";
  return {
    ...action,
    kind,
    phase: actionPhase(action),
    cliFlags: action.cli,
  };
}

export function loadCanvaLinuxC420UIActions(
  rootDir: string,
): C420UIActionDescriptor[] {
  return loadCanvaLinuxActionRegistry(rootDir).map(toC420UIActionDescriptor);
}
