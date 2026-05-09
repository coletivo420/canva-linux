import assert from "node:assert/strict";
import test from "node:test";
import { checkC420UICommandDependencies } from "../packages/c420ui/src/command-dependencies";

test("required missing command fails", () => {
  const result = checkC420UICommandDependencies(
    [{ id: "git", command: "git", required: true }],
    { lookupCommand: () => false },
  );

  assert.equal(result.status, "missing");
  assert.equal(result.dependencies?.[0]?.id, "git");
});

test("available commands pass", () => {
  assert.equal(
    checkC420UICommandDependencies([{ id: "npm", command: "npm", required: true }], {
      lookupCommand: () => true,
    }).status,
    "available",
  );
});
