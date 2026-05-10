import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  checkC420UICommandDependencies,
  lookupC420UICommandInPath,
} from "../packages/c420ui/src/command-dependencies";

test("required missing command fails", () => {
  const result = checkC420UICommandDependencies(
    [{ id: "git", command: "git", required: true }],
    { lookupCommand: () => false },
  );

  assert.equal(result.status, "missing");
  assert.equal(result.dependencies?.[0]?.id, "git");
});

test("available commands pass", () => {
  assert.equal(
    checkC420UICommandDependencies([{ id: "npm", command: "npm", required: true }], {
      lookupCommand: () => true,
    }).status,
    "available",
  );
});

test("optional missing command does not fail", () => {
  const result = checkC420UICommandDependencies(
    [{ id: "optional", command: "optional", required: false }],
    { lookupCommand: () => false },
  );
  assert.equal(result.status, "available");
});

test("non-executable file does not pass on Linux/macOS", () => {
  if (process.platform === "win32") return;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-command-"));
  const commandPath = path.join(dir, "tool");
  fs.writeFileSync(commandPath, "#!/usr/bin/env sh\nexit 0\n", { mode: 0o644 });

  assert.equal(lookupC420UICommandInPath("tool", { env: { PATH: dir } }), false);
});

test("executable file passes", () => {
  if (process.platform === "win32") return;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-command-"));
  const commandPath = path.join(dir, "tool");
  fs.writeFileSync(commandPath, "#!/usr/bin/env sh\nexit 0\n", { mode: 0o755 });

  assert.equal(lookupC420UICommandInPath("tool", { env: { PATH: dir } }), true);
});
