import { resolveC420UIHostDependencies } from "./host-dependency-resolver.js";

export async function requireC420UIRustCommands(options: {
  rootDir: string;
  commands: string[];
  env?: NodeJS.ProcessEnv;
}): Promise<void> {
  const result = await resolveC420UIHostDependencies(
    {
      commands: options.commands.map((command) => ({
        id: command,
        command,
        required: true,
      })),
    },
    {
      rootDir: options.rootDir,
      env: options.env,
      action: "check",
    },
  );

  if (result.status !== "available") {
    throw new Error(result.message || `Required host commands are missing: ${options.commands.join(", ")}`);
  }
}
