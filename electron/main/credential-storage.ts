import fs from "node:fs";

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

export type CredentialStorageWarningCopy = {
  title: string;
  message: string;
  detail: string;
};

export type FlatpakRuntimeInfo = {
  isFlatpak: boolean;
  flatpakId: string | null;
  hasFlatpakInfo: boolean;
};

export type CredentialStoragePolicy = {
  backend: string;
  flatpak: FlatpakRuntimeInfo;
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
const FLATPAK_EPHEMERAL_WARNING =
  "Canva Linux is running inside Flatpak, but Electron could not verify a secure native credential backend. Persistent login requires access to the host Secret Service/KWallet through the Flatpak sandbox.";
const DEFAULT_FLATPAK_RUNTIME_INFO: FlatpakRuntimeInfo = {
  isFlatpak: false,
  flatpakId: null,
  hasFlatpakInfo: false,
};

function detectFlatpakRuntimeInfo({
  env = process.env,
  flatpakInfoPath = "/.flatpak-info",
  fileExists = fs.existsSync,
}: {
  env?: NodeJS.ProcessEnv;
  flatpakInfoPath?: string;
  fileExists?: (path: string) => boolean;
} = {}): FlatpakRuntimeInfo {
  const flatpakId = String(env.FLATPAK_ID || "").trim() || null;
  let hasFlatpakInfo = false;

  try {
    hasFlatpakInfo = fileExists(flatpakInfoPath);
  } catch {
    hasFlatpakInfo = false;
  }

  return {
    isFlatpak: Boolean(flatpakId || hasFlatpakInfo),
    flatpakId,
    hasFlatpakInfo,
  };
}

function createEphemeralLinuxPolicy({
  backend,
  encryptionAvailable,
  encryptionAvailableVerified,
  flatpak = DEFAULT_FLATPAK_RUNTIME_INFO,
}: {
  backend: string;
  encryptionAvailable: boolean;
  encryptionAvailableVerified: boolean;
  flatpak?: FlatpakRuntimeInfo;
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
    flatpak,
    encryptionAvailable,
    encryptionAvailableVerified,
    mode: "ephemeral",
    security,
    partition: EPHEMERAL_PARTITION,
    cache: false,
    persistentLoginAvailable: false,
    warning: flatpak.isFlatpak ? FLATPAK_EPHEMERAL_WARNING : EPHEMERAL_WARNING,
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
  flatpak = DEFAULT_FLATPAK_RUNTIME_INFO,
  platform = process.platform,
}: {
  backend: string;
  encryptionAvailable?: boolean;
  encryptionAvailableVerified?: boolean;
  flatpak?: FlatpakRuntimeInfo;
  platform?: NodeJS.Platform;
}): CredentialStoragePolicy {
  if (platform !== "linux") {
    return {
      backend: "platform-default",
      flatpak,
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
      flatpak,
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
    flatpak,
    encryptionAvailable,
    encryptionAvailableVerified,
  });
}

function createCredentialStorageWarningCopy(
  policy: CredentialStoragePolicy,
): CredentialStorageWarningCopy | null {
  if (policy.mode !== "ephemeral") {
    return null;
  }

  const backendUnavailable = policy.security === "secure-backend-unavailable";

  return {
    title: backendUnavailable
      ? "Secure credential encryption is unavailable"
      : "Secure credential encryption was not verified",
    message: backendUnavailable
      ? "Secure credential encryption is unavailable."
      : "Secure credential encryption was not verified.",
    detail: [
      (policy.warning && policy.warning !== EPHEMERAL_WARNING)
        ? policy.warning
        : "Canva Linux will start in ephemeral session mode; credentials, cookies and login state will not be saved.",
      "",
      policy.flatpak.isFlatpak
        ? "Persistent login requires access to the host Secret Service/KWallet through the Flatpak sandbox."
        : "Persistent login requires both a secure Linux Secret Service backend and available safeStorage encryption.",
      policy.flatpak.isFlatpak
        ? "Allow the Flatpak to talk to org.freedesktop.secrets, with KWallet D-Bus access used as a compatibility fallback when Chromium selects KWallet directly."
        : "Install, enable, and unlock KWallet on KDE Plasma, GNOME Keyring/libsecret on GNOME, or a compatible Secret Service provider.",
    ].join("\n"),
  };
}

function resolveCredentialStoragePolicy({
  safeStorage,
  flatpak = detectFlatpakRuntimeInfo(),
  platform = process.platform,
}: {
  safeStorage: SafeStorageLike;
  flatpak?: FlatpakRuntimeInfo;
  platform?: NodeJS.Platform;
}): CredentialStoragePolicy {
  if (platform !== "linux") {
    return createCredentialStoragePolicy({
      backend: "platform-default",
      flatpak,
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
      flatpak,
      platform,
    });
  }

  try {
    return createCredentialStoragePolicy({
      backend,
      encryptionAvailable: safeStorage.isEncryptionAvailable(),
      encryptionAvailableVerified: true,
      flatpak,
      platform,
    });
  } catch {
    return createCredentialStoragePolicy({
      backend,
      encryptionAvailable: false,
      encryptionAvailableVerified: false,
      flatpak,
      platform,
    });
  }
}

export {
  DEFAULT_FLATPAK_RUNTIME_INFO,
  EPHEMERAL_PARTITION,
  EPHEMERAL_WARNING,
  FLATPAK_EPHEMERAL_WARNING,
  PERSISTENT_PARTITION,
  SECURE_LINUX_BACKENDS,
  createCredentialStoragePolicy,
  createCredentialStorageWarningCopy,
  createDefaultCredentialStoragePolicy,
  detectFlatpakRuntimeInfo,
  resolveCredentialStoragePolicy,
};
