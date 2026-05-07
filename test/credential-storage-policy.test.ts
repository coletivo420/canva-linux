// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  createCredentialStoragePolicy,
  createCredentialStorageWarningCopy,
  resolveCredentialStoragePolicy,
} = loadRuntimeModule("main/credential-storage");

const SECURE_BACKENDS = [
  "kwallet",
  "kwallet5",
  "kwallet6",
  "gnome_libsecret",
];

function safeStorageMock({ backend, encryptionAvailable }) {
  return {
    getSelectedStorageBackend() {
      return backend;
    },
    isEncryptionAvailable() {
      return encryptionAvailable;
    },
  };
}

for (const backend of SECURE_BACKENDS) {
  test(`Linux backend ${backend} with available encryption selects persistent credential storage`, () => {
    const policy = resolveCredentialStoragePolicy({
      platform: "linux",
      safeStorage: safeStorageMock({ backend, encryptionAvailable: true }),
    });

    assert.equal(policy.backend, backend);
    assert.equal(policy.encryptionAvailable, true);
    assert.equal(policy.encryptionAvailableVerified, true);
    assert.equal(policy.mode, "persistent");
    assert.equal(policy.security, "secure");
    assert.equal(policy.partition, "persist:canva");
    assert.equal(policy.cache, true);
    assert.equal(policy.persistentLoginAvailable, true);
    assert.equal(policy.warning, null);
  });
}

test("Linux backend kwallet6 without available encryption selects ephemeral credential storage", () => {
  const policy = resolveCredentialStoragePolicy({
    platform: "linux",
    safeStorage: safeStorageMock({
      backend: "kwallet6",
      encryptionAvailable: false,
    }),
  });

  assert.equal(policy.backend, "kwallet6");
  assert.equal(policy.encryptionAvailable, false);
  assert.equal(policy.encryptionAvailableVerified, true);
  assert.equal(policy.mode, "ephemeral");
  assert.equal(policy.security, "secure-backend-unavailable");
  assert.equal(policy.partition, "canva-ephemeral");
  assert.equal(policy.partition.startsWith("persist:"), false);
  assert.equal(policy.cache, false);
  assert.equal(policy.persistentLoginAvailable, false);
});

test("Linux backend gnome_libsecret without available encryption selects ephemeral credential storage", () => {
  const policy = resolveCredentialStoragePolicy({
    platform: "linux",
    safeStorage: safeStorageMock({
      backend: "gnome_libsecret",
      encryptionAvailable: false,
    }),
  });

  assert.equal(policy.backend, "gnome_libsecret");
  assert.equal(policy.mode, "ephemeral");
  assert.equal(policy.security, "secure-backend-unavailable");
  assert.equal(policy.partition, "canva-ephemeral");
  assert.equal(policy.partition.startsWith("persist:"), false);
  assert.equal(policy.cache, false);
  assert.equal(policy.persistentLoginAvailable, false);
});

test("Linux backend basic_text selects ephemeral credential storage even when encryption is reported available", () => {
  const policy = resolveCredentialStoragePolicy({
    platform: "linux",
    safeStorage: safeStorageMock({
      backend: "basic_text",
      encryptionAvailable: true,
    }),
  });

  assert.equal(policy.backend, "basic_text");
  assert.equal(policy.encryptionAvailable, true);
  assert.equal(policy.mode, "ephemeral");
  assert.equal(policy.security, "insecure-basic-text");
  assert.equal(policy.partition, "canva-ephemeral");
  assert.equal(policy.partition.startsWith("persist:"), false);
  assert.equal(policy.cache, false);
  assert.equal(policy.persistentLoginAvailable, false);
});

