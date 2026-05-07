import assert from "node:assert/strict";
import test from "node:test";

import {
  actionHasUserScope,
  buildActionEnvironment,
  main,
  PLANNED_ACTION_EXIT_CODE,
  validateRootPolicy,
} from "../scripts/core/action-runner";
import type { CanvaAction } from "../scripts/core/action-registry";

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

const baseCommandAction: CanvaAction = {
  id: "test-action",
  label: "Test action",
  group: "development",
  section: "Validation",
  kind: "command",
  command: "node",
  args: ["--version"],
};

test("action environment overlays registry env on top of process env", () => {
  const env = buildActionEnvironment(
    {
      ...baseCommandAction,
      env: { CANVA_NATIVE_SCOPE: "user", KEEP_ME: "registry" },
    },
    { KEEP_ME: "base", BASE_ONLY: "1" },
  );

  assert.equal(env.KEEP_ME, "registry");
  assert.equal(env.BASE_ONLY, "1");
  assert.equal(env.CANVA_NATIVE_SCOPE, "user");
});

test("root policy rejects requiresRoot actions in user scope", () => {
  const action: CanvaAction = {
    ...baseCommandAction,
    requiresRoot: true,
    scope: "user",
    env: { CANVA_NATIVE_SCOPE: "user" },
  };

  assert.equal(actionHasUserScope(action), true);
  assert.match(
    validateRootPolicy(action),
    /requiresRoot=true cannot be combined with user scope/,
  );
});

test("root policy accepts system-scope requiresRoot actions", () => {
  const action: CanvaAction = {
    ...baseCommandAction,
    requiresRoot: true,
    scope: "system",
    env: { CANVA_NATIVE_SCOPE: "system" },
  };

  assert.equal(actionHasUserScope(action), false);
  assert.equal(validateRootPolicy(action), null);
});
