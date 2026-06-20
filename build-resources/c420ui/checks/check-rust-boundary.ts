#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const forbiddenFragments = [
  "Canva Linux",
  "canva-linux",
  "io.github.coletivo420.canva-linux",
  "io.github",
  "build-resources/electron",
  "build-resources/canva-linux",
  "build-resources/canva-linux/c420ui-adapter",
  "CLeyedropper",
  "toolbar",
  "Electron runtime",
  "Flatpak policy",
  "AppImage policy",
  "productName",
  "package:appimage",
  "package:flatpak-bundle",
];

function collectRustFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "target") return [];
    if (entry.name === "Cargo.lock") return [];
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectRustFiles(entryPath);
    }
    if (entry.isFile()) {
      if (/\.(rs|toml|md)$/.test(entry.name)) return [entryPath];
      return [];
    }
    return [];
  });
}

export function main(): number {
  const rootDir = process.cwd();
  const rustDir = path.join(rootDir, "build-resources/c420ui-rs");
  const files = collectRustFiles(rustDir);
  const failures: string[] = [];

  for (const file of files) {
    const relativePath = path.relative(rootDir, file).replace(/\\/g, "/");
    const source = fs.readFileSync(file, "utf8");
    for (const fragment of forbiddenFragments) {
      if (source.includes(fragment)) {
        failures.push(`${relativePath}: Rust boundary must not contain dependent-project fragment: "${fragment}"`);
      }
    }
  }

  const requiredRustFiles = [
    "src/project/mod.rs",
    "src/project/config.rs",
    "src/project/actions.rs",
    "src/project/dependencies.rs",
    "src/project/install.rs",
    "src/project/maintenance.rs",
    "src/project/ui.rs",
    "src/project/validation.rs",
    "src/commands/project_config.rs",
    "src/commands/status_panels.rs",
    "src/status/mod.rs",
    "src/status/contracts.rs",
    "src/status/detection.rs",
    "src/status/artifacts.rs",
    "src/status/overview.rs",
    "src/status/panels.rs",
    "src/status/classify.rs",
  ];
  for (const required of requiredRustFiles) {
    if (!fs.existsSync(path.join(rustDir, required))) {
      failures.push(`build-resources/c420ui-rs/${required}: required Rust project config boundary file is missing`);
    }
  }

  const hostSourcePath = path.join(rustDir, "src/bin/c420ui-host.rs");
  const hostSource = fs.readFileSync(hostSourcePath, "utf8");
  if (
    !hostSource.includes("project-config --json")
    || !hostSource.includes("commands::project_config::execute")
  ) {
    failures.push(
      "build-resources/c420ui-rs/src/bin/c420ui-host.rs: c420ui-host must expose project-config --json",
    );
  }
  if (
    !hostSource.includes("status-panels --json")
    || !hostSource.includes("commands::status_panels::execute")
  ) {
    failures.push(
      "build-resources/c420ui-rs/src/bin/c420ui-host.rs: c420ui-host must expose status-panels --json",
    );
  }

  const actionContracts = fs.readFileSync(path.join(rustDir, "src/action/contracts.rs"), "utf8");
  const actionEngine = fs.readFileSync(path.join(rustDir, "src/action/engine.rs"), "utf8");
  if (!actionContracts.includes("project_config_root")) {
    failures.push("build-resources/c420ui-rs/src/action/contracts.rs: action-run must accept projectConfigRoot");
  }
  if (!actionEngine.includes("load_project_config") || !actionEngine.includes("project_config_root")) {
    failures.push("build-resources/c420ui-rs/src/action/engine.rs: Action Engine must prefer projectConfigRoot");
  }

  const statusPanels = fs.readFileSync(path.join(rustDir, "src/status/panels.rs"), "utf8");
  const statusOverview = fs.readFileSync(path.join(rustDir, "src/status/overview.rs"), "utf8");
  const tuiWidgets = fs.readFileSync(path.join(rustDir, "src/tui/widgets.rs"), "utf8");
  if (!statusPanels.includes("build_status_panels")) {
    failures.push("build-resources/c420ui-rs/src/status/panels.rs: Rust must generate semantic status panels");
  }
  if (statusOverview.includes("Electron, Node, npm")) {
    failures.push("build-resources/c420ui-rs/src/status/overview.rs: Linux Artifacts must not be one comma-joined runtime line");
  }
  if (!tuiWidgets.includes("styled_semantic_status_line") || !tuiWidgets.includes("status_state_style")) {
    failures.push("build-resources/c420ui-rs/src/tui/widgets.rs: status renderer must color semantic values by state");
  }

  if (failures.length) {
    console.error("[check-rust-boundary] FAILED:\n" + failures.join("\n"));
    return 1;
  }

  console.log("[check-rust-boundary] OK");
  return 0;
}

if (/check-rust-boundary\.(mjs|js|ts)$/.test(process.argv[1] || "")) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[check-rust-boundary] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
