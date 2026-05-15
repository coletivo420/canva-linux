import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";

const helperPath = "packages/c420ui/host/linux/sudo-helper.sh";

function readHelper(): string {
  return fs.readFileSync(helperPath, "utf8");
}

test("c420ui sudo helper file contract", () => {
  assert.equal(fs.existsSync(helperPath), true);
  const source = readHelper();

  assert.equal(source.startsWith("#!/usr/bin/env bash\n"), true);
  assert.equal(source.includes("set -euo pipefail"), true);
  for (const fragment of [
    "c420ui_sudo_validate",
    "c420ui_sudo_validate_stdin",
    "c420ui_sudo()",
    "--validate)",
    "--validate-stdin)",
    "C420UI_ROOT_AUTH",
    "C420UI_ACTION_SCOPE",
    "C420UI_SUDO_TIMEOUT_SECONDS",
  ]) {
    assert.equal(source.includes(fragment), true, `missing ${fragment}`);
  }

  for (const forbidden of [
    "CANVA_",
    "canva_",
    "Canva Linux",
    "scripts/" + "sudo-common.sh",
  ]) {
    assert.equal(source.includes(forbidden), false, `forbidden ${forbidden}`);
  }
});

test("c420ui sudo helper parses and prints usage without arguments", () => {
  const syntax = spawnSync("bash", ["-n", helperPath], { encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr);

  const usage = spawnSync("bash", [helperPath], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /Usage:/);
});
