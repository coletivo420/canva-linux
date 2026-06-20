import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { copyTextToClipboardWithRust } from "../src/rust-clipboard.js";

function makeRustHostStub(source: string): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-rust-clipboard-"));
  const binPath = path.join(rootDir, "c420ui-host");
  fs.writeFileSync(binPath, `#!/bin/sh\n${source}`);
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

test("copyTextToClipboardWithRust calls c420ui-host clipboard-write --json", async () => {
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-clipboard-capture-"));
  const argsPath = path.join(captureDir, "args.txt");
  const inputPath = path.join(captureDir, "input.json");
  const binPath = makeRustHostStub(`
printf '%s' "$*" > ${JSON.stringify(argsPath)}
cat > ${JSON.stringify(inputPath)}
printf '%s' '{"ok":true,"command":"clipboard-write","backend":"wl-copy","message":"Logs copied to clipboard via wl-copy."}'
`);

  const result = await copyTextToClipboardWithRust({
    text: "logs",
    rootDir: process.cwd(),
    env: {
      C420UI_HOST_BIN: binPath,
      PATH: process.env.PATH,
      WAYLAND_DISPLAY: "wayland-0",
      DISPLAY: ":0",
      XDG_CURRENT_DESKTOP: "KDE",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.backend, "wl-copy");
  assert.equal(fs.readFileSync(argsPath, "utf8"), "clipboard-write --json");
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  assert.equal(input.text, "logs");
  assert.deepEqual(input.preferredBackends, ["wayland", "kde", "gnome", "x11"]);
  assert.equal(input.env.WAYLAND_DISPLAY, "wayland-0");
});

test("copyTextToClipboardWithRust skips Rust for empty text", async () => {
  const result = await copyTextToClipboardWithRust({
    text: " ",
    rootDir: process.cwd(),
    env: { C420UI_HOST_BIN: "/tmp/does-not-need-to-exist" },
  });

  assert.deepEqual(result, {
    ok: false,
    message: "No logs to copy.",
    backend: null,
  });
});

test("copyTextToClipboardWithRust parses failure JSON", async () => {
  const binPath = makeRustHostStub(`
cat >/dev/null
printf '%s' '{"ok":false,"command":"clipboard-write","backend":null,"message":"No clipboard tool found."}'
`);

  const result = await copyTextToClipboardWithRust({
    text: "logs",
    rootDir: process.cwd(),
    env: { C420UI_HOST_BIN: binPath, PATH: process.env.PATH },
  });

  assert.equal(result.ok, false);
  assert.equal(result.backend, null);
  assert.equal(result.message, "No clipboard tool found.");
});

test("copyTextToClipboardWithRust redacts process stderr from errors", async () => {
  const binPath = makeRustHostStub(`
cat >/dev/null
printf '%s' 'copied secret text' >&2
exit 1
`);

  const result = await copyTextToClipboardWithRust({
    text: "copied secret text",
    rootDir: process.cwd(),
    env: { C420UI_HOST_BIN: binPath, PATH: process.env.PATH },
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /Clipboard operation failed:/);
  assert.doesNotMatch(result.message, /copied secret text/);
});

test("terminal clipboard delegates to rust clipboard without shell probing", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/terminal/clipboard.ts"),
    "utf8",
  );

  assert.match(source, /copyTextToClipboardWithRust/);
  assert.doesNotMatch(source, /node:child_process/);
  assert.doesNotMatch(source, /spawnSync/);
  assert.doesNotMatch(source, /bash/);
  assert.doesNotMatch(source, /command -v/);
  assert.doesNotMatch(source, /wl-copy|qdbus|gpaste|xclip|xsel/);
});
