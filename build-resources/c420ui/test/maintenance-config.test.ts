import assert from "node:assert/strict";
import test from "node:test";
import { validateC420UIMaintenanceConfig } from "../src/maintenance-config.js";

test("maintenance config accepts relative targets", () => {
  assert.deepEqual(
    validateC420UIMaintenanceConfig({
      cleanupTargets: [".build", "dist", "build-dir"],
      permissionTargets: ["repo", ".flatpak-builder"],
    }),
    {
      cleanupTargets: [".build", "dist", "build-dir"],
      permissionTargets: ["repo", ".flatpak-builder"],
    },
  );
});

test("maintenance config rejects absolute paths", () => {
  assert.throws(
    () => validateC420UIMaintenanceConfig({ cleanupTargets: ["/tmp/build"] }),
    /safe relative path/,
  );
});

test("maintenance config rejects parent traversal", () => {
  assert.throws(
    () => validateC420UIMaintenanceConfig({ permissionTargets: ["../dist"] }),
    /must not contain \.\./,
  );
});

test("maintenance config rejects empty targets", () => {
  assert.throws(
    () => validateC420UIMaintenanceConfig({ cleanupTargets: [""] }),
    /must not be empty/,
  );
});
