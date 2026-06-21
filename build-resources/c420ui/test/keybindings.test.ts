import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.env.CANVA_TEST_REPO_ROOT || process.cwd();
const terminalSourceDir = path.join(rootDir, "build-resources/c420ui/src/terminal");
const terminalSources = fs.readdirSync(terminalSourceDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => [file, fs.readFileSync(path.join(terminalSourceDir, file), "utf8")] as const);
const rustContractsSource = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/rust-tui-contracts.ts"), "utf8");
const rustRunnerSource = fs.readFileSync(path.join(rootDir, "build-resources/c420ui/src/rust-tui-runner.ts"), "utf8");
const rustInputSource = fs.readFileSync(path.join(rootDir, "build-resources/c420ui-rs/src/tui/input.rs"), "utf8");

test("Rust TUI input does not bind F6 to plain logs", () => {
  assert.doesNotMatch(rustInputSource, /F\(6\)|f6/i);
  assert.doesNotMatch(rustContractsSource, /plain logs/i);
});

test("plain logs mode is not referenced by c420ui terminal source", () => {
  for (const [file, source] of terminalSources) {
    assert.doesNotMatch(source, /Plain Logs|plain logs|plainLogs|plainLogsMode|showPlainLogs|isPlainLogsEnabled|setPlainLogsMode|renderPlainLogs|togglePlainLogs/, file);
  }
});

test("copy logs remains available", () => {
  assert.match(rustContractsSource, /F5 Copy Logs/);
  assert.match(rustInputSource, /KeyCode::F\(5\)/);
  assert.match(rustRunnerSource, /event\.event === "copy-logs"/);
  assert.match(rustRunnerSource, /copyTextToClipboard\(collectLogCopyText\(logHistory, sessionLogPath\)\)/);
});

test("docs do not mention F6 Plain Logs as supported", () => {
  const docs = ["README.md", "CHANGELOG.md", "REVIEW.md", "docs/VALIDATION.md", "docs/internal/AI_GUARDRAILS.md", "docs/CLI.md", "docs/RELEASE.md", "docs/TECHNICAL.md"];
  for (const doc of docs) {
    const source = fs.readFileSync(path.join(rootDir, doc), "utf8");
    assert.doesNotMatch(source, /F6 Plain Logs|F6 opens.*plain logs|F6.*plain logs.*supported/i, doc);
  }
});
