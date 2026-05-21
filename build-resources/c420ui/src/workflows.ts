import { assertC420UIActionContract, isC420UIPlannedAction, type C420UIActionDescriptor, type C420UIWorkflowPhase } from "./actions";
import { createC420UIEvent, type C420UIEventSink } from "./events";
import { c420uiExitCodes, type C420UIExitCode } from "./exit-codes";

export type C420UIWorkflow = {
  id: string;
  label: string;
  phase: C420UIWorkflowPhase;
  actions: C420UIActionDescriptor[];
  requiresRoot?: boolean;
  supportsDryRun?: boolean;
};

export type c420uiArtifactWorkflowPhaseActionIds = {
  buildActionId?: string;
  validateActionId?: string;
  installActionId?: string;
  uninstallActionId?: string;
  purgeActionId?: string;
  releaseActionId?: string;
};

export type c420uiArtifactWorkflowRuntimeMetadata = {
  kind?: string;
  scope?: string;
  planned?: boolean;
  outputPattern?: string;
};

export type c420uiRunnableArtifactWorkflow = Pick<
  C420UIWorkflow,
  "id" | "label" | "requiresRoot" | "supportsDryRun"
> &
  Partial<Pick<C420UIWorkflow, "phase" | "actions">> &
  c420uiArtifactWorkflowPhaseActionIds &
  c420uiArtifactWorkflowRuntimeMetadata;

export type C420UIWorkflowResult = {
  workflowId: string;
  exitCode: C420UIExitCode;
  planned: boolean;
  dryRun: boolean;
};

export type C420UIWorkflowRunner = (
  workflow: C420UIWorkflow,
  options?: C420UIWorkflowRunOptions,
) => Promise<C420UIWorkflowResult>;

export type C420UIWorkflowRunOptions = {
  dryRun?: boolean;
  emit?: C420UIEventSink;
  executeAction?: (action: C420UIActionDescriptor) => Promise<number> | number;
};

export async function runC420UIWorkflow(
  workflow: C420UIWorkflow,
  options: C420UIWorkflowRunOptions = {},
): Promise<C420UIWorkflowResult> {
  const emit = options.emit ?? (() => undefined);
  const dryRun = options.dryRun === true;

  emit(createC420UIEvent({ type: "workflow:start", workflowId: workflow.id, message: workflow.label }));

  for (const action of workflow.actions) {
    assertC420UIActionContract(action);
    if (isC420UIPlannedAction(action)) {
      emit(createC420UIEvent({ type: "action:planned", workflowId: workflow.id, actionId: action.id, message: action.label }));
      return { workflowId: workflow.id, exitCode: c420uiExitCodes.plannedAction, planned: true, dryRun };
    }
    emit(createC420UIEvent({ type: "action:start", workflowId: workflow.id, actionId: action.id, message: action.label }));
    const exitCode = dryRun ? c420uiExitCodes.success : await (options.executeAction?.(action) ?? c420uiExitCodes.success);
    emit(createC420UIEvent({ type: "action:finish", workflowId: workflow.id, actionId: action.id, message: action.label, data: { exitCode } }));
    if (exitCode !== c420uiExitCodes.success) {
      return { workflowId: workflow.id, exitCode: c420uiExitCodes.generalError, planned: false, dryRun };
    }
  }

  emit(createC420UIEvent({ type: "workflow:finish", workflowId: workflow.id, message: workflow.label }));
  return { workflowId: workflow.id, exitCode: c420uiExitCodes.success, planned: false, dryRun };
}
