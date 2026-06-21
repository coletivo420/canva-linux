import type { c420uiProjectBridge } from "../bridge.js";
import type { c420uiRootProvider } from "../root-provider.js";
import type { c420uiStartupTask } from "../startup-task.js";
import type { C420UIConfig } from "../types.js";

export type C420UIAppOptions = {
  config: C420UIConfig;
  bridge: c420uiProjectBridge;
  rootProvider?: c420uiRootProvider;
  startupTasks?: c420uiStartupTask[];
};
