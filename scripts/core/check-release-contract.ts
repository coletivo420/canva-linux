#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

const releaseScripts = [
  "scripts/build-appimage.sh",
  "scripts/build-flatpak-bundle.sh",
  "scripts/package-guidance-common.sh",
  "scripts/validate-project.sh",
  "scripts/app-identity-common.sh",
];

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function packageVersionToPhase(version: string): string {
  const dev = version.match(/^(\d+\.\d+\.\d+)-dev\.(\d+)\.(\d+)$/);
  if (dev) return `${dev[1]}.${dev[2]}-dev.${dev[3]}`;

  if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version))
    return version;

  throw new Error(`package.json version does not map to release identity: ${version}`);
}

function shellValue(file: string, key: string): string | null {
  return file.match(new RegExp(`^${key}="([^"]+)"`, "m"))?.[1] ?? null;
}

function assertIncludes(
  failures: string[],
  file: string,
  contents: string,
  expected: string,
) {
  if (!contents.includes(expected)) failures.push(`${file}: missing ${expected}`);
}

function validateShellScript(
  rootDir: string,
  relativePath: string,
  failures: string[],
) {
  const fullPath = path.join(rootDir, relativePath);
  const contents = read(rootDir, relativePath);
  const lines = contents.split(/\r?\n/);

  if (!lines[0]?.startsWith("#!")) {
    failures.push(`${relativePath}: shebang must be the first line`);
  }
  if (lines[1] !== "set -euo pipefail") {
    failures.push(`${relativePath}: set -euo pipefail must be on line 2`);
  }
  if (lines.length < 8) {
    failures.push(`${relativePath}: release script appears collapsed`);
  }

  const syntax = spawnSync("bash", ["-n", fullPath], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (syntax.status !== 0) {
    failures.push(
      `${relativePath}: bash -n failed: ${syntax.stderr || syntax.stdout}`,
    );
  }
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  const workflowPath = ".github/workflows/release.yml";
  const releaseDocsPath = "docs/RELEASE.md";
  const workflow = fs.existsSync(path.join(rootDir, workflowPath))
    ? read(rootDir, workflowPath)
    : "";
  const releaseDocs = fs.existsSync(path.join(rootDir, releaseDocsPath))
    ? read(rootDir, releaseDocsPath)
    : "";
  const pkg = JSON.parse(read(rootDir, "package.json")) as { version?: string };
  const releaseVersion = pkg.version || "";

  if (!workflow) failures.push(`${workflowPath}: missing release workflow`);
  if (!releaseDocs) failures.push(`${releaseDocsPath}: missing release notes body`);
  if (workflow.includes("\t")) failures.push(`${workflowPath}: tabs are forbidden`);
  if (workflow.includes("find dist") || workflow.includes("head -n 1")) {
    failures.push(`${workflowPath}: asset selection must not use find/head`);
  }

  if (!releaseVersion) failures.push("package.json: missing version");

  for (const expected of [
    "workflow_dispatch:",
    "tags:",
    "node-version: \"22\"",
    "npm run validate:project",
    "./scripts/build-appimage.sh",
    "./scripts/build-flatpak-bundle.sh",
    "canva-linux-${RELEASE_VERSION}-x86_64.AppImage",
    "canva-linux-${RELEASE_VERSION}.flatpak",
    "canva-linux-${RELEASE_VERSION}-linux-unpacked-x86_64.tar.gz",
    "dist/SHA256SUMS",
    "softprops/action-gh-release@v2",
    "body_path: docs/RELEASE.md",
    "dist/canva-linux-${PACKAGE_VERSION}-x86_64.AppImage",
  ]) {
    assertIncludes(failures, workflowPath, workflow, expected);
  }

  for (const expected of [
    `canva-linux-${releaseVersion}-x86_64.AppImage`,
    `canva-linux-${releaseVersion}.flatpak`,
    `canva-linux-${releaseVersion}-linux-unpacked-x86_64.tar.gz`,
    "SHA256SUMS",
  ]) {
    assertIncludes(failures, releaseDocsPath, releaseDocs, expected);
  }

  for (const forbidden of ["0.1.4.12", "linux-unpacked-x64", "-x64.AppImage"]) {
    if (workflow.includes(forbidden) || releaseDocs.includes(forbidden)) {
      failures.push(
        `release naming must use npm version and x86_64 architecture, found ${forbidden}`,
      );
    }
  }

  for (const script of releaseScripts) {
    validateShellScript(rootDir, script, failures);
  }

  const buildAppImage = read(rootDir, "scripts/build-appimage.sh");
  if (
    buildAppImage.includes("> SHA256SUMS") ||
    buildAppImage.includes("/SHA256SUMS")
  ) {
    failures.push(
      "scripts/build-appimage.sh: AppImage build must not create or remove the complete release SHA256SUMS manifest",
    );
  }
  assertIncludes(
    failures,
    "scripts/build-appimage.sh",
    buildAppImage,
    ".AppImage.sha256",
  );
  assertIncludes(
    failures,
    "scripts/build-appimage.sh",
    buildAppImage,
    "--skip-release-manifest",
  );

  const lock = JSON.parse(read(rootDir, "package-lock.json")) as {
    version?: string;
    packages?: Record<string, { version?: string }>;
  };
  const projectUi = JSON.parse(read(rootDir, "scripts/project-ui.json")) as {
    displayVersion?: string;
    phase?: string;
  };
  const identity = read(rootDir, "scripts/app-identity-common.sh");
  const displayVersion = shellValue(identity, "PROJECT_DISPLAY_VERSION");
  const phase = shellValue(identity, "PROJECT_PHASE");

  if (!pkg.version) failures.push("package.json: missing version");
  if (pkg.version && lock.version !== pkg.version) {
    failures.push("package-lock.json: top-level version must match package.json");
  }
  if (pkg.version && lock.packages?.[""]?.version !== pkg.version) {
    failures.push("package-lock.json: root package version must match package.json");
  }

  if (pkg.version) {
    const expectedPhase = packageVersionToPhase(pkg.version);
    if (projectUi.displayVersion !== expectedPhase) {
      failures.push(
        `scripts/project-ui.json: displayVersion must be ${expectedPhase}`,
      );
    }
    if (projectUi.phase !== expectedPhase) {
      failures.push(`scripts/project-ui.json: phase must be ${expectedPhase}`);
    }
    if (displayVersion !== expectedPhase) {
      failures.push(
        `scripts/app-identity-common.sh: PROJECT_DISPLAY_VERSION must be ${expectedPhase}`,
      );
    }
    if (phase !== expectedPhase) {
      failures.push(
        `scripts/app-identity-common.sh: PROJECT_PHASE must be ${expectedPhase}`,
      );
    }
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[ok] Release contract check passed");
  return 0;
}

if (
  require.main === module &&
  /check-release-contract\.js$/.test(process.argv[1] || "")
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
