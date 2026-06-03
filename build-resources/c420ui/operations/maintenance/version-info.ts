import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "../../host/paths.js";

export function runVersionInfo(): void {
  const rootDir = projectRoot();
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  );
  const version = packageJson.version || "unknown";

  console.log("Project phase:");
  console.log(`  ${process.env.PROJECT_PHASE || "unknown"}`);
  console.log("");
  console.log("Package SemVer:");
  console.log(`  ${version}`);
  console.log("");
  console.log("AppID:");
  console.log("  io.github.coletivo420.canva-linux");
  console.log("");
  console.log("Executable:");
  console.log("  canva-linux");
  console.log("");
  console.log("Repository:");
  console.log("  https://github.com/coletivo420/canva-linux");
}
