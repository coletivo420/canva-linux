import { createApp } from "../c420ui/app";
import { createCanvaLinuxC420UIAdapter } from "./adapter";

export function runCanvaLinuxC420UI(rootDir = process.cwd()): void {
  const adapter = createCanvaLinuxC420UIAdapter(rootDir);

  if (process.argv.includes("--help")) {
    const project = adapter.loadProjectConfig();
    console.log(
      `${project.projectName} C420UI terminal interface\n\nUsage:\n  npm run c420ui\n  ${project.launcherCommand}`,
    );
    return;
  }

  if (typeof process.getuid === "function" && process.getuid() === 0) {
    console.error(adapter.rootLaunchGuardMessage());
    process.exit(1);
  }

  const screen = createApp(adapter.toC420UIConfig());

  process.on("uncaughtException", (err) => {
    try {
      screen.destroy();
    } catch {}
    console.error(err);
    process.exit(1);
  });
}

