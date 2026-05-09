import {
  createC420UIActionEngine,
  runC420UIArtifactWorkflow,
  runC420UIWorkflow,
  type c420uiActionResult,
  type c420uiWorkflowPhase,
  type C420UIEventSink,
  type C420UIProjectAdapter,
  type C420UIWorkflowResult,
  type C420UIWorkflowRunOptions,
} from "../../packages/c420ui/src";
import { createCanvaLinuxC420UIAdapter } from "./adapter";
import { createCanvaLinuxRootProvider } from "./root-provider";

export function createCanvaLinuxBridge(
  rootDir = process.cwd(),
): C420UIProjectAdapter {
  return createCanvaLinuxC420UIAdapter(rootDir);
}

export async function runCanvaLinuxWorkflow(
  workflowId: string,
  options: C420UIWorkflowRunOptions = {},
  rootDir = process.cwd(),
): Promise<C420UIWorkflowResult> {
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);
  const workflow = adapter.loadWorkflows().find((item) => item.id === workflowId);
  if (!workflow) throw new Error(`Unknown c420ui workflow: ${workflowId}`);
  return runC420UIWorkflow(workflow, options);
}

export type CanvaLinuxArtifactWorkflowRunOptions = {
  dryRun?: boolean;
  yes?: boolean;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  emit?: C420UIEventSink;
};

export async function runCanvaLinuxArtifactWorkflow(
  workflowId: string,
  phase: c420uiWorkflowPhase,
  options: CanvaLinuxArtifactWorkflowRunOptions = {},
  rootDir = process.cwd(),
): Promise<c420uiActionResult> {
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);
  const workflow = adapter.loadArtifactWorkflows().find((item) => item.id === workflowId);
  if (!workflow) throw new Error(`Unknown c420ui artifact workflow: ${workflowId}`);

  const engine = createC420UIActionEngine({
    bridge: adapter,
    rootDir,
    env: options.env ?? process.env,
    rootProvider: createCanvaLinuxRootProvider(),
    emit: options.emit,
  });

  return runC420UIArtifactWorkflow(workflow, {
    phase,
    dryRun: options.dryRun,
    yes: options.yes,
    emit: options.emit,
    runAction(actionId) {
      return engine.runActionById(actionId, {
        dryRun: options.dryRun,
        yes: options.yes,
        signal: options.signal,
      });
    },
  });
}
