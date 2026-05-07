import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";

test("launcher shell syntax is valid", () => {
  const result = spawnSync("bash", ["-n", "canva-linux.sh"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
});
