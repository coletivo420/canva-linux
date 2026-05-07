"use strict";

const PERSISTENT_PARTITION = "persist:canva";
const EPHEMERAL_PARTITION = "canva-ephemeral";

const SECURE_LINUX_BACKENDS = new Set([
  "kwallet",
  "kwallet5",
  "kwallet6",
  "gnome_libsecret",
]);

export type CredentialStorageMode = "persistent" | "ephemeral";

export type CredentialStorageSecurity =
  | "secure"
  | "insecure-basic-text"
  | "unknown"
  | "unsupported-platform";

export type CredentialStoragePolicy = {
  backend: string;
  mode: CredentialStorageMode;
  security: CredentialStorageSecurity;
  partition: string;
  cache: boolean;
  persistentLoginAvailable: boolean;
  warning: string | null;
};

type SafeStorageLike = { getSelectedStorageBackend(): string };

const EPHEMERAL_WARNING =
  "No secure Linux Secret Service backend was detected. Canva Linux will use an ephemeral session; credentials, cookies and login state will not be saved.";

function createEphemeralLinuxPolicy(backend: string): CredentialStoragePolicy {
  return {
    backend,
    mode: "ephemeral",
    security: backend === "basic_text" ? "insecure-basic-text" : "unknown",
    partition: EPHEMERAL_PARTITION,
    cache: false,
    persistentLoginAvailable: false,
    warning: EPHEMERAL_WARNING,
  };
}

function createDefaultCredentialStoragePolicy(): CredentialStoragePolicy {
  return createEphemeralLinuxPolicy("unknown");
}

function createCredentialStoragePolicy({
  backend,
  platform = process.platform,
}: {
  backend: string;
  platform?: NodeJS.Platform;
}): CredentialStoragePolicy {
  if (platform !== "linux") {
    return {
      backend: "platform-default",
      mode: "persistent",
      security: "unsupported-platform",
      partition: PERSISTENT_PARTITION,
      cache: true,
      persistentLoginAvailable: true,
      warning: null,
    };
  }

  if (SECURE_LINUX_BACKENDS.has(backend)) {
    return {
      backend,
      mode: "persistent",
      security: "secure",
      partition: PERSISTENT_PARTITION,
      cache: true,
      persistentLoginAvailable: true,
      warning: null,
    };
  }

  return createEphemeralLinuxPolicy(backend);
}

function resolveCredentialStoragePolicy({
  safeStorage,
  platform = process.platform,
}: {
  safeStorage: SafeStorageLike;
  platform?: NodeJS.Platform;
}): CredentialStoragePolicy {
  if (platform !== "linux") {
    return createCredentialStoragePolicy({ backend: "platform-default", platform });
  }

  try {
    return createCredentialStoragePolicy({
      backend: safeStorage.getSelectedStorageBackend(),
      platform,
    });
  } catch {
    return createCredentialStoragePolicy({ backend: "unknown", platform });
  }
}

export {
  EPHEMERAL_PARTITION,
  EPHEMERAL_WARNING,
  PERSISTENT_PARTITION,
  SECURE_LINUX_BACKENDS,
  createCredentialStoragePolicy,
  createDefaultCredentialStoragePolicy,
  resolveCredentialStoragePolicy,
};
