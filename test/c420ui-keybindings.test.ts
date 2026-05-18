import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..");
const terminalSourceDir = path.join(rootDir, "packages/c420ui/src/terminal");
const terminalSources = fs.readdirSync(terminalSourceDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => [file, fs.readFileSync(path.join(terminalSourceDir, file), "utf8")] as const);
const appSource = terminalSources.find(([file]) => file === "app.ts")?.[1] ?? "";

test("screen does not bind F6 to plain logs", () => {
  assert.doesNotMatch(appSource, /screen\.key\(\["f6"\]/);
  assert.doesNotMatch(appSource, /plain logs/i);
});

test("plain logs mode is not referenced by c420ui terminal source", () => {
  for (const [file, source] of terminalSources) {
    assert.doesNotMatch(source, /Plain Logs|plain logs|plainLogs|plainLogsMode|showPlainLogs|isPlainLogsEnabled|setPlainLogsMode|renderPlainLogs|togglePlainLogs/, file);
  }
});

test("copy logs remains available", () => {
  assert.match(appSource, /"\{bold\}F5\{\/bold\} Copy Logs"/);
  assert.match(appSource, /screen\.key\(\["f5"\]/);
  assert.match(appSource, /copyTextToClipboard\(logHistory\.join/);
});

test("docs do not mention F6 Plain Logs as supported", () => {
  const docs = ["README.md", "CHANGELOG.md", "REVIEW.md", "docs/VALIDATION.md", "docs/internal/AI_GUARDRAILS.md", "docs/CLI.md", "docs/RELEASE.md", "docs/TECHNICAL.md"];
  for (const doc of docs) {
    const source = fs.readFileSync(path.join(rootDir, doc), "utf8");
    assert.doesNotMatch(source, /F6 Plain Logs|F6 opens.*plain logs|F6.*plain logs.*supported/i, doc);
  }
});
