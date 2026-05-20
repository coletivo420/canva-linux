import assert from "node:assert/strict";
import test from "node:test";

import {
  createC420UIRootLaunchGuardMessage,
  enforceC420UIRootLaunchGuard,
  isC420UIRootLaunch,
} from "../src/terminal/root-guard";

test("isC420UIRootLaunch returns true for uid 0", () => {
  assert.equal(isC420UIRootLaunch(() => 0), true);
});

test("isC420UIRootLaunch returns false for a regular user uid", () => {
  assert.equal(isC420UIRootLaunch(() => 1000), false);
});

test("createC420UIRootLaunchGuardMessage uses the project name without hardcoding a project", () => {
  const message = createC420UIRootLaunchGuardMessage("Example Project");

  assert.match(message, /Example Project Install and Development Tool/);
  assert.match(message, /administrator privileges/);
  assert.doesNotMatch(message, /Canva Linux/);
});

test("enforceC420UIRootLaunchGuard writes the message and exits for root launches", () => {
  const messages: string[] = [];
  let exitCode: number | undefined;

  assert.throws(
    () =>
      enforceC420UIRootLaunchGuard({
        projectName: "Example Project",
        getuid: () => 0,
        writeError(message) {
          messages.push(message);
        },
        exit(code) {
          exitCode = code;
          throw new Error("exit");
        },
      }),
    /exit/,
  );

  assert.equal(exitCode, 1);
  assert.equal(messages.length, 1);
  assert.match(messages[0] ?? "", /Example Project/);
});

test("enforceC420UIRootLaunchGuard does not exit for non-root launches", () => {
  let exitCalled = false;

  enforceC420UIRootLaunchGuard({
    projectName: "Example Project",
    getuid: () => 1000,
    exit(code) {
      exitCalled = true;
      throw new Error(`unexpected exit ${code}`);
    },
  });

  assert.equal(exitCalled, false);
});
