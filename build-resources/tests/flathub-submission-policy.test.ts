import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateGeneratedSources } from "../canva-linux/packaging/flathub/policy/generated-sources-policy";

test("fails when generated-sources has no sources", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flathub-sources-"));
  const filePath = path.join(dir, "generated-sources.json");
  fs.writeFileSync(filePath, JSON.stringify({}), "utf8");

  try {
    const failures = validateGeneratedSources(filePath);
    assert.equal(failures.some((f) => f.includes("no npm sources")), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("fails when generated-sources has no npm registry source", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flathub-npm-"));
  const filePath = path.join(dir, "generated-sources.json");
  fs.writeFileSync(filePath, JSON.stringify({ sources: [{ url: "https://example.com/a.tgz" }] }), "utf8");

  try {
    const failures = validateGeneratedSources(filePath);
    assert.equal(failures.some((f) => f.includes("npm registry sources")), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
