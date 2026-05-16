import { spawnSync } from "node:child_process";
import fs from "node:fs";

type LinuxCredentialRuntimeEnvironment = NodeJS.ProcessEnv;

type LinuxPasswordStoreName = "gnome-libsecret" | "kwallet6" | "kwallet5";

type LinuxCredentialServiceName =
  | "org.freedesktop.secrets"
  | "org.kde.kwalletd6"
  | "org.kde.kwalletd5";

type LinuxCredentialServiceProbeStatus =
  | "available"
  | "activatable"
  | "unavailable"
  | "unknown";

type LinuxPasswordStoreCandidate = {
  store: LinuxPasswordStoreName;
  reason: "desktop-preferred" | "kde-native" | "secret-service" | "fallback";
  serviceName: LinuxCredentialServiceName;
  probeStatus?: LinuxCredentialServiceProbeStatus;
};

type LinuxPasswordStorePlan = {
  selectedStore: LinuxPasswordStoreName;
  selectedService: LinuxCredentialServiceName;
  selectedCandidate: LinuxPasswordStoreCandidate;
  candidates: LinuxPasswordStoreCandidate[];
  isFlatpak: boolean;
  desktop: string;
  isKde: boolean;
};

type LinuxPasswordStoreOverride = LinuxPasswordStoreName;
type LinuxPasswordStoreLogger = Pick<Console, "info" | "warn">;

type LinuxCredentialProbeCommandResult = {
  status: number | null;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
  error?: unknown;
};

type LinuxCredentialProbeCommandRunner = (
  command: string,
  args: string[],
) => LinuxCredentialProbeCommandResult;

const PASSWORD_STORE_SERVICE_NAMES: Record<
  LinuxPasswordStoreName,
  LinuxCredentialServiceName
> = {
  "gnome-libsecret": "org.freedesktop.secrets",
  kwallet6: "org.kde.kwalletd6",
  kwallet5: "org.kde.kwalletd5",
};

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

function candidateFor(
  store: LinuxPasswordStoreName,
  reason: LinuxPasswordStoreCandidate["reason"],
): LinuxPasswordStoreCandidate {
  return {
    store,
    reason,
    serviceName: PASSWORD_STORE_SERVICE_NAMES[store],
  };
}

function getPreferredKwalletStore(
  env: LinuxCredentialRuntimeEnvironment,
): "kwallet5" | "kwallet6" {
  return env.KDE_SESSION_VERSION === "5" ? "kwallet5" : "kwallet6";
}

function getFallbackKwalletStore(
  env: LinuxCredentialRuntimeEnvironment,
): "kwallet5" | "kwallet6" {
  return getPreferredKwalletStore(env) === "kwallet5" ? "kwallet6" : "kwallet5";
}

function createKdePasswordStoreCandidates(
  env: LinuxCredentialRuntimeEnvironment,
): LinuxPasswordStoreCandidate[] {
  const preferred = getPreferredKwalletStore(env);
  const fallback = getFallbackKwalletStore(env);

  return [
    candidateFor(preferred, "kde-native"),
    candidateFor(fallback, "fallback"),
    candidateFor("gnome-libsecret", "secret-service"),
  ];
}

function createSecretServicePasswordStoreCandidates(): LinuxPasswordStoreCandidate[] {
  return [
    candidateFor("gnome-libsecret", "secret-service"),
    candidateFor("kwallet6", "fallback"),
    candidateFor("kwallet5", "fallback"),
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

function probeCommandOutput(result: LinuxCredentialProbeCommandResult): string {
  return String(result.stdout || "");
}

function probeCommandSucceeded(result: LinuxCredentialProbeCommandResult): boolean {
  return result.status === 0;
}

function defaultCredentialProbeCommandRunner(
  command: string,
  args: string[],
): LinuxCredentialProbeCommandResult {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 1000,
  });

  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error,
  };
}

function commandIsAvailable(
  command: "gdbus" | "busctl",
  runner: LinuxCredentialProbeCommandRunner,
): boolean {
  try {
    return probeCommandSucceeded(runner(command, ["--version"]));
  } catch {
    return false;
  }
}

function gdbusCall(
  method: "NameHasOwner" | "ListActivatableNames",
  serviceName: LinuxCredentialServiceName,
  runner: LinuxCredentialProbeCommandRunner,
): LinuxCredentialProbeCommandResult {
  const args = [
    "call",
    "--session",
    "--dest",
    "org.freedesktop.DBus",
    "--object-path",
    "/org/freedesktop/DBus",
    "--method",
    `org.freedesktop.DBus.${method}`,
  ];

  if (method === "NameHasOwner") {
    args.push(serviceName);
  }

  return runner("gdbus", args);
}

function busctlCall(
  method: "NameHasOwner" | "ListActivatableNames",
  serviceName: LinuxCredentialServiceName,
  runner: LinuxCredentialProbeCommandRunner,
): LinuxCredentialProbeCommandResult {
  const args = [
    "--user",
    "call",
    "org.freedesktop.DBus",
    "/org/freedesktop/DBus",
    "org.freedesktop.DBus",
    method,
  ];

  if (method === "NameHasOwner") {
    args.push("s", serviceName);
  }

  return runner("busctl", args);
}

function parseNameHasOwner(output: string): boolean {
  return /\btrue\b/i.test(output) || /\bb\s+1\b/.test(output);
}

function parseActivatableNames(
  output: string,
  serviceName: LinuxCredentialServiceName,
): boolean {
  return output.includes("'" + serviceName + "'") || output.includes('"' + serviceName + '"');
}

