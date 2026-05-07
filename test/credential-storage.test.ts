// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  createCredentialStoragePolicy,
  resolveCredentialStoragePolicy,
} = loadRuntimeModule("main/credential-storage");

test("basic_text Linux credential backend uses an ephemeral non-persist partition", () => {
  const policy = createCredentialStoragePolicy({
    backend: "basic_text",
    platform: "linux",
  });

  assert.equal(policy.mode, "ephemeral");
  assert.equal(policy.security, "insecure-basic-text");
  assert.equal(policy.partition, "canva-ephemeral");
  assert.equal(policy.partition.startsWith("persist:"), false);
  assert.equal(policy.cache, false);
  assert.equal(policy.persistentLoginAvailable, false);
  assert.match(policy.warning, /credentials, cookies and login state will not be saved/);
});

test("secure Linux credential backends keep the persistent Canva partition", () => {
  for (const backend of ["kwallet", "kwallet5", "kwallet6", "gnome_libsecret"]) {
    const policy = createCredentialStoragePolicy({ backend, platform: "linux" });

    assert.equal(policy.mode, "persistent");
    assert.equal(policy.security, "secure");
    assert.equal(policy.partition, "persist:canva");
    assert.equal(policy.cache, true);
    assert.equal(policy.persistentLoginAvailable, true);
    assert.equal(policy.warning, null);
  }
});

test("unknown Linux credential backend and detection errors are ephemeral by caution", () => {
  const unknownPolicy = createCredentialStoragePolicy({
    backend: "unknown",
    platform: "linux",
  });
  const errorPolicy = resolveCredentialStoragePolicy({
    platform: "linux",
    safeStorage: {
      getSelectedStorageBackend() {
        throw new Error("no dbus");
      },
    },
  });

  assert.equal(unknownPolicy.mode, "ephemeral");
  assert.equal(unknownPolicy.security, "unknown");
  assert.equal(errorPolicy.mode, "ephemeral");
  assert.equal(errorPolicy.security, "unknown");
  assert.equal(errorPolicy.partition, "canva-ephemeral");
  assert.equal(errorPolicy.cache, false);
});

test("non-Linux platforms use the platform default persistent policy", () => {
  const policy = createCredentialStoragePolicy({
    backend: "basic_text",
    platform: "darwin",
  });

  assert.equal(policy.backend, "platform-default");
  assert.equal(policy.mode, "persistent");
  assert.equal(policy.security, "unsupported-platform");
  assert.equal(policy.partition, "persist:canva");
  assert.equal(policy.cache, true);
  assert.equal(policy.persistentLoginAvailable, true);
});
