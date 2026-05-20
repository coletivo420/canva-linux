import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");

test("Flatpak bundle reuse path does not write checkout metadata sidecar blindly", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "packages/c420ui/scripts/build-flatpak-bundle.sh"),
    "utf8",
  );

  assert.match(source, /USE_EXISTING_REPO/);
  assert.match(source, /extract_flatpak_repo_build_metadata/);
  assert.match(source, /\/files\/share\/canva-linux\/version/);
  assert.match(source, /write_build_metadata_sidecar_from_source/);
  assert.match(source, /sidecar was not generated to avoid stale checkout metadata/);
});
