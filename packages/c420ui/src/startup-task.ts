import {
  isC420UIHostDependencyFailure,
  type c420uiHostDependencyCheckResult,
} from "./host-dependencies";

export type c420uiStartupTask = {
  id: string;
  label: string;
  run(): Promise<c420uiHostDependencyCheckResult> | c420uiHostDependencyCheckResult;
};

export type c420uiStartupTaskLogger = (text: string) => void;

function formatPlannedCommand(result: c420uiHostDependencyCheckResult): string | null {
  const command = result.plannedCommand;
  if (!command) return null;
  return [command.command, ...command.args].join(" ");
}

export async function runC420UIStartupTasks(
  tasks: c420uiStartupTask[],
  log: c420uiStartupTaskLogger,
): Promise<void> {
  for (const task of tasks) {
    log(`[info] ${task.label}...\n`);

    try {
      const result = await task.run();
      const plannedCommand = formatPlannedCommand(result);
      if (plannedCommand) {
        log(`[info] Planned dependency command: ${plannedCommand}\n`);
      }

      if (isC420UIHostDependencyFailure(result)) {
        log("[error] Failed to prepare dependent project dependencies.\n");
        if (result.message) log(`[error] ${result.message}\n`);
        continue;
      }

      log(`[info] ${result.message || "Dependent project dependencies are ready."}\n`);
    } catch (error) {
      log("[error] Failed to prepare dependent project dependencies.\n");
      log(`[error] ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
}
