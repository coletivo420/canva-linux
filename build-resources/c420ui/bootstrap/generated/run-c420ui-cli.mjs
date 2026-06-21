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
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
const root = findRoot();
run(host(root), process.argv.slice(2));
