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
  const index = read(rootDir, "scripts/c420ui/index.ts");
  const adapter = read(rootDir, "scripts/c420ui-canva-linux/adapter.ts");
  const projectUi = read(rootDir, "scripts/project-ui.json");
  const failures: string[] = [];

  assertIncludes(
    failures,
    index,
    "runCanvaLinuxC420UI",
    "scripts/c420ui/index.ts must delegate to the Canva Linux C420UI adapter runner",
  );
  assertIncludes(
    failures,
    app,
    "export type HeaderLayout",
    "scripts/c420ui/app.ts must export HeaderLayout",
  );
  assertIncludes(
    failures,
    app,
    "../../packages/c420ui/src",
    "scripts/c420ui/app.ts must import generic C420UI types from packages/c420ui",
  );

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
  assertIncludes(
    failures,
    app,
    "computeHeaderLayout",
    "scripts/c420ui/app.ts must centralize header layout math",
  );
  assertIncludes(
    failures,
    app,
    "c420uiHeader",
    "scripts/c420ui/app.ts must keep a dedicated c420uiHeader component",
  );
  assertIncludes(
    failures,
    app,
    "projectHeader",
    "scripts/c420ui/app.ts must keep a dedicated projectHeader component",
  );
  assertIncludes(
    failures,
    app,
    "workspaceTop",
    "scripts/c420ui/app.ts must apply a shared workspaceTop",
  );
  assertIncludes(
    failures,
    app,
    "layoutMode",
    "scripts/c420ui/app.ts must expose side-by-side/stacked layoutMode",
  );

  const focusZones = app.match(/const FOCUS_ZONES:[^=]+=\s*\[([^\]]+)\]/);
  if (!focusZones) {
    failures.push("scripts/c420ui/app.ts must keep explicit FOCUS_ZONES");
  } else if (
    focusZones[1]?.includes("c420uiHeader") ||
    focusZones[1]?.includes("projectHeader")
  ) {
    failures.push("headers must not be included in FOCUS_ZONES");
  }

  if (app.includes("const brandHeader")) {
    failures.push("C420UI brand header component must be named c420uiHeader");
  }
  if (!app.includes("content: [\n      `{bold}${opts.brand.name}")) {
    failures.push("c420uiHeader content must come from brand config");
  }
  if (!app.includes("content: [\n      `{bold}${opts.project.projectName}")) {
    failures.push("projectHeader content must come from project config");
  }
  if (!adapter.includes("projectName: projectUi.projectName")) {
    failures.push("project name must be injected from scripts/project-ui.json");
  }
  if (!adapter.includes("projectSubtitle: projectUi.projectSubtitle")) {
    failures.push(
      "project subtitle must be injected from scripts/project-ui.json",
    );
  }
  assertIncludes(
    failures,
    projectUi,
    '"projectName":',
    "scripts/project-ui.json must define projectName",
  );
  assertIncludes(
    failures,
    projectUi,
    '"projectSubtitle":',
    "scripts/project-ui.json must define projectSubtitle",
  );
  assertIncludes(
    failures,
    projectUi,
    '"logoLines":',
    "scripts/project-ui.json must define project logo lines",
  );

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[c420ui-header-layout] OK");
  return 0;
}

if (
  require.main === module &&
  /check-c420ui-header-layout\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[c420ui-header-layout] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
