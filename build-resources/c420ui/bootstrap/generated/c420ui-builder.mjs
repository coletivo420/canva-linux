import { spawnSync } from "node:child_process";
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
  if (result.error && result.status === null) throw result.error;
  process.exit(result.status ?? 1);
}
const root = findRoot();
const projectConfigRoot = process.env.C420UI_PROJECT_CONFIG_ROOT || "build-resources/canva-linux/config";
const launcherName = path.basename(process.argv[1] || "c420ui-builder");
const title = "Project Builder powered by c420ui";
const globalFlags = new Set(["-y", "--yes", "--dry-run"]);
const runtimeValueOptions = ["--canva-debug", "--credential-store", "--gpu-backend"];
const runtimeBooleanOptions = ["--force-x11", "--force-wayland", "--disable-wayland-color-manager"];
function readJson(relativePath) {
  try { return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8")); } catch { return {}; }
}
function help() {
  const project = readJson("package.json");
  const c420ui = readJson("build-resources/c420ui/package.json");
  return `${title}

Project:
  ${project.name || "dependent project"} ${project.version || "unknown"}

Builder:
  ${c420ui.name || "c420ui"} ${c420ui.version || "unknown"}

Usage:
  ${launcherName}
  ${launcherName} [direct action] [--yes] [--dry-run]

This builder opens the c420ui install and development workspace by default.

Builder options:
  -y, --yes
  --force                       Alias for --yes
  -h, --help
  --dry-run

Runtime options belong to the dependent project runtime app:
  use the dependent project runtime help`;
}
function isRuntimeOnly(arg) {
  return runtimeBooleanOptions.includes(arg) || runtimeValueOptions.some((option) => arg === option || arg.startsWith(`${option}=`));
}
function parse(argv) {
  const parsed = { help: false, bridgeArgs: [], actionFlag: null, dryRun: false, yes: false };
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") { parsed.help = true; continue; }
    if (arg === "--debug" || arg.startsWith("--debug=")) throw new Error("--debug is reserved by Electron/Node. Use the dependent project runtime debug flag.");
    if (isRuntimeOnly(arg)) throw new Error(`${arg} is a dependent project runtime option.`);
    if (arg === "--force") { parsed.yes = true; parsed.bridgeArgs.push("--yes"); continue; }
    if (globalFlags.has(arg)) {
      if (arg === "--dry-run") parsed.dryRun = true;
      if (arg === "-y" || arg === "--yes") parsed.yes = true;
      parsed.bridgeArgs.push(arg);
      continue;
    }
    if (arg.startsWith("--") && parsed.actionFlag === null) { parsed.actionFlag = arg; parsed.bridgeArgs.push(arg); continue; }
    throw new Error(`Unsupported builder argument: ${arg}`);
  }
  if (parsed.actionFlag === null && parsed.bridgeArgs.length > 0) throw new Error("No direct action was provided.");
  return parsed;
}
function assertNonRoot() {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    throw new Error(`Do not run ${title} with sudo or as root.

Run this builder as your regular user. When an operation needs administrator privileges, the dependent project asks for authentication only for that specific action.

Running the whole builder as root may break file ownership, user sessions, build artifacts and desktop integration.`);
  }
}
function actionInput(parsed) {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) if (typeof value === "string") env[key] = value;
  return `${JSON.stringify({ rootDir: root, projectConfigRoot, actionId: parsed.actionFlag, cliFlag: parsed.actionFlag, dryRun: parsed.dryRun, yes: parsed.yes, env })}\n`;
}
try {
  const parsed = parse(process.argv.slice(2));
  if (parsed.help) {
    console.log(help());
    process.exit(0);
  }
  assertNonRoot();
  if (parsed.actionFlag) {
    run(host(root), ["action-run", "--json-lines"], actionInput(parsed));
  } else {
    run(tui(root), ["run", "--json-lines"]);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
