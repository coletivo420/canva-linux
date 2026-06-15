import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runC420UIRustHost } from "../src/rust-host.js";

function makeRustHostStub(source: string): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-rust-host-test-"));
  const binPath = path.join(rootDir, "c420ui-host");
  fs.writeFileSync(binPath, `#!/bin/sh\n${source}`);
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

test("locates binary via C420UI_HOST_BIN", async () => {
  const binPath = makeRustHostStub(`
cat >/dev/null
printf '%s' '{"ok":true,"command":"host-info","version":"0.1.0"}'
`);

  const result = await runC420UIRustHost<{ command: string }>({
    rootDir: process.cwd(),
    command: "host-info",
    env: { C420UI_HOST_BIN: binPath },
  });

  assert.equal(result.command, "host-info");
});

test("fails clearly when binary is missing", async () => {
  await assert.rejects(
    () =>
      runC420UIRustHost({
        rootDir: process.cwd(),
        command: "doctor",
        env: { C420UI_HOST_BIN: "/tmp/definitely-missing-c420ui-host" },
      }),
    /c420ui Rust host is missing\. Run npm run build:c420ui-rs\./,
  );
});

test("sends JSON through stdin and parses JSON stdout", async () => {
  const capturePath = path.join(os.tmpdir(), `c420ui-rust-host-input-${process.pid}.json`);
  const binPath = makeRustHostStub(`
cat > ${JSON.stringify(capturePath)}
printf '%s' '{"ok":true,"command":"check-host-dependencies"}'
`);

  const result = await runC420UIRustHost<{ command: string }>({
    rootDir: process.cwd(),
    command: "check-host-dependencies",
    input: { value: 42 },
    env: { C420UI_HOST_BIN: binPath },
  });

  assert.equal(result.command, "check-host-dependencies");
  assert.deepEqual(JSON.parse(fs.readFileSync(capturePath, "utf8")), { value: 42 });
});

test("rejects invalid JSON", async () => {
  const binPath = makeRustHostStub(`
cat >/dev/null
printf '%s' 'not-json'
`);

  await assert.rejects(
    () =>
      runC420UIRustHost({
        rootDir: process.cwd(),
        command: "doctor",
        env: { C420UI_HOST_BIN: binPath },
      }),
    /Failed to parse c420ui-host output as JSON/,
  );
});

test("applies timeout", async () => {
  const binPath = makeRustHostStub(`
while true; do :; done
`);

  await assert.rejects(
    () =>
      runC420UIRustHost({
        rootDir: process.cwd(),
        command: "doctor",
        timeoutMs: 10,
        env: { C420UI_HOST_BIN: binPath },
      }),
    /timed out/,
  );
});

test("does not pass full process.env", async () => {
  const binPath = makeRustHostStub(`
cat >/dev/null
printf '{"ok":true,"secret":%s}' "$(if [ -n "$C420UI_SECRET_SHOULD_NOT_PASS" ]; then printf '"%s"' "$C420UI_SECRET_SHOULD_NOT_PASS"; else printf 'null'; fi)"
`);

  const result = await runC420UIRustHost<{ secret: string | null }>({
    rootDir: process.cwd(),
    command: "doctor",
    env: {
      C420UI_HOST_BIN: binPath,
      PATH: process.env.PATH,
      C420UI_SECRET_SHOULD_NOT_PASS: "secret",
    },
  });

  assert.equal(result.secret, null);
});
