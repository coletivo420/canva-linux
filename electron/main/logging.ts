import fs from "fs";
import path from "path";

import { normalizeArgs, createLogSignature } from "./logging-normalize";

type CredentialStoragePolicy = import("./credential-storage").CredentialStoragePolicy;

type StatusLevel = "ok" | "warn" | "critical";
type LogOptions = { source?: string; level?: StatusLevel };
type AppLike = { getPath(name: string): string };
type DebugLog = (category: string, ...args: unknown[]) => boolean;
type StatusLogger = (
  category: string,
  level: StatusLevel,
  message: string,
  options?: { source?: string },
) => void;

const LOG_COLORS = {
  ok: "\x1b[32m",
  warn: "\x1b[33m",
  critical: "\x1b[31m",
  reset: "\x1b[0m",
};

function errorMessage(error: unknown): string {
  return error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : String(error);
}

function formatTerminalPrefix({
  category,
  source = "main",
  level = "ok",
}: {
  category: string;
  source?: string;
  level?: StatusLevel;
}): string {
  const prefix = `[canva:${source}:${category}]`;
  const color = LOG_COLORS[level];
  if (!color) return prefix;
  return `${color}${prefix}${LOG_COLORS.reset}`;
}

function formatFilePrefix({
  category,
  source = "main",
  level = "ok",
}: {
  category: string;
  source?: string;
  level?: StatusLevel;
}): string {
  return `[canva:${source}:${category}:${level}]`;
}

function createCentralLogger({ app }: { app: AppLike }) {
  let logFilePath: string | null = null;
  let lastDebugSignature: string | null = null;

  function appendFileLine(prefix: string, normalizedArgs: string[]): void {
    if (!logFilePath) return;
    const line = `${new Date().toISOString()} ${prefix} ${normalizedArgs.join(" ")}\n`;
    try {
      fs.appendFileSync(logFilePath, line, "utf8");
    } catch {}
  }

  function write(
    level: StatusLevel,
    prefix: string,
    normalizedArgs: string[],
  ): void {
    if (level === "critical") {
      console.error(prefix, ...normalizedArgs);
      return;
    }
    if (level === "warn") {
      console.warn(prefix, ...normalizedArgs);
      return;
    }
    console.log(prefix, ...normalizedArgs);
  }

  function initLogFile(): string {
    const logsDirPath = path.join(app.getPath("userData"), "logs");
    const currentLogPath = path.join(logsDirPath, "current.log");
    fs.mkdirSync(logsDirPath, { recursive: true });
    if (fs.existsSync(currentLogPath)) {
      fs.unlinkSync(currentLogPath);
    }
    fs.writeFileSync(currentLogPath, "", "utf8");
    logFilePath = currentLogPath;
    return currentLogPath;
  }

  function logDebug(
    category: string,
    args: unknown[] = [],
    { source = "main", level = "ok" }: LogOptions = {},
  ): void {
    const normalizedArgs = normalizeArgs(args);
    const signature = createLogSignature([
      source,
      category,
      level,
      ...normalizedArgs,
    ]);
    if (signature === lastDebugSignature) {
      return;
    }
    lastDebugSignature = signature;

    const terminalPrefix = formatTerminalPrefix({ category, source, level });
    const filePrefix = formatFilePrefix({ category, source, level });
    write(level, terminalPrefix, normalizedArgs);
    appendFileLine(filePrefix, normalizedArgs);
  }

  function logStatus(
    category: string,
    level: StatusLevel,
    message: string,
    { source = "main" }: { source?: string } = {},
  ): void {
    const normalizedArgs = normalizeArgs([message]);
    const terminalPrefix = formatTerminalPrefix({ category, source, level });
    const filePrefix = formatFilePrefix({ category, source, level });
    write(level, terminalPrefix, normalizedArgs);
    appendFileLine(filePrefix, normalizedArgs);
  }

  return {
    initLogFile,
    logDebug,
    logStatus,
    getLogFilePath() {
      return logFilePath;
    },
  };
}

function createStatusLogger({
  app,
  debugLog,
  logStatus,
  appVersion,
}: {
  app: AppLike;
  debugLog: DebugLog;
  logStatus: StatusLogger;
  appVersion: string;
}) {
  function logReleaseStatus() {
    debugLog(
      "startup",
      "release",
      `version=${appVersion}`,
      `platform=${process.platform}`,
      `arch=${process.arch}`,
      `downloads=${app.getPath("downloads")}`,
    );
  }

  function logCredentialStoragePolicy(policy: CredentialStoragePolicy) {
    const flatpakId = policy.flatpak.flatpakId || "unknown";
    const summary =
      `credential-storage-policy flatpak=${String(policy.flatpak.isFlatpak)} ` +
      `flatpakId=${flatpakId} backend=${policy.backend} ` +
      `mode=${policy.mode} security=${policy.security} ` +
      `encryptionAvailable=${String(policy.encryptionAvailable)} ` +
      `encryptionAvailableVerified=${String(policy.encryptionAvailableVerified)} ` +
      `partition=${policy.partition} cache=${String(policy.cache)} ` +
      `persistentLoginAvailable=${String(policy.persistentLoginAvailable)}`;

    if (policy.mode === "ephemeral") {
      logStatus(
        "session",
        policy.security === "insecure-basic-text" ? "critical" : "warn",
        `${summary} WARNING: ${policy.warning || "Persistent login is disabled because secure credential storage could not be verified."}`,
      );
      return;
    }

    if (policy.security === "secure") {
      logStatus(
        "session",
        "ok",
        `${summary} OK: secure Linux secret storage backend and available encryption detected.`,
      );
      return;
    }

    logStatus(
      "session",
      "ok",
      `${summary} OK: platform default credential storage policy selected.`,
    );
  }

  return {
    logCredentialStoragePolicy,
    logReleaseStatus,
  };
}

export {
  createCentralLogger,
  createStatusLogger,
  errorMessage,
  formatFilePrefix,
  formatTerminalPrefix,
};
