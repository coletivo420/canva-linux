import {
  runC420UIWorkflow,
  type C420UIProjectAdapter,
  type C420UIWorkflowResult,
  type C420UIWorkflowRunOptions,
} from "../../packages/c420ui/src";
import { createCanvaLinuxC420UIAdapter } from "./adapter";

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
