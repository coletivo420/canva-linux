import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function wrapperSource(): string {
  return fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/rust-project-config.ts"),
    "utf8",
  );
}

test("wrapper delegates to c420ui-host project-config --json", () => {
  const source = wrapperSource();
  assert.match(source, /spawnSync\(binPath, \["project-config", "--json"\]/);
  assert.match(source, /rootDir: options\.rootDir/);
  assert.match(source, /projectConfigRoot: options\.projectConfigRoot/);
});

test("wrapper preserves diagnostics without TypeScript schema validation", () => {
  const source = wrapperSource();
  assert.match(source, /diagnostics: C420UIRustProjectDiagnostic\[\]/);
  assert.doesNotMatch(source, /validateC420UI|assertC420UI|zod|ajv|schema/i);
});

test("wrapper does not hardcode dependent project identity", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/rust-project-config.ts"),
    "utf8",
  );
  assert.doesNotMatch(source, /Canva Linux|canva-linux|io\.github\.coletivo420/);
});
