// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  createCredentialStoragePolicy,
  resolveCredentialStoragePolicy,
} = loadRuntimeModule("main/credential-storage");

const SECURE_BACKENDS = [
  "kwallet",
  "kwallet5",
  "kwallet6",
  "gnome_libsecret",
];

for (const backend of SECURE_BACKENDS) {
  test(`Linux backend ${backend} selects persistent credential storage`, () => {
    const policy = createCredentialStoragePolicy({ backend, platform: "linux" });

    assert.equal(policy.backend, backend);
    assert.equal(policy.mode, "persistent");
    assert.equal(policy.security, "secure");
    assert.equal(policy.partition, "persist:canva");
    assert.equal(policy.cache, true);
    assert.equal(policy.persistentLoginAvailable, true);
    assert.equal(policy.warning, null);
  });
}

test("Linux backend basic_text selects ephemeral credential storage", () => {
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
});

test("Linux backend unknown selects ephemeral credential storage", () => {
  const policy = createCredentialStoragePolicy({
    backend: "unknown",
    platform: "linux",
  });

  assert.equal(policy.mode, "ephemeral");
  assert.equal(policy.security, "unknown");
  assert.equal(policy.partition, "canva-ephemeral");
  assert.equal(policy.partition.startsWith("persist:"), false);
  assert.equal(policy.cache, false);
  assert.equal(policy.persistentLoginAvailable, false);
});

test("credential backend detection errors select ephemeral credential storage", () => {
  const policy = resolveCredentialStoragePolicy({
    platform: "linux",
    safeStorage: {
      getSelectedStorageBackend() {
        throw new Error("Secret Service unavailable");
      },
    },
  });

  assert.equal(policy.backend, "unknown");
  assert.equal(policy.mode, "ephemeral");
  assert.equal(policy.security, "unknown");
  assert.equal(policy.partition, "canva-ephemeral");
  assert.equal(policy.partition.startsWith("persist:"), false);
  assert.equal(policy.cache, false);
  assert.equal(policy.persistentLoginAvailable, false);
});

test("persistent and ephemeral partition names are mutually exclusive", () => {
  const persistentPolicy = createCredentialStoragePolicy({
    backend: "kwallet6",
    platform: "linux",
  });
  const ephemeralPolicy = createCredentialStoragePolicy({
    backend: "basic_text",
    platform: "linux",
  });

  assert.equal(persistentPolicy.partition, "persist:canva");
  assert.equal(ephemeralPolicy.partition, "canva-ephemeral");
  assert.equal(ephemeralPolicy.partition.startsWith("persist:"), false);
  assert.notEqual(ephemeralPolicy.partition, persistentPolicy.partition);
});

test("basic_text session options never use the persistent Canva partition", () => {
  const policy = createCredentialStoragePolicy({
    backend: "basic_text",
    platform: "linux",
  });
  const sessionOptions = {
    partition: policy.partition,
    cache: policy.cache,
  };

  assert.equal(sessionOptions.partition, "canva-ephemeral");
  assert.notEqual(sessionOptions.partition, "persist:canva");
  assert.equal(sessionOptions.partition.startsWith("persist:"), false);
  assert.equal(sessionOptions.cache, false);
});
