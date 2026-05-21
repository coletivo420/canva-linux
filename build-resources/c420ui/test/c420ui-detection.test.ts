import assert from "node:assert/strict";
import test from "node:test";

import {
  boolFromC420UIDetectionValue,
  buildC420UIOverviewStatus,
  parseC420UIDetectionKeyValueLines,
  runC420UIDetectionProbes,
  type c420uiOverviewStatus,
} from "../src/detection";

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


test("runC420UIDetectionProbes merges values from multiple probes", async () => {
  const result = await runC420UIDetectionProbes(
    [
      {
        id: "one",
        label: "One",
        run() {
          return { ok: true, values: { ONE: "1" } };
        },
      },
      {
        id: "two",
        label: "Two",
        run() {
          return { ok: true, values: { TWO: "2" } };
        },
      },
    ],
    "/repo",
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.values, { ONE: "1", TWO: "2" });
});

test("runC420UIDetectionProbes collects warnings", async () => {
  const result = await runC420UIDetectionProbes(
    [
      {
        id: "warn",
        label: "Warning probe",
        run() {
          return { ok: true, values: {}, warnings: ["probe warning"] };
        },
      },
    ],
    "/repo",
  );

  assert.deepEqual(result.warnings, ["probe warning"]);
});

test("runC420UIDetectionProbes converts thrown probe errors into warnings", async () => {
  const result = await runC420UIDetectionProbes(
    [
      {
        id: "throws",
        label: "Throwing probe",
        run() {
          throw new Error("boom");
        },
      },
    ],
    "/repo",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.values, {});
  assert.deepEqual(result.warnings, ["throws: boom"]);
});

test("runC420UIDetectionProbes returns ok false when a probe fails", async () => {
  const result = await runC420UIDetectionProbes(
    [
      {
        id: "fails",
        label: "Failing probe",
        run() {
          return { ok: false, values: { PARTIAL: "1" } };
        },
      },
    ],
    "/repo",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.values, { PARTIAL: "1" });
});
