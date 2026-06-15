import {
  printC420UITerminalHelp,
  runC420UITerminalApp,
} from "../../c420ui/src/terminal/index.js";
import { runC420UIHostDependencyEnsure } from "../../c420ui/src/index.js";
import { createCanvaLinuxC420UIAdapter } from "./adapter.js";
import { createCanvaLinuxRootProvider } from "./root-provider.js";

export type RunCanvaLinuxC420UIOptions = {
  rootDir?: string;
  argv?: string[];
  env?: NodeJS.ProcessEnv;
};

export function runCanvaLinuxC420UI(
  options: RunCanvaLinuxC420UIOptions = {},
): void {
  const rootDir = options.rootDir ?? process.cwd();
  const argv = options.argv ?? process.argv.slice(2);
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);
  const config = adapter.toC420UIConfig();

  if (argv.includes("--help")) {
    printC420UITerminalHelp({
      config,
      launcherCommand: config.project.launcherCommand,
    });
    return;
  }

  runC420UITerminalApp({
    config,
    bridge: adapter,
    rootProvider: createCanvaLinuxRootProvider(),
    startupTasks: [
      {
        id: "host-dependencies",
        label: "Checking dependent project dependencies",
        run: () =>
          runC420UIHostDependencyEnsure(config.hostDependencies ?? {}, {
            rootDir,
            env: options.env,
          }),
      },
    ],
  });
}
