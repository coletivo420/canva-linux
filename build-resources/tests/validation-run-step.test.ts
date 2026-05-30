import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runStep } from "../../scripts/canva-linux/validation/run-step";

test("run-step preserves exit status", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "run-step-"));
  const script = path.join(dir, "exit3.sh");
  fs.writeFileSync(script, "#!/usr/bin/env bash\nexit 3\n", "utf8");
  fs.chmodSync(script, 0o755);

  try {
    const result = runStep("exit3", "bash", [script], process.cwd());
    assert.equal(result.ok, false);
    assert.equal(result.status, 3);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
