import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runnerPath = "build-resources/c420ui/src/rust-tui-runner.ts";

function readRunnerSource(): string {
  return fs.readFileSync(runnerPath, "utf8");
}

test("default session log path is /tmp/c420ui/tool-session.log", () => {
  const source = readRunnerSource();

  assert.match(source, /path\.join\("\/tmp", "c420ui", "tool-session\.log"\)/);
});

test("fallback session log path is ~/.tmp/c420ui/tool-session.log", () => {
  const source = readRunnerSource();

  assert.match(source, /env\?\.HOME \|\| process\.env\.HOME \|\| "\."/);
  assert.match(source, /"\.tmp",\s*"c420ui",\s*"tool-session\.log"/);
});

test("session log path does not include dependent project namespace by default", () => {
  const source = readRunnerSource();
  const legacyStatePathFragment = ['".local"', '"state"'].join(", ");
  const legacyStateDirectoryFragment = ["stateDirectoryName", '"tool-session.log"'].join(", ");
  const dependentProjectLogFragment = ['"canva-linux"', '"tool-session.log"'].join(", ");

  assert.equal(source.includes(legacyStatePathFragment), false);
  assert.equal(source.includes(legacyStateDirectoryFragment), false);
  assert.equal(source.includes(dependentProjectLogFragment), false);
});

test("copy logs reads from the c420ui session log path", () => {
  const source = readRunnerSource();

  assert.match(source, /collectLogCopyText\(logHistory, sessionLogPath\)/);
  assert.match(source, /fs\.readFileSync\(sessionLogPath, "utf8"\)/);
});
