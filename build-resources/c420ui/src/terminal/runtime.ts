import {
  runC420UIRustTuiApp,
  type C420UIRustTuiRunnerOptions,
} from "../rust-tui-runner.js";
import type { C420UIAppOptions } from "./app-options.js";
import { enforceC420UIRootLaunchGuard } from "./root-guard.js";

export type c420uiTerminalRuntimeOptions = {
  getuid?: () => number;
  writeError?: (message: string) => void;
  exit?: (code: number) => never;
  runRustTuiApp?: (options: C420UIRustTuiRunnerOptions) => void;
};

export function runC420UITerminalApp(
  options: C420UIAppOptions,
  runtimeOptions: c420uiTerminalRuntimeOptions = {},
): void {
  const writeError = runtimeOptions.writeError ?? console.error;
  const exit = runtimeOptions.exit ?? (process.exit as (code: number) => never);

  enforceC420UIRootLaunchGuard({
    projectName: options.config.project.projectName,
    getuid: runtimeOptions.getuid,
    writeError,
    exit,
  });

  const runRustTuiApp = runtimeOptions.runRustTuiApp ?? runC420UIRustTuiApp;
  return runRustTuiApp({
    ...options,
    writeError,
    exit,
  });
}