function probeCredentialServiceWithTool(
  tool: "gdbus" | "busctl",
  serviceName: LinuxCredentialServiceName,
  runner: LinuxCredentialProbeCommandRunner,
): LinuxCredentialServiceProbeStatus {
  const call = tool === "gdbus" ? gdbusCall : busctlCall;
  const ownerResult = call("NameHasOwner", serviceName, runner);
  if (!probeCommandSucceeded(ownerResult)) return "unknown";
  if (parseNameHasOwner(probeCommandOutput(ownerResult))) return "available";

  const activatableResult = call("ListActivatableNames", serviceName, runner);
  if (!probeCommandSucceeded(activatableResult)) return "unknown";
  if (parseActivatableNames(probeCommandOutput(activatableResult), serviceName)) {
    return "activatable";
  }

  return "unavailable";
}

function probeCredentialService(
  serviceName: LinuxCredentialServiceName,
  options: {
    env?: LinuxCredentialRuntimeEnvironment;
    runner?: LinuxCredentialProbeCommandRunner;
  } = {},
): LinuxCredentialServiceProbeStatus {
  const env = options.env ?? process.env;
  if (!String(env.DBUS_SESSION_BUS_ADDRESS || "").trim()) {
    return "unknown";
  }

  const runner = options.runner ?? defaultCredentialProbeCommandRunner;

  if (commandIsAvailable("gdbus", runner)) {
    const status = probeCredentialServiceWithTool("gdbus", serviceName, runner);
    if (status !== "unknown") return status;
  }

  if (commandIsAvailable("busctl", runner)) {
    return probeCredentialServiceWithTool("busctl", serviceName, runner);
  }

  return "unknown";
}

function probePasswordStoreCandidates(
  candidates: LinuxPasswordStoreCandidate[],
  options: {
    env?: LinuxCredentialRuntimeEnvironment;
    runner?: LinuxCredentialProbeCommandRunner;
  } = {},
): LinuxPasswordStoreCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    probeStatus: probeCredentialService(candidate.serviceName, options),
  }));
}

function selectFirstAvailablePasswordStore(
  candidates: LinuxPasswordStoreCandidate[],
): LinuxPasswordStoreCandidate {
  if (candidates.length === 0) {
    throw new Error("No Linux password-store candidates were provided.");
  }

  const available = candidates.find(
    (candidate) => candidate.probeStatus === "available",
  );
  if (available) return available;

  const activatable = candidates.find(
    (candidate) => candidate.probeStatus === "activatable",
  );
  if (activatable) return activatable;

  const unknown = candidates.find((candidate) => candidate.probeStatus === "unknown");
  if (unknown) return unknown;

  return candidates[0] as LinuxPasswordStoreCandidate;
}

function createDesktopAwarePasswordStoreCandidates(
  isKde: boolean,
  env: LinuxCredentialRuntimeEnvironment,
): LinuxPasswordStoreCandidate[] {
  return isKde
    ? createKdePasswordStoreCandidates(env)
    : createSecretServicePasswordStoreCandidates();
}

function selectLinuxPasswordStore(
  env: LinuxCredentialRuntimeEnvironment = process.env,
  options: {
    fileExists?: (path: string) => boolean;
    logger?: LinuxPasswordStoreLogger;
    probeRunner?: LinuxCredentialProbeCommandRunner;
  } = {},
): LinuxPasswordStorePlan {
  const desktopHints = collectDesktopHints(env);
  const desktop = desktopHints.join(";") || "unknown";
  const isKde = desktopHints.some((hint) =>
    hint.split(" ").some((token) => token === "kde" || token === "plasma"),
  );
  const isFlatpak = detectFlatpakRuntime(env, options.fileExists);
  const automaticCandidates = probePasswordStoreCandidates(
    createDesktopAwarePasswordStoreCandidates(isKde, env),
    { env, runner: options.probeRunner },
  );
  const override = resolvePasswordStoreOverride(env, options.logger);
  const selectedCandidate = override
    ? candidateFor(override, "desktop-preferred")
    : selectFirstAvailablePasswordStore(automaticCandidates);
  const candidates = override
    ? [{ ...selectedCandidate, probeStatus: undefined }, ...automaticCandidates]
    : automaticCandidates;

  return {
    selectedStore: selectedCandidate.store,
    selectedService: selectedCandidate.serviceName,
    selectedCandidate,
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
      "[canva-linux] Linux credential-store plan:",
      `flatpak=${plan.isFlatpak}`,
      `desktop=${plan.isKde ? "kde" : plan.desktop}`,
      `selected=${plan.selectedStore}`,
      `selectedService=${plan.selectedService}`,
      `candidates=${plan.candidates.map((candidate) => `${candidate.store}:${candidate.probeStatus ?? "override"}`).join(",")}`,
    ].join("\n"),
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
  createKdePasswordStoreCandidates,
  createSecretServicePasswordStoreCandidates,
  detectFlatpakRuntime,
  getFallbackKwalletStore,
  getPreferredKwalletStore,
  logLinuxPasswordStorePlan,
  probeCredentialService,
  selectFirstAvailablePasswordStore,
  selectLinuxPasswordStore,
};

export type {
  LinuxCredentialProbeCommandRunner,
  LinuxCredentialServiceName,
  LinuxCredentialServiceProbeStatus,
  LinuxPasswordStoreCandidate,
  LinuxPasswordStorePlan,
};
