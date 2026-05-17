import fs from "node:fs";
import path from "node:path";

type PackageJson = { version?: string };
type ProjectUiJson = {
  appId: string;
  displayVersion: string;
  executableName: string;
  phase: string;
  projectName: string;
  status: string;
  toolTitle: string;
  c420uiTitle: string;
  versionReleaseNotes: string;
};

function findProjectRoot(): string {
  let current = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Unable to locate project root");
    current = parent;
  }
}

function readJson<T>(rootDir: string, relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8")) as T;
}

function shellQuote(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function buildAppIdentity(projectUi: ProjectUiJson): string {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    `APP_ID="${shellQuote(projectUi.appId)}"`,
    `APP_NAME="${shellQuote(projectUi.projectName)}"`,
    `APP_EXECUTABLE="${shellQuote(projectUi.executableName)}"`,
    'APP_DESKTOP_NAME="${APP_ID}.desktop"',
    'APP_NATIVE_DESKTOP_NAME="${APP_ID}.native.desktop"',
    'APP_FLATPAK_DATA_DIR="${HOME}/.var/app/${APP_ID}"',
    `PROJECT_DISPLAY_VERSION="${shellQuote(projectUi.displayVersion)}"`,
    `PROJECT_STATUS="${shellQuote(projectUi.status)}"`,
    `PROJECT_PHASE="${shellQuote(projectUi.phase)}"`,
    `APP_TOOL_TITLE="${shellQuote(projectUi.toolTitle)}"`,
    `APP_TUI_TITLE="${shellQuote(projectUi.c420uiTitle)}"`,
    `APP_VERSION_RELEASE_NOTES="${shellQuote(projectUi.versionReleaseNotes)}"`,
    "",
  ].join("\n");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function upsertAppStreamRelease(rootDir: string, version: string, notes: string): void {
  const relativePath = "data/io.github.coletivo420.canva-linux.metainfo.xml";
  const filePath = path.join(rootDir, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const release = [
    `    <release version="${escapeXml(version)}" date="${today}">`,
    "      <description>",
    `        <p>${escapeXml(notes)}</p>`,
    "      </description>",
    "    </release>",
  ].join("\n");

  const releasePattern = new RegExp(
    `\\n    <release version="${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?\\n    </release>`,
  );
  if (releasePattern.test(contents)) {
    contents = contents.replace(releasePattern, `\n${release}`);
  } else {
    contents = contents.replace("  <releases>\n", `  <releases>\n${release}\n`);
  }
  fs.writeFileSync(filePath, contents);
}

function main(): void {
  const rootDir = findProjectRoot();
  const pkg = readJson<PackageJson>(rootDir, "package.json");
  const projectUi = readJson<ProjectUiJson>(rootDir, "config/canva-linux/project-ui.json");
  if (!pkg.version) throw new Error("package.json: missing version");

  fs.writeFileSync(
    path.join(rootDir, "scripts/app-identity-common.sh"),
    buildAppIdentity(projectUi),
    { mode: 0o755 },
  );
  upsertAppStreamRelease(rootDir, pkg.version, projectUi.versionReleaseNotes);
}

main();
