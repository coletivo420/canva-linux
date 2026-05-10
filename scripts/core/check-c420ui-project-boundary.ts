#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function listTypeScriptFiles(rootDir: string, relativeDir: string): string[] {
  const absoluteDir = path.join(rootDir, relativeDir);
  const discovered: string[] = [];

  function walk(currentDir: string): void {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        discovered.push(path.relative(rootDir, fullPath));
      }
    }
  }

  walk(absoluteDir);
  return discovered.sort((left, right) => left.localeCompare(right));
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
  const index = read(rootDir, "scripts/c420ui/index.ts");
  const projectUi = read(rootDir, "scripts/project-ui.json");
  const failures: string[] = [];

  assertIncludes(
    failures,
    app,
    "export type C420UIBrandConfig",
    "scripts/c420ui/app.ts must export C420UIBrandConfig",
  );
  assertIncludes(
    failures,
    app,
    "export type C420UIProjectConfig",
    "scripts/c420ui/app.ts must export C420UIProjectConfig",
  );
  assertIncludes(
    failures,
    app,
    "export type C420UIConfig",
    "scripts/c420ui/app.ts must export C420UIConfig",
  );

  const forbiddenCoreFragments = [
    "Canva Linux",
    "CANVA LINUX",
    "canva-linux",
    "config/canva-linux",
    "scripts/c420ui-adapter",
    "io.github.coletivo420.canva-linux",
    "https://github.com/coletivo420/canva-linux",
    "CANVA_LOGO_LINES",
    "@canva-linux",
    "canva_linux",
  ];
  const coreFiles = listTypeScriptFiles(rootDir, "scripts/c420ui");
  for (const relativePath of coreFiles) {
    const content = read(rootDir, relativePath);
    for (const fragment of forbiddenCoreFragments) {
      if (content.includes(fragment)) {
        failures.push(
          `${relativePath}: C420UI core must not hardcode project metadata or dependent-project paths: ${fragment}`,
        );
      }
    }
  }

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
      !index.includes(`${field}: projectUi.${field}`) &&
      !index.includes(`${field}: [...projectUi.${field}]`)
    ) {
      failures.push(
        `scripts/c420ui/index.ts must inject ${field} from scripts/project-ui.json`,
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
