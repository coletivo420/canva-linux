import type { c420uiAction } from "./actions";

export type c420uiRootPolicyResult =
  | { requiresRoot: false; warning?: string }
  | { requiresRoot: true; reason: string };

export type c420uiRootValidationResult =
  | { ok: true }
  | { ok: false; code: number; message: string };

export type c420uiRootProvider = {
  id: string;
  label: string;

  buildActionEnvironment(
    action: c420uiAction,
    baseEnv: NodeJS.ProcessEnv,
  ): NodeJS.ProcessEnv;

  validateActionScope(
    action: c420uiAction,
    actionEnv: NodeJS.ProcessEnv,
  ): c420uiRootValidationResult;

  resolveRootPolicy(
    action: c420uiAction,
    rootDir: string,
    actionEnv: NodeJS.ProcessEnv,
  ): c420uiRootPolicyResult;

  validateRootAccess(
    rootDir: string,
    actionEnv: NodeJS.ProcessEnv,
  ): c420uiRootValidationResult;

  validateRootAccessWithInput?(
    rootDir: string,
    actionEnv: NodeJS.ProcessEnv,
    input: string,
  ): c420uiRootValidationResult;

  buildRootActionEnvironment?(
    action: c420uiAction,
    actionEnv: NodeJS.ProcessEnv,
  ): NodeJS.ProcessEnv;
};

export const c420uiRootPolicyExitCode = 64;
