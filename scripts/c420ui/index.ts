import { createApp, type C420UIProjectConfig } from "./app";
import path from "node:path";
import projectUi from "../project-ui.json";
import { rootLaunchGuardMessage } from "./settings";

function getPackageVersion(): string {
  const pkg = require(path.join(process.cwd(), "package.json")) as {
    version?: string;
  };
  return pkg.version ?? "unknown";
}

if (process.argv.includes("--help")) {
  console.log(
    `${projectUi.projectName} C420UI terminal interface\n\nUsage:\n  npm run c420ui\n  ${projectUi.launcherCommand}`,
  );
  process.exit(0);
}

function getProjectPhase(): string {
  return (
    process.env.CANVA_PROJECT_PHASE?.trim() || projectUi.phase || "unknown"
  );
}

try {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    console.error(rootLaunchGuardMessage(projectUi.projectName));
    process.exit(1);
  }

  const screen = createApp({
    rootDir: process.cwd(),
    title: projectUi.c420uiTitle,
    brand: {
      name: "C420UI",
      version: "0.1",
      logoLines: [...require("./logo").C420UI_LOGO_LINES],
    },
    project: {
      projectName: projectUi.projectName,
      projectSubtitle: projectUi.projectSubtitle,
      displayVersion: projectUi.displayVersion ?? getPackageVersion(),
      phase: getProjectPhase(),
      status: projectUi.status,
      logoLines: [...projectUi.logoLines],
      appId: projectUi.appId,
      executableName: projectUi.executableName,
      repositoryUrl: projectUi.repositoryUrl,
      launcherCommand: projectUi.launcherCommand,
      stateDirectoryName: projectUi.stateDirectoryName,
    } satisfies C420UIProjectConfig,
    releaseNotes: projectUi.versionReleaseNotes,
  });

  process.on("uncaughtException", (err) => {
    try {
      screen.destroy();
    } catch {}
    console.error(err);
    process.exit(1);
  });
} catch (error) {
  console.error(error);
  process.exit(1);
}
