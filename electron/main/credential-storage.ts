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
  | "secure-backend-unavailable"
  | "insecure-basic-text"
  | "unknown"
  | "unsupported-platform";

export type CredentialStoragePolicy = {
  backend: string;
  encryptionAvailable: boolean;
  encryptionAvailableVerified: boolean;
  mode: CredentialStorageMode;
  security: CredentialStorageSecurity;
  partition: string;
  cache: boolean;
  persistentLoginAvailable: boolean;
  warning: string | null;
};

type SafeStorageLike = {
  getSelectedStorageBackend(): string;
  isEncryptionAvailable(): boolean;
};

const EPHEMERAL_WARNING =
  "Secure Linux credential encryption was not verified. Canva Linux will use an ephemeral session; credentials, cookies and login state will not be saved.";

function createEphemeralLinuxPolicy({
  backend,
  encryptionAvailable,
  encryptionAvailableVerified,
}: {
  backend: string;
  encryptionAvailable: boolean;
  encryptionAvailableVerified: boolean;
}): CredentialStoragePolicy {
  let security: CredentialStorageSecurity = "unknown";

  if (backend === "basic_text") {
    security = "insecure-basic-text";
  } else if (
    encryptionAvailableVerified &&
    SECURE_LINUX_BACKENDS.has(backend) &&
    !encryptionAvailable
  ) {
    security = "secure-backend-unavailable";
  }

  return {
    backend,
    encryptionAvailable,
    encryptionAvailableVerified,
    mode: "ephemeral",
    security,
    partition: EPHEMERAL_PARTITION,
    cache: false,
    persistentLoginAvailable: false,
    warning: EPHEMERAL_WARNING,
  };
}

function createDefaultCredentialStoragePolicy(): CredentialStoragePolicy {
  return createEphemeralLinuxPolicy({
    backend: "unknown",
    encryptionAvailable: false,
    encryptionAvailableVerified: false,
  });
}

function createCredentialStoragePolicy({
  backend,
  encryptionAvailable = false,
  encryptionAvailableVerified = true,
  platform = process.platform,
}: {
  backend: string;
  encryptionAvailable?: boolean;
  encryptionAvailableVerified?: boolean;
  platform?: NodeJS.Platform;
}): CredentialStoragePolicy {
  if (platform !== "linux") {
    return {
      backend: "platform-default",
      encryptionAvailable: true,
      encryptionAvailableVerified: false,
      mode: "persistent",
      security: "unsupported-platform",
      partition: PERSISTENT_PARTITION,
      cache: true,
      persistentLoginAvailable: true,
      warning: null,
    };
  }

  if (
    encryptionAvailableVerified &&
    SECURE_LINUX_BACKENDS.has(backend) &&
    encryptionAvailable
  ) {
    return {
      backend,
      encryptionAvailable,
      encryptionAvailableVerified,
      mode: "persistent",
      security: "secure",
      partition: PERSISTENT_PARTITION,
      cache: true,
      persistentLoginAvailable: true,
      warning: null,
    };
  }

  return createEphemeralLinuxPolicy({
    backend,
    encryptionAvailable,
    encryptionAvailableVerified,
  });
}

function resolveCredentialStoragePolicy({
  safeStorage,
  platform = process.platform,
}: {
  safeStorage: SafeStorageLike;
  platform?: NodeJS.Platform;
}): CredentialStoragePolicy {
  if (platform !== "linux") {
    return createCredentialStoragePolicy({
      backend: "platform-default",
      platform,
    });
  }

  let backend = "unknown";

  try {
    backend = safeStorage.getSelectedStorageBackend();
  } catch {
    return createCredentialStoragePolicy({
      backend,
      encryptionAvailable: false,
      encryptionAvailableVerified: false,
      platform,
    });
  }

  try {
    return createCredentialStoragePolicy({
      backend,
      encryptionAvailable: safeStorage.isEncryptionAvailable(),
      encryptionAvailableVerified: true,
      platform,
    });
  } catch {
    return createCredentialStoragePolicy({
      backend,
      encryptionAvailable: false,
      encryptionAvailableVerified: false,
      platform,
    });
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
