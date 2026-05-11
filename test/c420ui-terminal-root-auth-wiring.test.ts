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

test("app.ts protects sudo input modal state with try/finally", () => {
  const app = read("packages/c420ui/src/terminal/app.ts");
  const sudoPromptBlock = app.match(
    /modalActive = true;[\s\S]*?inputDialog\([\s\S]*?Administrator authorization[\s\S]*?finally \{[\s\S]*?modalActive = false;[\s\S]*?\}/,
  );

  assert.notEqual(sudoPromptBlock, null);
  assert.equal(sudoPromptBlock?.[0].includes("try {"), true);
  assert.equal(sudoPromptBlock?.[0].includes("finally {"), true);
  assert.equal(sudoPromptBlock?.[0].includes("modalActive = false;"), true);
});

test("app.ts handles root validation exceptions generically", () => {
  const app = read("packages/c420ui/src/terminal/app.ts");
  const validationBlock = app.match(
    /try \{[\s\S]*?validateRootAccessWithInput\([\s\S]*?submittedInput[\s\S]*?\} catch \{[\s\S]*?Administrator authorization validation failed[\s\S]*?\} finally \{[\s\S]*?submittedInput = "";/,
  );

  assert.notEqual(validationBlock, null);
  assert.equal(app.includes("Administrator authorization validation failed"), true);
  assert.equal(app.includes("Administrator authorization failed"), true);
});

test("app.ts does not log submitted password", () => {
  const app = read("packages/c420ui/src/terminal/app.ts");

  assert.equal(
    /finally \{[\s\S]*?submittedInput = "";[\s\S]*?\}/.test(app),
    true,
  );
  assert.equal(
    /appendLogText\s*\(\s*(password|result\.value|submittedInput)\b/.test(app),
    false,
  );
  assert.equal(app.includes("console.log(submittedInput"), false);
  assert.equal(app.includes("console.error(submittedInput"), false);
  assert.equal(app.includes("writeSession(submittedInput"), false);
});
