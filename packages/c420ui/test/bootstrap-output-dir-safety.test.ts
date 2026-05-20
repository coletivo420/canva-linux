import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { assertSafeBootstrapOutputDir } from "../src/bootstrap-output-dir-safety";

test("rejects C420UI_BOOTSTRAP_OUT_DIR=.", () => {
  const rootDir = path.resolve("/tmp/c420ui-safety-root");
  assert.throws(
    () => assertSafeBootstrapOutputDir(rootDir, "."),
    /Refusing to clean unsafe c420ui bootstrap output directory/,
  );
});

test("rejects C420UI_BOOTSTRAP_OUT_DIR=..", () => {
  const rootDir = path.resolve("/tmp/c420ui-safety-root");
  assert.throws(
    () => assertSafeBootstrapOutputDir(rootDir, ".."),
    /Refusing to clean (unsafe c420ui bootstrap output directory|c420ui bootstrap output outside repository\/temp)/,
  );
});

test("rejects filesystem root output directory", () => {
  const rootDir = path.resolve("/tmp/c420ui-safety-root");
  assert.throws(
    () => assertSafeBootstrapOutputDir(rootDir, path.parse(rootDir).root),
    /Refusing to clean unsafe c420ui bootstrap output directory/,
  );
});

test("accepts packages/c420ui/bootstrap/generated under repository root", () => {
  const rootDir = path.resolve("/tmp/c420ui-safety-root");
  assert.doesNotThrow(() =>
    assertSafeBootstrapOutputDir(
      rootDir,
      path.join(rootDir, "packages", "c420ui", "bootstrap", "generated"),
    ),
  );
});

test("accepts tmp/c420ui-* staging directory", () => {
  const rootDir = path.resolve("/tmp/c420ui-safety-root");
  const tmpDir = path.join(os.tmpdir(), "c420ui-staging");
  assert.doesNotThrow(() => assertSafeBootstrapOutputDir(rootDir, tmpDir));
});


test("rejects invalid directory name inside repository", () => {
  const rootDir = path.resolve("/tmp/c420ui-safety-root");

  assert.throws(
    () =>
      assertSafeBootstrapOutputDir(
        rootDir,
        path.join(rootDir, "bootstrap", "other"),
      ),
    /c420ui bootstrap output must be a dedicated c420ui directory/,
  );
});
