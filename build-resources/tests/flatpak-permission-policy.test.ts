import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateFlatpakPermissions } from "../canva-linux/packaging/flatpak/permission-policy.js";

function withTempFile(content: string, fn: (filePath: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flatpak-permission-"));
  const filePath = path.join(dir, "manifest.yml");
  fs.writeFileSync(filePath, content, "utf8");
  try {
    fn(filePath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("fails for forbidden --filesystem=home", () => withTempFile("finish-args:\n  - --filesystem=home\n", (filePath) => {
  const result = validateFlatpakPermissions([filePath]);
  assert.equal(result.failures.some((f) => f.includes("--filesystem=home")), true);
}));

test("fails for forbidden --device=all", () => withTempFile("finish-args:\n  - --device=all\n", (filePath) => {
  const result = validateFlatpakPermissions([filePath]);
  assert.equal(result.failures.some((f) => f.includes("--device=all")), true);
}));

test("fails when required permissions are missing", () => withTempFile("finish-args:\n  - --share=network\n", (filePath) => {
  const result = validateFlatpakPermissions([filePath]);
  assert.equal(result.failures.length > 0, true);
}));

test("fails when local and flathub manifests diverge", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flatpak-parity-"));
  const localPath = path.join(dir, "local.yml");
  const flathubPath = path.join(dir, "flathub.yml");

  fs.writeFileSync(localPath, "finish-args:\n  - --share=network\n", "utf8");
  fs.writeFileSync(flathubPath, "finish-args:\n  - --socket=fallback-x11\n", "utf8");

  try {
    const result = validateFlatpakPermissions([localPath, flathubPath]);
    assert.equal(result.failures.some((f) => f.includes("mismatch detected")), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
