#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(
  failures: string[],
  content: string,
  fragment: string,
  message: string,
) {
  if (!content.includes(fragment)) {
    failures.push(message);
  }
}

export function main(): number {
  const rootDir = findProjectRoot();
  const app = read(rootDir, "scripts/c420ui/app.ts");
  const packageTypes = read(rootDir, "packages/c420ui/src/types.ts");
  const logo = read(rootDir, "scripts/c420ui/logo.ts");
  const settings = read(rootDir, "scripts/c420ui/settings.ts");
  const index = read(rootDir, "scripts/c420ui/index.ts");
  const adapter = read(rootDir, "scripts/c420ui-canva-linux/adapter.ts");
  const projectUi = read(rootDir, "scripts/project-ui.json");
  const failures: string[] = [];

  assertIncludes(
    failures,
    app,
    "../../packages/c420ui/src",
    "scripts/c420ui/app.ts must import generic c420ui types from packages/c420ui",
  );

  // Transitional PascalCase TypeScript symbols are allowed until the public API rename commit.
  assertIncludes(
    failures,
    packageTypes,
    "export type C420UIBrandConfig",
    "packages/c420ui/src/types.ts must export C420UIBrandConfig",
  );
  assertIncludes(
    failures,
    packageTypes,
    "export type C420UIProjectConfig",
    "packages/c420ui/src/types.ts must export C420UIProjectConfig",
  );
  assertIncludes(
    failures,
    packageTypes,
    "export type C420UIConfig",
    "packages/c420ui/src/types.ts must export C420UIConfig",
  );

  const forbiddenCoreFragments = [
    "Canva Linux",
    "CANVA LINUX",
    "canva-linux",
    "io.github.coletivo420.canva-linux",
    "https://github.com/coletivo420/canva-linux",
    "CANVA_LOGO_LINES",
  ];
  for (const fragment of forbiddenCoreFragments) {
    if (
      app.includes(fragment) ||
      logo.includes(fragment) ||
      settings.includes(fragment)
    ) {
      failures.push(
        `c420ui core must not hardcode project metadata: ${fragment}`,
      );
    }
  }


  assertIncludes(
    failures,
    index,
    "runCanvaLinuxC420UI",
    "scripts/c420ui/index.ts must delegate to the Canva Linux c420ui adapter runner",
  );

  const projectFields = [
    "logoLines",
    "appId",
    "executableName",
    "repositoryUrl",
    "launcherCommand",
    "stateDirectoryName",
  ];
  for (const field of projectFields) {
    assertIncludes(
      failures,
      app,
      `opts.project.${field}`,
      `scripts/c420ui/app.ts must read ${field} from project config`,
    );
    if (
      !adapter.includes(`${field}: projectUi.${field}`) &&
      !adapter.includes(`${field}: [...projectUi.${field}]`)
    ) {
      failures.push(
        `scripts/c420ui-canva-linux/adapter.ts must inject ${field} from scripts/project-ui.json`,
      );
    }
    assertIncludes(
      failures,
      projectUi,
      `"${field}":`,
      `scripts/project-ui.json must define ${field}`,
    );
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-project-boundary] OK");
  return 0;
}

if (
  require.main === module &&
  /check-c420ui-project-boundary\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[c420ui-project-boundary] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
