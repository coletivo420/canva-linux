import type { c420uiAction, C420UIActionDescriptor } from "./actions.js";
import type { c420uiArtifactWorkflow } from "./artifacts.js";
import type { c420uiOverviewStatus } from "./detection.js";
import type { c420uiLogEvent, c420uiProgressEvent } from "./events.js";
import type { c420uiProjectCapabilities } from "./capabilities.js";
import type { c420uiHostDependencyConfig } from "./host-dependencies.js";
import type { c420uiMaintenanceConfig } from "./maintenance-config.js";
import type { C420UIConfig, C420UIProjectConfig } from "./types.js";
import type { C420UIWorkflow, C420UIWorkflowRunOptions, C420UIWorkflowResult } from "./workflows.js";

export type c420uiProjectInfo = {
  projectName: string;
  projectSubtitle?: string;
  displayVersion?: string;
  phase?: string;
  fullVersion?: string;
  buildRevision?: string;
  status?: string;
  appId?: string;
  repositoryUrl?: string;
};

export type c420uiExecutionContext = {
  rootDir: string;
  dryRun: boolean;
  yes: boolean;
  env: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  emitLog(event: c420uiLogEvent): void;
  emitProgress(event: c420uiProgressEvent): void;
};

export type c420uiActionResult = {
  code: number;
  status: "success" | "failed" | "planned" | "canceled";
  message?: string;
};

export type c420uiProjectBridge = {
  id: string;
  projectInfo(): c420uiProjectInfo;
  actions(): c420uiAction[];
  artifactWorkflows(): c420uiArtifactWorkflow[];
  runAction(actionId: string, context: c420uiExecutionContext): Promise<c420uiActionResult>;
  overviewStatus?(): Promise<c420uiOverviewStatus | null> | c420uiOverviewStatus | null;
  hostDependencies?(): c420uiHostDependencyConfig;
  maintenance?(): c420uiMaintenanceConfig;
};

export type C420UIProjectInfo = c420uiProjectInfo;
export type C420UIExecutionContext = c420uiExecutionContext;
export type C420UIActionResult = c420uiActionResult;
export type C420UIProjectBridge = c420uiProjectBridge;

export type C420UIProjectAdapter = c420uiProjectBridge & {
  rootDir: string;
  loadProjectInfo(): C420UIProjectConfig;
  loadConfig(): C420UIConfig;
  loadActions(): C420UIActionDescriptor[];
  loadArtifactWorkflows(): c420uiArtifactWorkflow[];
  loadWorkflows(): C420UIWorkflow[];
  loadCapabilities(): c420uiProjectCapabilities;
  runWorkflow?(workflowId: string, options?: C420UIWorkflowRunOptions): Promise<C420UIWorkflowResult>;
  loadHostDependencies?(): c420uiHostDependencyConfig;
  loadMaintenanceConfig?(): c420uiMaintenanceConfig;
};

export function createC420UIBridge<TBridge extends c420uiProjectBridge>(
  bridge: TBridge,
): TBridge {
  return bridge;
}
