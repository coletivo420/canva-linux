import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("app.ts imports inputDialog", () => {
  const app = read("packages/c420ui/src/terminal/app.ts");

  assert.equal(app.includes("inputDialog"), true);
  assert.equal(app.includes('from "./modal"'), true);
});

test("app.ts passes requestRootAccess to createInteractiveActionRunner", () => {
  const app = read("packages/c420ui/src/terminal/app.ts");

  assert.equal(app.includes("requestInteractiveRootAccess"), true);
  assert.equal(app.includes("requestRootAccess:"), true);
  assert.equal(
    app.includes("rootProvider ? requestInteractiveRootAccess : undefined"),
    true,
  );
});

test("app.ts does not log submitted password", () => {
  const app = read("packages/c420ui/src/terminal/app.ts");

  assert.equal(app.includes("appendLogText(password"), false);
  assert.equal(app.includes("appendLogText(result.value"), false);
});
