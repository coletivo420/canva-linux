import { createApp } from "./app";
import path from "node:path";
import projectUi from "../project-ui.json";
import { ROOT_LAUNCH_GUARD_MESSAGE } from "./settings";

function getPackageVersion(): string {
  const pkg = require(path.join(process.cwd(), "package.json")) as {
    version?: string;
  };
  return pkg.version ?? "unknown";
}

if (process.argv.includes("--help")) {
  console.log(
    "Canva Linux C420UI (experimental)\n\nUsage:\n  npm run tui\n  ./canva-linux.sh",
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
    console.error(ROOT_LAUNCH_GUARD_MESSAGE);
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
      projectName: "Canva Linux",
      projectSubtitle: "Install and Development Workspace",
      displayVersion: projectUi.displayVersion ?? getPackageVersion(),
      phase: getProjectPhase(),
      status: projectUi.status,
    },
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
