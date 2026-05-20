import assert from "node:assert/strict";
import test from "node:test";
import { checkC420UINodeDependency } from "../src/node-dependencies";

test("Node >= minimum passes", () => {
  assert.equal(
    checkC420UINodeDependency({ minimumMajor: 22, required: true }, { nodeVersion: "22.1.0" }).status,
    "available",
  );
});

test("Node below minimum fails", () => {
  const result = checkC420UINodeDependency(
    { minimumMajor: 22, required: true },
    { nodeVersion: "20.9.0" },
  );
  assert.equal(result.status, "failed");
  assert.match(result.message ?? "", /22/);
});
