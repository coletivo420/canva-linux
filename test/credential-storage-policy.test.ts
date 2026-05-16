// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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
  assert.equal(copy.detail.startsWith("Canva Linux will start in ephemeral session mode; credentials, cookies and login state will not be saved.\n\n"), true);
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

test("detects Flatpak runtime from FLATPAK_ID and /.flatpak-info", () => {
  const { detectFlatpakRuntimeInfo } = loadRuntimeModule("main/credential-storage");
  const fromEnv = detectFlatpakRuntimeInfo({
    env: { FLATPAK_ID: "io.github.coletivo420.canva-linux" },
    fileExists() {
      return false;
    },
  });

  assert.equal(fromEnv.isFlatpak, true);
  assert.equal(fromEnv.flatpakId, "io.github.coletivo420.canva-linux");
  assert.equal(fromEnv.hasFlatpakInfo, false);

  const fromFile = detectFlatpakRuntimeInfo({
    env: {},
    fileExists(path) {
      assert.equal(path, "/.flatpak-info");
      return true;
    },
  });

  assert.equal(fromFile.isFlatpak, true);
  assert.equal(fromFile.flatpakId, null);
  assert.equal(fromFile.hasFlatpakInfo, true);
});

test("Flatpak ephemeral warning explains host Secret Service and KWallet access", () => {
  const policy = resolveCredentialStoragePolicy({
    platform: "linux",
    flatpak: {
      isFlatpak: true,
      flatpakId: "io.github.coletivo420.canva-linux",
      hasFlatpakInfo: true,
    },
    safeStorage: safeStorageMock({
      backend: "unknown",
      encryptionAvailable: false,
    }),
  });
  const warning = createCredentialStorageWarningCopy(policy);

  assert.equal(policy.flatpak.isFlatpak, true);
  assert.equal(policy.flatpak.flatpakId, "io.github.coletivo420.canva-linux");
  assert.match(
    policy.warning,
    /Canva Linux is running inside Flatpak, but Electron could not verify a secure native credential backend\./,
  );
  assert.match(
    warning.detail,
    /Persistent login requires access to the host Secret Service\/KWallet through the Flatpak sandbox\./,
  );
});

function readRepositoryFile(relativePath) {
  return fs.readFileSync(
    path.join(
      process.env.CANVA_SCRIPT_REPO_ROOT || path.join(__dirname, "..", ".."),
      relativePath,
    ),
    "utf8",
  );
}

test("root Flatpak manifest includes org.kde.kwalletd5", () => {
  const manifest = readRepositoryFile("io.github.coletivo420.canva-linux.yml");

  assert.match(manifest, /--talk-name=org\.freedesktop\.secrets/);
  assert.match(manifest, /--talk-name=org\.kde\.kwalletd5/);
  assert.match(manifest, /--talk-name=org\.kde\.kwalletd6/);
});

test("Flathub manifest includes org.kde.kwalletd5", () => {
  const manifest = readRepositoryFile("packaging/flathub/manifest.yml");

  assert.match(manifest, /--talk-name=org\.freedesktop\.secrets/);
  assert.match(manifest, /--talk-name=org\.kde\.kwalletd5/);
  assert.match(manifest, /--talk-name=org\.kde\.kwalletd6/);
});
