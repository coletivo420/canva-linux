#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

function expectedPhaseFromVersion(version: string) {
  const devMatch = version.match(/^(\d+\.\d+\.\d+)-dev\.(\d+)\.(\d+)$/);
  if (devMatch) return `${devMatch[1]}.${devMatch[2]}-dev.${devMatch[3]}`;

  if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version))
    return version;

  throw new Error(
    `package.json version does not map to a project phase: ${version}`,
  );
}

export function main(): number {
  const rootDir = findProjectRoot();
  const pkg = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  ) as { version?: string };
  const projectUi = JSON.parse(
    fs.readFileSync(path.join(rootDir, "scripts/project-ui.json"), "utf8"),
  ) as { displayVersion?: string; phase?: string };
  const identity = fs.readFileSync(
    path.join(rootDir, "scripts/app-identity-common.sh"),
    "utf8",
  );
  const phaseMatch = identity.match(/^PROJECT_PHASE="([^"]+)"/m);
  const displayVersionMatch = identity.match(
    /^PROJECT_DISPLAY_VERSION="([^"]+)"/m,
  );
  if (!pkg.version) throw new Error("package.json version not found");
  if (!phaseMatch) throw new Error("PROJECT_PHASE not found");
  if (!displayVersionMatch) throw new Error("PROJECT_DISPLAY_VERSION not found");

  const expectedPhase = expectedPhaseFromVersion(pkg.version);
  if (phaseMatch[1] !== expectedPhase) {
    throw new Error(
      `PROJECT_PHASE mismatch: expected ${expectedPhase}, got ${phaseMatch[1]}`,
    );
  }
  if (displayVersionMatch[1] !== expectedPhase) {
    throw new Error(
      `PROJECT_DISPLAY_VERSION mismatch: expected ${expectedPhase}, got ${displayVersionMatch[1]}`,
    );
  }
  if (projectUi.phase !== expectedPhase) {
    throw new Error(
      `project-ui phase mismatch: expected ${expectedPhase}, got ${projectUi.phase || "missing"}`,
    );
  }
  if (projectUi.displayVersion !== expectedPhase) {
    throw new Error(
      `project-ui displayVersion mismatch: expected ${expectedPhase}, got ${projectUi.displayVersion || "missing"}`,
    );
  }

  console.log("[ok] Version consistency check passed");
  return 0;
}

if (
  require.main === module &&
  /check-version-consistency\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[error] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
