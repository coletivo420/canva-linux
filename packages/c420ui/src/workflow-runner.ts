import type { c420uiActionResult } from "./bridge";
import { createC420UIEvent, type C420UIEventSink } from "./events";
import { c420uiExitCodes } from "./exit-codes";
import type { c420uiRunnableArtifactWorkflow } from "./workflows";

export type c420uiWorkflowPhase =
  | "build"
  | "validate"
  | "install"
  | "uninstall"
  | "purge"
  | "release";

export type c420uiArtifactWorkflowRunOptions = {
  phase: c420uiWorkflowPhase;
  dryRun?: boolean;
  yes?: boolean;
  emit?: C420UIEventSink;
  runAction(actionId: string): Promise<c420uiActionResult> | c420uiActionResult;
};

export type c420uiArtifactWorkflowPhasePlan = {
  workflowId: string;
  phase: c420uiWorkflowPhase;
  actionId?: string;
  planned: boolean;
  requiresRoot?: boolean;
  outputPattern?: string;
};

function actionIdForPhase(
  workflow: c420uiRunnableArtifactWorkflow,
  phase: c420uiWorkflowPhase,
): string | undefined {
  switch (phase) {
    case "build":
      return workflow.buildActionId;
    case "validate":
      return workflow.validateActionId;
    case "install":
      return workflow.installActionId;
    case "uninstall":
      return workflow.uninstallActionId;
    case "purge":
      return workflow.purgeActionId;
    case "release":
      return workflow.releaseActionId;
  }
}

function phasePlan(
  workflow: c420uiRunnableArtifactWorkflow,
  phase: c420uiWorkflowPhase,
): c420uiArtifactWorkflowPhasePlan {
  return {
    workflowId: workflow.id,
    phase,
    actionId: actionIdForPhase(workflow, phase),
    planned: workflow.planned === true,
    requiresRoot: workflow.requiresRoot,
    outputPattern: workflow.outputPattern,
  };
}

function eventData(plan: c420uiArtifactWorkflowPhasePlan): Record<string, unknown> {
  return {
    phase: plan.phase,
    actionId: plan.actionId,
    outputPattern: plan.outputPattern,
    requiresRoot: plan.requiresRoot,
    planned: plan.planned,
  };
}

function actionEventMessage(
  workflow: c420uiRunnableArtifactWorkflow,
  actionId: string,
  fallbackPrefix: string,
): string {
  const actionLabel = workflow.actions?.find((action) => action.id === actionId)?.label;
  if (actionLabel?.trim()) return actionLabel;
  return `${fallbackPrefix}: ${actionId}`;
}

export async function runC420UIArtifactWorkflow(
  workflow: c420uiRunnableArtifactWorkflow,
  options: c420uiArtifactWorkflowRunOptions,
): Promise<c420uiActionResult> {
  const emit = options.emit ?? (() => undefined);
  const dryRun = options.dryRun === true;
  const plan = phasePlan(workflow, options.phase);
  const actionId = plan.actionId;

  emit(createC420UIEvent({
    type: "workflow:start",
    workflowId: workflow.id,
    message: workflow.label,
    data: eventData(plan),
  }));

  if (plan.planned) {
    const result: c420uiActionResult = {
      code: c420uiExitCodes.plannedAction,
      status: "planned",
      message: `${workflow.label} is planned`,
    };
    emit(createC420UIEvent({
      type: "action:planned",
      workflowId: workflow.id,
      actionId,
      message: result.message ?? workflow.label,
      data: { ...eventData(plan), dryRun, exitCode: result.code, status: result.status },
    }));
    emit(createC420UIEvent({
      type: "workflow:finish",
      workflowId: workflow.id,
      message: workflow.label,
      data: { ...eventData(plan), dryRun, exitCode: result.code, status: result.status },
    }));
    return result;
  }

  if (!actionId) {
    const result: c420uiActionResult = {
      code: c420uiExitCodes.invalidUsage,
      status: "failed",
      message: `${workflow.id} does not support ${options.phase}`,
    };
    emit(createC420UIEvent({
      type: "workflow:finish",
      workflowId: workflow.id,
      message: workflow.label,
      level: "error",
      data: { ...eventData(plan), dryRun, exitCode: result.code, status: result.status },
    }));
    return result;
  }

  emit(createC420UIEvent({
    type: "action:start",
    workflowId: workflow.id,
    actionId,
    message: actionEventMessage(workflow, actionId, "Executing action"),
    data: { ...eventData(plan), dryRun, yes: options.yes === true },
  }));

  const result: c420uiActionResult = dryRun
    ? { code: c420uiExitCodes.success, status: "success", message: "dry-run" }
    : await options.runAction(actionId);

  emit(createC420UIEvent({
    type: "action:finish",
    workflowId: workflow.id,
    actionId,
    message: actionEventMessage(workflow, actionId, "Finished action"),
    level: result.status === "failed" ? "error" : undefined,
    data: { ...eventData(plan), dryRun, exitCode: result.code, status: result.status },
  }));

  emit(createC420UIEvent({
    type: "workflow:finish",
    workflowId: workflow.id,
    message: workflow.label,
    level: result.status === "failed" ? "error" : undefined,
    data: { ...eventData(plan), dryRun, exitCode: result.code, status: result.status },
  }));

  return result;
}
