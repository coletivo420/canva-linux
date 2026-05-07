#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const launcher = read(rootDir, "canva-linux.sh");
  const runTui = read(rootDir, "scripts/run-c420ui.ts");
  const tuiIndex = read(rootDir, "scripts/c420ui/index.ts");
  const rootMessage =
    "Do not run Canva Linux Install and Development Tool with sudo or as root.";

  if (!launcher.includes("[[ \"${EUID}\" -eq 0 ]]")) {
    failures.push("canva-linux.sh: must block EUID=0 before launching Tool");
  }
  if (!launcher.includes(rootMessage)) {
    failures.push("canva-linux.sh: must explain that root/sudo launch is blocked");
  }
  if (!launcher.includes("administrator privileges")) {
    failures.push(
      "canva-linux.sh: root guard must explain privileges are requested only when needed",
    );
  }
  if (!runTui.includes("process.getuid") || !tuiIndex.includes("process.getuid")) {
    failures.push("C420UI bootstrap must include a secondary root-launch guard");
  }
  if (!runTui.includes("rootLaunchGuardMessage")) {
    failures.push("scripts/run-c420ui.ts: must reuse the root-launch guard message builder");
  }

  const docsToCheck = ["README.md", "docs/CLI.md", "docs/TECHNICAL.md"];
  for (const relativePath of docsToCheck) {
    const content = read(rootDir, relativePath);
    if (/sudo\s+\.\/canva-linux\.sh/.test(content)) {
      failures.push(
        `${relativePath}: must not instruct users to run ./canva-linux.sh with sudo`,
      );
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[ok] Root launch contract check passed");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[error] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