test("Linux backend unknown selects ephemeral credential storage even when encryption is reported available", () => {
  const policy = resolveCredentialStoragePolicy({
    platform: "linux",
    safeStorage: safeStorageMock({
      backend: "unknown",
      encryptionAvailable: true,
    }),
  });

  assert.equal(policy.backend, "unknown");
  assert.equal(policy.encryptionAvailable, true);
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
      isEncryptionAvailable() {
        return true;
      },
    },
  });

  assert.equal(policy.backend, "unknown");
  assert.equal(policy.encryptionAvailable, false);
  assert.equal(policy.encryptionAvailableVerified, false);
  assert.equal(policy.mode, "ephemeral");
  assert.equal(policy.security, "unknown");
  assert.equal(policy.partition, "canva-ephemeral");
  assert.equal(policy.partition.startsWith("persist:"), false);
  assert.equal(policy.cache, false);
  assert.equal(policy.persistentLoginAvailable, false);
});

test("credential encryption detection errors select ephemeral credential storage", () => {
  const policy = resolveCredentialStoragePolicy({
    platform: "linux",
    safeStorage: {
      getSelectedStorageBackend() {
        return "kwallet6";
      },
      isEncryptionAvailable() {
        throw new Error("keyring locked");
      },
    },
  });

  assert.equal(policy.backend, "kwallet6");
  assert.equal(policy.encryptionAvailable, false);
  assert.equal(policy.encryptionAvailableVerified, false);
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
    encryptionAvailable: true,
    platform: "linux",
  });
  const ephemeralPolicy = createCredentialStoragePolicy({
    backend: "basic_text",
    encryptionAvailable: true,
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
    encryptionAvailable: true,
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

test("secure backend session options without available encryption never use the persistent Canva partition", () => {
  const policy = createCredentialStoragePolicy({
    backend: "kwallet6",
    encryptionAvailable: false,
    platform: "linux",
  });
  const sessionOptions = {
    partition: policy.partition,
    cache: policy.cache,
  };

  assert.equal(policy.security, "secure-backend-unavailable");
  assert.equal(sessionOptions.partition, "canva-ephemeral");
  assert.notEqual(sessionOptions.partition, "persist:canva");
  assert.equal(sessionOptions.partition.startsWith("persist:"), false);
  assert.equal(sessionOptions.cache, false);
});

test("credential storage warning copy is not created for persistent storage", () => {
  const policy = createCredentialStoragePolicy({
    backend: "kwallet6",
    encryptionAvailable: true,
    platform: "linux",
  });

  assert.equal(createCredentialStorageWarningCopy(policy), null);
});

test("credential storage warning copy uses policy warning for unverified ephemeral storage", () => {
  const policy = createCredentialStoragePolicy({
    backend: "basic_text",
    encryptionAvailable: true,
    platform: "linux",
  });
  const copy = createCredentialStorageWarningCopy(policy);

  assert.deepEqual(copy, {
    title: "Secure credential encryption was not verified",
    message: "Secure credential encryption was not verified.",
    detail: [
      "Canva Linux will start in ephemeral session mode; credentials, cookies and login state will not be saved.",
      "",
      "Persistent login requires both a secure Linux Secret Service backend and available safeStorage encryption.",
      "Install, enable, and unlock KWallet on KDE Plasma, GNOME Keyring/libsecret on GNOME, or a compatible Secret Service provider.",
    ].join("\n"),
  });
});

test("credential storage warning copy has secure backend unavailable text", () => {
  const policy = createCredentialStoragePolicy({
    backend: "kwallet6",
    encryptionAvailable: false,
    platform: "linux",
  });
  const copy = createCredentialStorageWarningCopy(policy);

  assert.equal(policy.security, "secure-backend-unavailable");
  assert.equal(copy.title, "Secure credential encryption is unavailable");
  assert.equal(copy.message, "Secure credential encryption is unavailable.");
  assert.equal(copy.detail.startsWith(`${policy.warning}\n\n`), true);
});

test("credential storage warning copy falls back when policy warning is unavailable", () => {
  const policy = {
    ...createCredentialStoragePolicy({
      backend: "unknown",
      encryptionAvailable: false,
      encryptionAvailableVerified: false,
      platform: "linux",
    }),
    warning: null,
  };
  const copy = createCredentialStorageWarningCopy(policy);

  assert.equal(copy.title, "Secure credential encryption was not verified");
  assert.equal(
    copy.detail.startsWith(
      "Canva Linux will start in ephemeral session mode; credentials, cookies and login state will not be saved.\n\n",
    ),
    true,
  );
});
