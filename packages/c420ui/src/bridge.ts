import type { C420UIActionDescriptor } from "./actions";
import type { C420UIArtifactWorkflow } from "./artifacts";
import type { C420UIProjectCapabilities } from "./capabilities";
import type { C420UIConfig, C420UIProjectConfig } from "./types";
import type { C420UIWorkflow, C420UIWorkflowRunOptions, C420UIWorkflowResult } from "./workflows";

export type C420UISudoProvider = {
  id: string;
  label: string;
  runAsRoot(command: string, args: string[], env?: Record<string, string>): Promise<number> | number;
};

export type C420UIProjectAdapter = {
  id: string;
  rootDir: string;
  loadProjectInfo(): C420UIProjectConfig;
  loadConfig(): C420UIConfig;
  loadActions(): C420UIActionDescriptor[];
  loadArtifactWorkflows(): C420UIArtifactWorkflow[];
  loadWorkflows(): C420UIWorkflow[];
  loadCapabilities(): C420UIProjectCapabilities;
  getSudoProvider?(): C420UISudoProvider;
  runWorkflow?(workflowId: string, options?: C420UIWorkflowRunOptions): Promise<C420UIWorkflowResult>;
};

export function createC420UIBridge(adapter: C420UIProjectAdapter): C420UIProjectAdapter {
  return adapter;
}
