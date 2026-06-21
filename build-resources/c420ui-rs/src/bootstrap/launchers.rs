use std::fs;
use std::path::Path;

pub fn write_launchers(
    dir: &Path,
    project_config_root: &str,
    build_metadata_path: &str,
) -> Result<(), String> {
    write(dir.join("run-c420ui.mjs"), &run_c420ui())?;
    write(dir.join("run-c420ui-cli.mjs"), &run_c420ui_cli())?;
    write(
        dir.join("c420ui-builder.mjs"),
        &c420ui_builder(project_config_root, build_metadata_path),
    )?;
    Ok(())
}

fn write(path: impl AsRef<Path>, content: &str) -> Result<(), String> {
    fs::write(path.as_ref(), content)
        .map_err(|error| format!("Failed to write {}: {}", path.as_ref().display(), error))?;
    set_executable(path.as_ref())
}

#[cfg(unix)]
fn set_executable(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    let mut permissions = fs::metadata(path)
        .map_err(|error| format!("Failed to stat {}: {}", path.display(), error))?
        .permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(path, permissions)
        .map_err(|error| format!("Failed to chmod {}: {}", path.display(), error))
}

#[cfg(not(unix))]
fn set_executable(_path: &Path) -> Result<(), String> {
    Ok(())
}

const COMMON: &str = r#"import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
function findRoot() {
  let current = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Unable to locate project root");
    current = parent;
  }
}
function host(root) {
  const override = process.env.C420UI_HOST_BIN;
  if (override && fs.existsSync(override)) return override;
  for (const candidate of [
    path.join(root, "build-resources/c420ui-rs/target/debug/c420ui-host"),
    path.join(root, "build-resources/c420ui-rs/target/release/c420ui-host")
  ]) if (fs.existsSync(candidate)) return candidate;
  throw new Error("c420ui-host is missing. Run npm run build:c420ui-host.");
}
function tui(root) {
  const override = process.env.C420UI_TUI_BIN;
  if (override && fs.existsSync(override)) return override;
  for (const candidate of [
    path.join(root, "build-resources/c420ui-rs/target/debug/c420ui-tui"),
    path.join(root, "build-resources/c420ui-rs/target/release/c420ui-tui")
  ]) if (fs.existsSync(candidate)) return candidate;
  throw new Error("c420ui-tui is missing. Run npm run build:c420ui-tui.");
}
function run(command, args, input) {
  const result = spawnSync(command, args, { stdio: input ? ["pipe", "inherit", "inherit"] : "inherit", input, encoding: "utf8", shell: false });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
"#;

fn run_c420ui() -> String {
    format!(
        "{}{}",
        COMMON,
        r#"const root = findRoot();
run(tui(root), ["run", "--json-lines", ...process.argv.slice(2)]);
"#
    )
}

fn run_c420ui_cli() -> String {
    format!(
        "{}{}",
        COMMON,
        r#"const root = findRoot();
run(host(root), process.argv.slice(2));
"#
    )
}

fn c420ui_builder(project_config_root: &str, build_metadata_path: &str) -> String {
    let project_config_root = serde_json::to_string(project_config_root).unwrap();
    let build_metadata_path = serde_json::to_string(build_metadata_path).unwrap();
    format!(
        "{}{}{}{}{}{}",
        COMMON,
        r#"const root = findRoot();
const projectConfigRoot = process.env.C420UI_PROJECT_CONFIG_ROOT || "#,
        project_config_root,
        r#";
const buildMetadataPath = process.env.C420UI_BUILD_METADATA_PATH || "#,
        build_metadata_path,
        r#";
const input = `${JSON.stringify({ rootDir: root, bootstrapOutDir: "build-resources/c420ui/bootstrap/generated", projectConfigRoot, buildMetadataPath })}\n`;
run(host(root), ["bootstrap", "--json"], input);
"#
    )
}
