import fs from "node:fs";

type LinuxCredentialRuntimeEnvironment = NodeJS.ProcessEnv;

type LinuxPasswordStoreCandidate = {
  store: "gnome-libsecret" | "kwallet6" | "kwallet5";
  reason:
    | "freedesktop-secret-service"
    | "kde-kwallet6-fallback"
    | "kde-kwallet5-fallback"
    | "desktop-default";
};

type LinuxPasswordStorePlan = {
  selectedStore: "gnome-libsecret" | "kwallet6" | "kwallet5";
  candidates: LinuxPasswordStoreCandidate[];
  isFlatpak: boolean;
  desktop: string;
  isKde: boolean;
};

type LinuxPasswordStoreOverride = LinuxPasswordStorePlan["selectedStore"];
type LinuxPasswordStoreLogger = Pick<Console, "info" | "warn">;

const SAFE_PASSWORD_STORE_OVERRIDES = new Set<LinuxPasswordStoreOverride>([
  "gnome-libsecret",
  "kwallet6",
  "kwallet5",
]);

function normalizeDesktopValue(value: string | undefined): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function collectDesktopHints(
  env: LinuxCredentialRuntimeEnvironment = process.env,
): string[] {
  return [
    env.XDG_CURRENT_DESKTOP,
    env.XDG_SESSION_DESKTOP,
    env.DESKTOP_SESSION,
    env.KDE_FULL_SESSION === "true" || env.KDE_FULL_SESSION === "1"
      ? "kde"
      : undefined,
  ]
    .map(normalizeDesktopValue)
    .filter(Boolean);
}

function detectFlatpakRuntime(
  env: LinuxCredentialRuntimeEnvironment = process.env,
  fileExists: (path: string) => boolean = fs.existsSync,
): boolean {
  if (String(env.FLATPAK_ID || "").trim()) return true;

  try {
    return fileExists("/.flatpak-info");
  } catch {
    return false;
  }
}

function createFlatpakPasswordStoreCandidates(): LinuxPasswordStoreCandidate[] {
  return [
    {
      store: "gnome-libsecret",
      reason: "freedesktop-secret-service",
    },
    {
      store: "kwallet6",
      reason: "kde-kwallet6-fallback",
    },
    {
      store: "kwallet5",
      reason: "kde-kwallet5-fallback",
    },
  ];
}

function createDesktopDefaultPasswordStoreCandidates(
  isKde: boolean,
  env: LinuxCredentialRuntimeEnvironment,
): LinuxPasswordStoreCandidate[] {
  if (isKde) {
    return [
      {
        store: env.KDE_SESSION_VERSION === "5" ? "kwallet5" : "kwallet6",
        reason: "desktop-default",
      },
    ];
  }

  return [
    {
      store: "gnome-libsecret",
      reason: "desktop-default",
    },
  ];
}

function resolvePasswordStoreOverride(
  env: LinuxCredentialRuntimeEnvironment,
  logger?: LinuxPasswordStoreLogger,
): LinuxPasswordStoreOverride | null {
  const override = String(env.CANVA_LINUX_PASSWORD_STORE || "").trim();
  if (!override) return null;

  if (SAFE_PASSWORD_STORE_OVERRIDES.has(override as LinuxPasswordStoreOverride)) {
    return override as LinuxPasswordStoreOverride;
  }

  logger?.warn(
    `[canva-linux] Ignoring unsafe or unsupported CANVA_LINUX_PASSWORD_STORE=${override}; falling back to automatic Linux credential-store selection.`,
  );
  return null;
}

function selectLinuxPasswordStore(
  env: LinuxCredentialRuntimeEnvironment = process.env,
  options: {
    fileExists?: (path: string) => boolean;
    logger?: LinuxPasswordStoreLogger;
  } = {},
): LinuxPasswordStorePlan {
  const desktopHints = collectDesktopHints(env);
  const desktop = desktopHints.join(";") || "unknown";
  const isKde = desktopHints.some((hint) =>
    hint.split(" ").some((token) => token === "kde" || token === "plasma"),
  );
  const isFlatpak = detectFlatpakRuntime(env, options.fileExists);
  const candidates = isFlatpak
    ? createFlatpakPasswordStoreCandidates()
    : createDesktopDefaultPasswordStoreCandidates(isKde, env);
  const selectedStore = resolvePasswordStoreOverride(env, options.logger)
    ?? (isFlatpak && isKde && env.KDE_SESSION_VERSION === "5"
      ? "kwallet5"
      : candidates[0].store);

  return {
    selectedStore,
    candidates,
    isFlatpak,
    desktop,
    isKde,
  };
}

function shouldLogCredentialStorePlan(
  env: LinuxCredentialRuntimeEnvironment = process.env,
): boolean {
  const debug = String(env.CANVA_DEBUG || "").trim();
  const debugLevel = String(env.CANVA_DEBUG_LEVEL || "").trim();
  return debug === "1" || debug === "2" || debugLevel === "1" || debugLevel === "2";
}

function logLinuxPasswordStorePlan(
  plan: LinuxPasswordStorePlan,
  logger: LinuxPasswordStoreLogger = console,
): void {
  logger.info(
    [
      `[canva-linux] Linux credential-store plan: selected=${plan.selectedStore}`,
      `flatpak=${plan.isFlatpak}`,
      `desktop=${plan.desktop}`,
      `isKde=${plan.isKde}`,
      `candidates=${plan.candidates.map((candidate) => `${candidate.store}:${candidate.reason}`).join(",")}`,
    ].join(" "),
  );
}

type CommandLineLike = {
  appendSwitch(name: string, value?: string): void;
};

type ElectronAppLike = {
  commandLine: CommandLineLike;
};

function configureLinuxNativeCredentialStore({
  app,
  env = process.env,
  platform = process.platform,
  logger = console,
}: {
  app: ElectronAppLike;
  env?: LinuxCredentialRuntimeEnvironment;
  platform?: NodeJS.Platform;
  logger?: LinuxPasswordStoreLogger;
}): LinuxPasswordStorePlan | null {
  if (platform !== "linux") {
    return null;
  }

  const plan = selectLinuxPasswordStore(env, { logger });
  app.commandLine.appendSwitch("password-store", plan.selectedStore);

  if (shouldLogCredentialStorePlan(env)) {
    logLinuxPasswordStorePlan(plan, logger);
  }

  return plan;
}

export {
  collectDesktopHints,
  configureLinuxNativeCredentialStore,
  detectFlatpakRuntime,
  logLinuxPasswordStorePlan,
  selectLinuxPasswordStore,
};

export type { LinuxPasswordStoreCandidate, LinuxPasswordStorePlan };
