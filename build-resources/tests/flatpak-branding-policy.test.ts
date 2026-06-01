import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateFlatpakBrandingTokens } from "../canva-linux/packaging/flatpak/branding-policy";

test("fails when required branding token is missing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flatpak-branding-"));
  const filePath = path.join(dir, "file.txt");
  fs.writeFileSync(filePath, "Name=Wrong Name\n", "utf8");

  try {
    const failures = validateFlatpakBrandingTokens([[filePath, "Name=Canva Linux"]]);
    assert.equal(failures.length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
