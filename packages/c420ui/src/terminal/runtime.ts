import type { createApp, C420UIAppOptions } from "./app";
import { enforceC420UIRootLaunchGuard } from "./root-guard";

export type c420uiTerminalRuntimeOptions = {
  create?: typeof createApp;
  getuid?: () => number;
  writeError?: (message: string) => void;
  exit?: (code: number) => never;
  onUncaughtException?: (
    listener: (error: Error) => void,
  ) => NodeJS.Process;
};

function loadC420UITerminalApp(): typeof createApp {
  const app = require("./app") as typeof import("./app");
  return app.createApp;
}

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

  const create = runtimeOptions.create ?? loadC420UITerminalApp();
  const screen = create(options);
  const onUncaughtException =
    runtimeOptions.onUncaughtException ??
    ((listener: (error: Error) => void) =>
      process.on("uncaughtException", listener));

  onUncaughtException((err) => {
    try {
      screen.destroy();
    } catch {}
    writeError(err instanceof Error ? err.stack || err.message : String(err));
    exit(1);
  });
}
