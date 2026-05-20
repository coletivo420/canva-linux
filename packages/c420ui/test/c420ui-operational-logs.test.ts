import assert from "node:assert/strict";
import test from "node:test";

import {
  createC420UIOperationalLogEvent,
  redactC420UILogLine,
} from "../src";

test("c420ui operational logs redact password assignments", () => {
  assert.equal(redactC420UILogLine("password=abc"), "password=[redacted]");
});

test("c420ui operational logs redact token assignments", () => {
  assert.equal(redactC420UILogLine("token=abc"), "token=[redacted]");
});

test("c420ui operational logs redact api_key assignments", () => {
  assert.equal(redactC420UILogLine("api_key=abc"), "api_key=[redacted]");
});

test("c420ui operational logs redact bearer tokens", () => {
  assert.equal(
    redactC420UILogLine("Authorization: Bearer abc.def"),
    "Authorization: Bearer [redacted]",
  );
});

test("c420ui operational logs leave ordinary lines unchanged", () => {
  const line = "Wrote /home/user/project/output.log";
  assert.equal(redactC420UILogLine(line), line);
});

test("c420ui operational logs allow internal redaction opt-out", () => {
  const event = createC420UIOperationalLogEvent({
    source: "system",
    line: "password=abc Bearer abc.def",
    redact: false,
  });

  assert.equal(event.line, "password=abc Bearer abc.def");
  assert.equal(event.source, "system");
  assert.match(event.timestamp ?? "", /^\d{4}-\d{2}-\d{2}T/);
});
