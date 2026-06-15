import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  runC420UIRustFixPermissions,
  runC420UIRustRemovePaths,
  runC420UIRustSudoValidate,
} from "../src/rust-maintenance.js";

function createJsonStub(body: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-rust-maintenance-"));
  const file = path.join(dir, "c420ui-host");
  fs.writeFileSync(file, `#!/usr/bin/env sh\n${body}\n`, { mode: 0o755 });
  return file;
}

test("rust remove-paths wrapper sends maintenance targets", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-rust-maintenance-root-"));
  const capture = path.join(rootDir, "input.json");
  const bin = createJsonStub(`cat > "${capture}"\nprintf '%s\\n' '{"ok":true,"command":"remove-paths","version":"0.1.0","removed":[{"target":".build","status":"planned"}]}'`);

  const result = await runC420UIRustRemovePaths({
    rootDir,
    targets: [".build"],
    dryRun: true,
    allowSudo: true,
    env: { C420UI_HOST_BIN: bin },
  });

  assert.equal(result.removed?.[0]?.status, "planned");
  assert.deepEqual(JSON.parse(fs.readFileSync(capture, "utf8")), {
    rootDir,
    targets: [".build"],
    dryRun: true,
    allowSudo: true,
  });
});

test("rust fix-permissions wrapper passes resolved user", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-rust-maintenance-root-"));
  const capture = path.join(rootDir, "input.json");
  const bin = createJsonStub(`cat > "${capture}"\nprintf '%s\\n' '{"ok":true,"command":"fix-permissions","version":"0.1.0","updated":[{"target":"dist","status":"planned"}]}'`);

  const result = await runC420UIRustFixPermissions({
    rootDir,
    targets: ["dist"],
    user: "builder",
    dryRun: true,
    env: { C420UI_HOST_BIN: bin },
  });

  assert.equal(result.updated?.[0]?.target, "dist");
  assert.deepEqual(JSON.parse(fs.readFileSync(capture, "utf8")), {
    rootDir,
    targets: ["dist"],
    user: "builder",
    group: null,
    dryRun: true,
  });
});

test("rust sudo validate wrapper returns availability", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-rust-maintenance-root-"));
  const bin = createJsonStub(`cat >/dev/null\nprintf '%s\\n' '{"ok":true,"command":"sudo-validate","version":"0.1.0","available":true}'`);

  assert.equal(
    await runC420UIRustSudoValidate({ rootDir, env: { C420UI_HOST_BIN: bin } }),
    true,
  );
});
