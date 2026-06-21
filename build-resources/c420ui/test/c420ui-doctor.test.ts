import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("doctor source script exists and delegates host checks to c420ui-host", () => {
  const sourcePath = "build-resources/c420ui/scripts/doctor.ts";
  const source = fs.readFileSync(sourcePath, "utf8");

  assert.match(source, /c420ui-host/);
  assert.match(source, /runHostJson\(binary, "host-info"\)/);
  assert.match(source, /runHostJson\(binary, "doctor"\)/);
  assert.match(source, /runHostJson\(binary, "check-host-dependencies"/);
  assert.doesNotMatch(source, /runDoctorValidation/);
});

test("doctor source uses c420ui-host directly without bash or legacy sync runners", () => {
  const source = fs.readFileSync("build-resources/c420ui/scripts/doctor.ts", "utf8");

  assert.match(source, /spawn\(binary, \[command, "--json"\]/);
  assert.match(source, /shell: false/);
  assert.doesNotMatch(source, /spawnSync/);
  assert.doesNotMatch(source, /execSync/);
  assert.doesNotMatch(source, /\/bin\/bash|bash -lc|sh -c/);
});

test("doctor output differentiates ok, warning and error levels", () => {
  const source = fs.readFileSync("build-resources/c420ui/scripts/doctor.ts", "utf8");

  assert.match(source, /\[ok\]/);
  assert.match(source, /\[warning\]/);
  assert.match(source, /\[error\]/);
  assert.match(source, /envelope\.data\.status === "missing"/);
});

test("doctor action targets the generated c420ui doctor script", () => {
  const actions = fs.readFileSync(
    "build-resources/canva-linux/config/actions.json",
    "utf8",
  );

  assert.match(actions, /"id": "doctor"/);
  assert.match(actions, /"label": "Doctor \/ check host tools"/);
  assert.match(actions, /"\.build\/scripts\/doctor\.mjs"/);
  assert.doesNotMatch(actions, /"id": "doctor"[\s\S]{0,240}"kind": "planned"/);
});

test("build scripts generate doctor.mjs from c420ui source", () => {
  const packageJson = fs.readFileSync("package.json", "utf8");

  assert.match(packageJson, /build-resources\/c420ui\/scripts\/doctor\.ts/);
  assert.doesNotMatch(packageJson, /build-resources\/canva-linux\/scripts\/doctor\.ts/);
});
