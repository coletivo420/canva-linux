export type c420uiRootLaunchGuardOptions = {
  projectName: string;
  getuid?: () => number;
  writeError?: (message: string) => void;
  exit?: (code: number) => never;
};

export function createC420UIRootLaunchGuardMessage(
  projectName: string,
): string {
  const toolName = `${projectName} Install and Development Tool`;

  return [
    `Do not run ${toolName} with sudo or as root.`,
    "",
    `Run this tool as your regular user. When an operation needs administrator privileges, ${projectName} will ask for authentication only for that specific action.`,
    "",
    "Running the whole tool as root may break file ownership, user sessions, build artifacts and desktop integration.",
  ].join("\n");
}

export function isC420UIRootLaunch(
  getuid: (() => number) | undefined = process.getuid,
): boolean {
  return typeof getuid === "function" && getuid() === 0;
}

export function enforceC420UIRootLaunchGuard(
  options: c420uiRootLaunchGuardOptions,
): void {
  if (!isC420UIRootLaunch(options.getuid)) return;

  const message = createC420UIRootLaunchGuardMessage(options.projectName);
  options.writeError?.(message);
  options.exit?.(1);
}
