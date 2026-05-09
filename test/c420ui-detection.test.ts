import assert from "node:assert/strict";
import test from "node:test";

import {
  boolFromC420UIDetectionValue,
  buildC420UIOverviewStatus,
  parseC420UIDetectionKeyValueLines,
  type c420uiOverviewStatus,
} from "../packages/c420ui/src/detection";

test("parseC420UIDetectionKeyValueLines parses key value lines", () => {
  assert.deepEqual(
    parseC420UIDetectionKeyValueLines("ONE=true\nTWO=value=with=equals\n"),
    { ONE: "true", TWO: "value=with=equals" },
  );
});

test("parseC420UIDetectionKeyValueLines ignores empty lines and lines without equals", () => {
  assert.deepEqual(
    parseC420UIDetectionKeyValueLines("\nONE=true\nnot-a-value\n=missing-key\n"),
    { ONE: "true" },
  );
});

test("parseC420UIDetectionKeyValueLines respects allowed keys", () => {
  assert.deepEqual(
    parseC420UIDetectionKeyValueLines("ONE=true\nTWO=false\n", ["TWO"]),
    { TWO: "false" },
  );
});

test("boolFromC420UIDetectionValue maps true and false strings", () => {
  assert.equal(boolFromC420UIDetectionValue("true"), true);
  assert.equal(boolFromC420UIDetectionValue("false"), false);
  assert.equal(boolFromC420UIDetectionValue(undefined), false);
});

test("buildC420UIOverviewStatus propagates provider status", async () => {
  const expected: c420uiOverviewStatus = {
    project: {
      version: "1.0.0",
      phase: "1.0.0",
      appId: "app.example",
      executable: "example",
      repository: "https://example.invalid/repo",
    },
    installations: { nativeSystem: true },
    warnings: ["warning"],
  };

  const actual = await buildC420UIOverviewStatus(
    {
      id: "test-provider",
      label: "Test provider",
      buildOverviewStatus(rootDir) {
        assert.equal(rootDir, "/repo");
        return expected;
      },
    },
    "/repo",
  );

  assert.equal(actual, expected);
});
