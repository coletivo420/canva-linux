import assert from "node:assert/strict";
import test from "node:test";

import { main, PLANNED_ACTION_EXIT_CODE } from "../scripts/core/action-runner";

type CapturedConsole = {
  stderr: string[];
  stdout: string[];
};

function captureConsole(fn: () => number): CapturedConsole & { code: number } {
  const originalError = console.error;
  const originalLog = console.log;
  const captured: CapturedConsole = { stderr: [], stdout: [] };

  try {
    console.error = (...args: unknown[]) => {
      captured.stderr.push(args.map(String).join(" "));
    };
    console.log = (...args: unknown[]) => {
      captured.stdout.push(args.map(String).join(" "));
    };

    return { ...captured, code: fn() };
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
}

test("planned CLI actions exit with the planned-action code", () => {
  for (const flag of ["--bundle-deb", "--bundle-rpm", "--prepare-aur"]) {
    const result = captureConsole(() => main(["--cli", flag]));

    assert.equal(result.code, PLANNED_ACTION_EXIT_CODE, flag);
    assert.equal(result.stdout.join("\n"), "");
    assert.match(result.stderr.join("\n"), /\[planned\]/);
    assert.match(result.stderr.join("\n"), /not executable in this phase/);
  }
});

test("dry-run keeps planned CLI actions metadata-only and successful", () => {
  for (const flag of ["--bundle-deb", "--bundle-rpm", "--prepare-aur"]) {
    const result = captureConsole(() => main(["--cli", flag, "--dry-run"]));

    assert.equal(result.code, 0, flag);
    assert.equal(result.stderr.join("\n"), "");
    assert.match(result.stdout.join("\n"), /Command:\n\s+\(planned\)/);
  }
});
