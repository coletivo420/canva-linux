import {
  printC420UITerminalHelp,
  runC420UITerminalApp,
} from "../../packages/c420ui/src/terminal";
import { createCanvaLinuxC420UIAdapter } from "./adapter";
import { ensureCanvaLinuxHostDependencies } from "./dependencies";
import { createCanvaLinuxRootProvider } from "./root-provider";

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
          ensureCanvaLinuxHostDependencies({
            rootDir,
            env: options.env,
          }),
      },
    ],
  });
}
