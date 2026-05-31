import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { runDoctorValidation } from "../../build-resources/canva-linux/validation/doctor";

test("doctor source enforces Node >=22 requirement", () => {
  const source = fs.readFileSync("build-resources/canva-linux/validation/doctor.ts", "utf8");
  assert.match(source, /major\(process\.versions\.node\) < 22/);
});

test("doctor keeps flatpak and appstreamcli as warnings", () => {
  const source = fs.readFileSync("build-resources/canva-linux/validation/doctor.ts", "utf8");
  assert.match(source, /\["flatpak", "Flatpak Install/);
  assert.match(source, /\["appstreamcli", "AppStream validation will not work"\]/);
  const result = runDoctorValidation({ rootDir: process.cwd() });
  assert.equal(typeof result.ok, "boolean");
});
